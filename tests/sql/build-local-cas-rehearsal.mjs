import assert from 'node:assert/strict'
import { createPostgresIntentSyncStore } from '../../src/server/postgresSyncStore.ts'
import { createPostgresCommitJournal } from '../../src/server/postgresCommitJournal.ts'
import { createPostgresTransactionKernel } from '../../src/server/postgresTransactionKernel.ts'
import { postgresSyncSequence } from '../fixtures/postgresSyncSequence.mjs'
import { journalPool } from '../fixtures/postgresJournalPort.mjs'
import { kernelLimits } from '../fixtures/postgresProtocolPort.mjs'
import { storeOptions,contract,decodeTables,expectedFailure,tablesForState } from '../fixtures/postgresSyncStore.mjs'
import { buildReleaseValidationBracketConcurrency } from './build-release-validation-bracket-concurrency.mjs'

const scalar=v=>v===null?'null':typeof v==='number'?String(v):typeof v==='boolean'?v?'true':'false':`'${v.replaceAll("'","''")}'`
const render=s=>s.text.replace(/\$(\d+)/g,(_all,n)=>scalar(s.values[Number(n)-1]))
const callback=s=>/^(?:select |with __sg_rows|insert |update |delete |set constraints )/.test(s.text)
const jsonRows=r=>r.rows.map(row=>Object.fromEntries(r.fields.map((f,n)=>[f.name,row[n]===null?null:f.dataTypeID===16?row[n]==='t':[20,21,23,701].includes(f.dataTypeID)?Number(row[n]):row[n]])))
export async function buildLocalCasRehearsal(){
 const sequence=await postgresSyncSequence(),current=await decodeTables(sequence.tables,'K15')
 const next=await expectedFailure(current,'K15','2026-10-07T00:14:00Z'),nextTables=await tablesForState(next,'K15',sequence.tables)
 for(const [name,rows]of Object.entries(nextTables))if(!['sync_generation','sync_source_state','sync_audit'].includes(name))assert.deepEqual(rows,sequence.tables[name],'Failure transition unexpectedly changes canonical data')
 const pool=journalPool(sequence.tables,{nextTables:()=>nextTables,afterQuery:async(s,_signal,l,r)=>{l.responses??=[];l.responses.push({statement:structuredClone(s),result:structuredClone(r)});return r}})
 const db=createPostgresTransactionKernel(pool,kernelLimits),store=createPostgresIntentSyncStore(db,contract,storeOptions),journal=createPostgresCommitJournal(db,storeOptions.readLimits)
 const winner='12345678-1234-4123-8123-000000000007',loser='12345678-1234-4123-8123-000000000008'
 const intent=await store.claim('K15',5,next,winner);assert.ok(intent)
 const claim=pool.leases.at(-1)
 assert.equal(await store.execute(intent,next),true);const execute=pool.leases.at(-1)
 assert.equal(await store.claim('K15',5,next,loser),null);const lose=pool.leases.at(-1)
 const firstResolution=pool.leases.length
 assert.equal(await journal.resolve(winner),'committed')
 const resolutions=pool.leases.slice(firstResolution)
 const wrap=(lease,label,before='',after='')=>{
  const responses=lease.responses.filter(r=>callback(r.statement))
  assert.equal(responses.length,lease.queries.filter(callback).length)
  const body=responses.map(({statement:s,result:r})=>{
   if(!/^(select |with __sg_rows)/.test(s.text))return render(s)+';'
   return `select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) into actual from(${render(s)}) r;
select coalesce(jsonb_agg(r order by r::text),'[]'::jsonb) into expected from jsonb_array_elements(${scalar(JSON.stringify(jsonRows(r)))}::jsonb) r;
if actual is distinct from expected then raise exception 'Local CAS ${label} adapter response differs';end if;`
  }).join('\n')
  assert.equal(lease.queries.at(-1).text,'commit')
  return `${lease.queries[0].text};\nset local statement_timeout='30s';\n${before}\ndo $callback$ declare actual jsonb;expected jsonb;begin ${body} end;$callback$;\n${after}\nselect jsonb_build_object('step','${label}','pid',pg_backend_pid(),'revision',(select revision from sky_private.sync_generation where singleton=1),'clock',(select to_jsonb(c) from sky_private.release_validation_clock c));\ncommit;\n`
 }
 const aBefore="set local application_name='sg_local_cas_A';"
 const bBefore=`set local application_name='sg_local_cas_B';
do $wait$ declare until_at timestamptz:=clock_timestamp()+interval '5 seconds';begin loop
 perform pg_stat_clear_snapshot();
 exit when exists(select 1 from pg_stat_activity where application_name='sg_local_cas_A' and datname=current_database() and usename=current_user and wait_event='PgSleep');
 if clock_timestamp()>until_at then raise exception 'CAS A session not observed';end if;perform pg_sleep(0.05);
end loop;end;$wait$;`
 const observer=buildReleaseValidationBracketConcurrency().observer.replaceAll('sg_bracket_A_5d9058e','sg_local_cas_A').replaceAll('sg_bracket_B_5d9058e','sg_local_cas_B').replaceAll('sg_bracket_observer_5d9058e','sg_local_cas_observer')
 assert.equal(lose.queries.filter(s=>/^(insert |update |delete )/.test(s.text)).length,0,'Losing actual adapter emitted writes')
 return {winner,loser,intent,nextTables,claim:wrap(claim,'claim'),a:wrap(execute,'winner',aBefore,'do $hold$ begin perform pg_sleep(8);end;$hold$;'),b:wrap(lose,'loser',bBefore),observer,resolutions:resolutions.map((l,n)=>wrap(l,`resolve${n}`)),queryChecks:pool.leases.reduce((sum,l)=>sum+l.responses.filter(r=>/^(select |with __sg_rows)/.test(r.statement.text)).length,0)}
}
const structuredClone=globalThis.structuredClone
