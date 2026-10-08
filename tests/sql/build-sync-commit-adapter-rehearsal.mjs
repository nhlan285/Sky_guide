import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import assert from 'node:assert/strict'
import { createPostgresIntentSyncStore } from '../../src/server/postgresSyncStore.ts'
import { createPostgresCommitJournal } from '../../src/server/postgresCommitJournal.ts'
import { createPostgresTransactionKernel } from '../../src/server/postgresTransactionKernel.ts'
import { privateSyncColumns } from '../../src/server/postgresSyncRows.ts'
import { postgresSyncSequence } from '../fixtures/postgresSyncSequence.mjs'
import { journalPool } from '../fixtures/postgresJournalPort.mjs'
import { kernelLimits } from '../fixtures/postgresProtocolPort.mjs'
import { storeOptions,contract,decodeTables,expectedFailure } from '../fixtures/postgresSyncStore.mjs'
import { runtimeRoleExecutor } from './runtime-role-executor.mjs'

// Actual v2 adapter+kernel-emitted statements, captured on a synthetic protocol
// port against independently expected SourceSync frames. PREPARED/NOT RUN.
// Outer ROLLBACK intentionally does NOT prove separate durable commits or races.
const scalar=v=>v===null?'null':typeof v==='number'?String(v):typeof v==='boolean'?v?'true':'false':`'${v.replaceAll("'","''")}'`
const structuredClone=globalThis.structuredClone
const render=s=>s.text.replace(/\$(\d+)/g,(_all,n)=>scalar(s.values[Number(n)-1]))
const uuid=n=>`12345678-1234-4123-8123-${String(n).padStart(12,'0')}`
const callback=s=>/^(?:select |with __sg_rows|insert |update |delete |set constraints )/.test(s.text)
const jsonRows=r=>r.rows.map(row=>Object.fromEntries(r.fields.map((f,n)=>[f.name,row[n]===null?null:
 f.dataTypeID===16?row[n]==='t':[20,21,23,701].includes(f.dataTypeID)?Number(row[n]):row[n]])))

