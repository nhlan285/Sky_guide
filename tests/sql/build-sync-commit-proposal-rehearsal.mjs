import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { prepareSyncCommitProposalRow,commitProposalColumns } from '../../src/server/syncCommitProposalRows.ts'
import { createPostgresSyncStore } from '../../src/server/postgresSyncStore.ts'
import { privateSyncColumns } from '../../src/server/postgresSyncRows.ts'
import { postgresSyncSequence } from '../fixtures/postgresSyncSequence.mjs'
import { scriptedDatabase,storeOptions,contract,decodeTables,expectedFailure } from '../fixtures/postgresSyncStore.mjs'

// Prepared native transcript, NOT executed here. Requires authorized proposal
// installation/v2 schema first; contains no DDL, roles, credentials or real seeds.
const scalar=v=>v===null?'null':typeof v==='number'?String(v):typeof v==='boolean'?v?'true':'false':`'${v.replaceAll("'","''")}'`
const render=s=>s.text.replace(/\$(\d+)/g,(_all,n)=>scalar(s.values[Number(n)-1]))
const uuid=n=>`12345678-1234-4123-8123-${String(n).padStart(12,'0')}`
const insert=row=>`insert into sky_private.sync_commit_intent(${commitProposalColumns.sync_commit_intent.join(',')}) values(${commitProposalColumns.sync_commit_intent.map(c=>scalar(row[c])).join(',')});`
const requireToken=row=>`select sky_private.require_sync_commit_intent(${scalar(row.id)}::uuid,${scalar(row.state_digest)});`
const assertTrue=sql=>`do $bool$ begin if not (${sql}) then raise exception 'Expected confirmed true' using errcode='P0999';end if;end;$bool$;`
const negative=sql=>`do $negative$ begin begin ${sql} raise exception 'Negative did not fail' using errcode='P0999';exception when sqlstate '23514' then null;end;end;$negative$;`