export async function buildSyncCommitAdapterRehearsal({roles=false,executor='superuser'}={}) {
 const {initial,phases}=await postgresSyncSequence()
 const pool=journalPool(initial,{nextTables:r=>phases.find(p=>p.next.revision===r)?.tables,
  afterQuery:async(s,_signal,l,r)=>{l.responses??=[];l.responses.push({statement:structuredClone(s),result:structuredClone(r)});return r}})
 const db=createPostgresTransactionKernel(pool,kernelLimits),store=createPostgresIntentSyncStore(db,contract,storeOptions),journal=createPostgresCommitJournal(db,storeOptions.readLimits)
 const rows=[],negativeLeases=new Set()
 for(const [n,p] of phases.entries()) {
  const intent=await store.claim(p.sourceId,p.expected,p.next,uuid(n+1));if(!intent)throw new Error('Expected v2 claim')
  rows.push(intent)
  try{await store.execute({...intent,state_digest:'0'.repeat(64)},p.next);throw new Error('Expected wrong digest rejection')}
  catch(error){if(error.sqlState!=='23514')throw error;negativeLeases.add(pool.leases.at(-1))}
  if((await journal.load())?.id!==intent.id)throw new Error('Expected original pending intent')
  if(!await store.execute(intent,p.next))throw new Error('Expected intent-bound execution')
  // Independent complete expected state is already checked in Store; this read
  // adds actual repeatable-read composition/lowering queries to the transcript.
  assert.deepEqual(await store.read(p.sourceId),p.next)
  if(await journal.resolve(intent.id)!=='committed'||await journal.receipt(intent.id)!=='committed')throw new Error('Expected terminal applied witness')
 }
 const last=phases.at(-1),current=await decodeTables(last.tables,'K15'),next=await expectedFailure(current,'K15','2026-10-07T00:14:00Z')
 const pending=await store.claim('K15',5,next,uuid(6));if(!pending)throw new Error('Expected recovery claim')
 rows.push(pending);await journal.load()
 if(await journal.resolve(pending.id)!=='not_committed')throw new Error('Expected atomic absence receipt')
 try{await store.execute(pending,next);throw new Error('Expected late token rejection')}
 catch(error){if(error.sqlState!=='23514')throw error;negativeLeases.add(pool.leases.at(-1))}

 const parts=['begin isolation level read committed read write;',"set local statement_timeout='30s';","set local standard_conforming_strings=on;"],queryChecks={value:0}
 if(roles)parts.push(runtimeRoleExecutor(executor))
 for(const t of ['source_registry','provenance','provenance_order'])parts.push(`insert into sky_private.${t}(${privateSyncColumns[t].join(',')}) values ${initial[t].map(r=>`(${privateSyncColumns[t].map(c=>scalar(r[c])).join(',')})`).join(',')};`)
 for(const [n,l] of pool.leases.entries()) {
  const statements=l.queries.filter(callback)
  if(roles)parts.push(`set local role ${l.queries[0].text.endsWith('read only')?'sky_guide_sync_reader':'sky_guide_sync_writer'};`)
  parts.push(`-- Adapter callback ${n+1}; original ${l.queries[0].text}. Original COMMIT boundaries are NOT reproduced.`)
  if(negativeLeases.has(l)) {
   if(statements.some(s=>/^(insert|update|delete) /.test(s.text)))throw new Error('Rejected token emitted DML')
   parts.push(`do $negative$ begin begin ${statements.map(s=>`perform * from(${render(s)}) r;`).join('\n')}
    raise exception 'Negative did not reject token' using errcode='P0999';exception when sqlstate '23514' then null;end;end;$negative$;`)
   continue
  }
  const responses=l.responses.filter(r=>callback(r.statement))
  if(responses.length!==statements.length)throw new Error('Missing captured callback response')
  parts.push('do $adapter$ declare actual_rows jsonb;expected_rows jsonb;begin\n'+statements.map((s,q)=>{
   if(!/^(select |with __sg_rows)/.test(s.text))return render(s)+';'
   const response=responses[q]
   assert.deepEqual(response.statement,s)
   queryChecks.value++
   return `select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) into actual_rows from(${render(s)}) r;
    select coalesce(jsonb_agg(r order by r::text),'[]'::jsonb) into expected_rows from jsonb_array_elements(${scalar(JSON.stringify(jsonRows(response.result)))}::jsonb) r;
    if actual_rows is distinct from expected_rows then raise exception 'Adapter callback ${n+1}/query ${q+1} differs' using errcode='P0999';end if;`
  }).join('\n')+'\nend;$adapter$;')
 }
 const select=t=>`coalesce((select jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text) from sky_private.${t} r),'[]'::jsonb)`
 if(roles)parts.push('reset role;')
 parts.push(`select jsonb_build_object('phases',5,'callbacks',${pool.leases.length},'query_checks',${queryChecks.value},'negative_checks',${negativeLeases.size},'revision',(select revision from sky_private.sync_generation where singleton=1),
 'intent',${select('sync_commit_intent')},'control',${select('sync_commit_control')},'applied',${select('sync_commit_applied')},'receipts',${select('sync_commit_receipt')}) as rows;`,'rollback;')
 const sql=parts.join('\n')+'\n';if(Buffer.byteLength(sql)>3_000_000)throw new Error('Adapter rehearsal byte budget exceeded')
 return {sql,rows,callbacks:pool.leases.length,queryChecks:queryChecks.value,negativeChecks:negativeLeases.size}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 if(!process.argv[2])throw new Error('Provide E-drive output path outside Git')
 const r=await buildSyncCommitAdapterRehearsal({roles:process.argv.includes('--roles'),executor:process.argv.includes('--creator-set-rehearsal')?'creator':'superuser'});writeFileSync(process.argv[2],r.sql,'utf8')
 process.stdout.write(`PREPARED/NOT RUN:5 phases/${r.callbacks} callbacks/${r.queryChecks} query assertions/${r.negativeChecks} token negatives; ${Buffer.byteLength(r.sql)} bytes\n`)
}