export async function buildSyncCommitProposalRehearsal() {
 const {initial,phases}=await postgresSyncSequence(),parts=['begin;',"set local statement_timeout='30s';","set local standard_conforming_strings=on;"],rows=[]
 for(const t of ['source_registry','provenance','provenance_order'])parts.push(`insert into sky_private.${t}(${privateSyncColumns[t].join(',')}) values ${initial[t].map(r=>`(${privateSyncColumns[t].map(c=>scalar(r[c])).join(',')})`).join(',')};`)
 let queryChecks=0,negativeChecks=0
 const compile=(tx,row,count=true,legacy=false,appendMarker=false)=>'do $writer$ declare actual_rows jsonb;expected_rows jsonb;begin\n'+tx.queries.map((s,n)=>{
  const cas=s.text.includes('apply_sync_metadata_cas')
  const sql=cas&&!legacy?`select sky_private.apply_sync_commit_cas(${scalar(row.id)}::uuid,${scalar(row.state_digest)}) as applied`:render(s)
  if(!s.text.startsWith('select '))return sql+';'
  if(count)queryChecks++
  return `select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) into actual_rows from(${sql}) r;
   select coalesce(jsonb_agg(r order by r::text),'[]'::jsonb) into expected_rows from jsonb_array_elements(${scalar(JSON.stringify(tx.responses[n]))}::jsonb) r;
   if actual_rows is distinct from expected_rows then raise exception 'Writer query ${n} mismatch' using errcode='P0999';end if;
   ${cas&&appendMarker?`insert into sky_private.sync_commit_applied(intent_id,revision,state_digest) values(${scalar(row.id)}::uuid,${row.expected_revision+1},${scalar(row.state_digest)});`:''}`
 }).join('\n')+'\nend;$writer$;'
 for(const [index,p] of phases.entries()) {
  const current=await decodeTables(p.initial,p.sourceId),header=p.initial.sync_generation[0]
  const global=p.initial.sync_acceptance.find(a=>a.revision===header.current_acceptance_revision)??null
  const row=prepareSyncCommitProposalRow(p.sourceId,current,p.next,uuid(index+1),global),db=scriptedDatabase(p.initial,{nextTables:p.tables})
  if(!await createPostgresSyncStore(db,contract,storeOptions).compareAndSwap(p.sourceId,p.expected,p.next))throw new Error('Fixture conflict')
  const tx=db.transactions[0],body=compile(tx,row);rows.push(row)
  if(index===0){parts.push(negative('set constraints all deferred;'+compile(tx,row,false,true)));negativeChecks++}
  if(p.next.failures) {
   // Bad count passes the positive typed-table constraint, but actual CAS derives
   // a different count. Nested failure must rollback ALL canonical/control effects.
   const bad={...row,id:uuid(100+index),next_failures:row.next_failures+1}
   parts.push(negative(`set constraints all deferred;${insert(bad)}
    ${assertTrue(`select sky_private.activate_sync_commit_intent(${scalar(bad.id)}::uuid)`)}
    ${requireToken(bad)}${compile(tx,bad,false)}`));negativeChecks++
   for(const mismatch of [{global_valid_until:'2026-10-08T00:00:00Z'},{next_retry_at:'2026-10-07T00:20:00Z'}]) {
    const wrong={...row,...mismatch,id:uuid(200+negativeChecks)}
    parts.push(negative(`set constraints all deferred;${insert(wrong)}
     ${assertTrue(`select sky_private.activate_sync_commit_intent(${scalar(wrong.id)}::uuid)`)}
     ${requireToken(wrong)}${compile(tx,wrong,false,true,true)}`));negativeChecks++
   }
  }
  parts.push('set constraints all deferred;',insert(row),assertTrue(`select sky_private.activate_sync_commit_intent(${scalar(row.id)}::uuid)`),requireToken(row))
  for(const sql of [requireToken({...row,state_digest:'0'.repeat(64)}),"update sky_private.sync_commit_control set active_intent_id=null where singleton=1;"]){parts.push(negative(sql));negativeChecks++}
  if(p.next.failures) {
   parts.push(negative(`update sky_private.sync_commit_intent set next_failures=next_failures+1 where id=${scalar(row.id)}::uuid;`));negativeChecks++
  }
  parts.push(body,assertTrue(`select sky_private.settle_sync_commit_intent(${scalar(row.id)}::uuid,'committed')`),
   assertTrue(`select sky_private.settle_sync_commit_intent(${scalar(row.id)}::uuid,'committed')`),negative(requireToken(row)))
  negativeChecks++
 }
 // Restart recovery cancels a pre-BEGIN token under head/control lock. A later
 // original worker MUST fail require before DML. Same-session order only, not race proof.
 const p=phases.at(-1),current=await decodeTables(p.tables,'K15')
 const stagedNext=await expectedFailure(current,'K15','2026-10-07T00:14:00Z')
 const r=prepareSyncCommitProposalRow('K15',current,stagedNext,uuid(6),p.tables.sync_acceptance.find(a=>a.revision===5))
 parts.push('set constraints all deferred;',insert(r),assertTrue(`select sky_private.activate_sync_commit_intent(${scalar(r.id)}::uuid)`),
  assertTrue(`select sky_private.settle_sync_commit_intent(${scalar(r.id)}::uuid,'not_committed')`),negative(requireToken(r)),
  negative(`select sky_private.settle_sync_commit_intent(${scalar(r.id)}::uuid,'committed');`))
 negativeChecks+=2
 const select=t=>`coalesce((select jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text) from sky_private.${t} r),'[]'::jsonb)`
 parts.push(`select jsonb_build_object('phases',5,'query_checks',${queryChecks},'negative_checks',${negativeChecks},'revision',(select revision from sky_private.sync_generation where singleton=1),
 'intent',${select('sync_commit_intent')},'control',${select('sync_commit_control')},'applied',${select('sync_commit_applied')},'receipts',${select('sync_commit_receipt')}) as rows;`,'rollback;')
 const sql=parts.join('\n');if(Buffer.byteLength(sql)>1_000_000)throw new Error('Rehearsal SQL byte budget exceeded')
 return {sql,rows:[...rows,r],queryChecks,negativeChecks}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 if(!process.argv[2])throw new Error('Provide E-drive output path outside Git')
 const r=await buildSyncCommitProposalRehearsal();writeFileSync(process.argv[2],r.sql,'utf8')
 process.stdout.write(`PREPARED/NOT RUN:5 phases/${r.queryChecks} query assertions/${r.negativeChecks} negatives; ${Buffer.byteLength(r.sql)} bytes\n`)
}
