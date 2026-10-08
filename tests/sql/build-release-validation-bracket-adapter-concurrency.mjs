import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { writeFileSync } from 'node:fs'
import { resolve,join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { buildSyncCommitAdapterRehearsal } from './build-sync-commit-adapter-rehearsal.mjs'
import { verifySyncCommitAdapterRehearsal } from './verify-sync-commit-adapter-rehearsal.mjs'
import { buildReleaseValidationBracketConcurrency } from './build-release-validation-bracket-concurrency.mjs'

const empty={singleton:1,epoch:0,write_depth:0,writer_xid:null}
const clock='(select to_jsonb(c) from sky_private.release_validation_clock c where singleton=1)'
const witness="coalesce((select jsonb_agg(to_jsonb(w) order by w.catalog_version) from sky_private.release_validation_witness w),'[]'::jsonb)"
const replaceOnce=(source,marker,value)=>{
 assert.equal(source.split(marker).length,2,'Adapter transcript boundary changed')
 return source.replace(marker,value)
}
const exactKeys=(value,keys)=>assert.deepEqual(Object.keys(value).sort(),keys.toSorted())

// Two complete existing owner adapter transcripts, one independent lock observer.
// The added barrier serializes competing writers; original callback SQL and full
// row checks remain intact. Outer ROLLBACK does not prove durable/CAS/SDK races.
export async function buildReleaseValidationBracketAdapterConcurrency(){
 const prepared=await buildSyncCommitAdapterRehearsal()
 const start="set local standard_conforming_strings=on;\n",end=') as rows;\nrollback;\n'
 const aBarrier=`set local application_name='sg_bracket_A_5d9058e';
do $a$ begin
 if ${clock} is distinct from '${JSON.stringify(empty)}'::jsonb or ${witness}<>'[]'::jsonb then raise exception 'A empty validation baseline changed';end if;
 perform sky_private.lock_sync_commit_control();
 perform pg_catalog.pg_sleep(8);
end;$a$;
`
 const bBarrier=`set local application_name='sg_bracket_B_5d9058e';
do $b$ declare a_pid integer;until_at timestamptz:=clock_timestamp()+interval '5 seconds';started timestamptz;wait_ms numeric;before_clock jsonb;before_witness jsonb;begin
 loop
  perform pg_stat_clear_snapshot();
  select pid into a_pid from pg_stat_activity where application_name='sg_bracket_A_5d9058e' and usename=current_user and datname=current_database() and wait_event='PgSleep';
  exit when a_pid is not null;
  if clock_timestamp()>until_at then raise exception 'Independent adapter A session not observed';end if;
  perform pg_sleep(0.05);
 end loop;
 select ${clock},${witness} into before_clock,before_witness;started:=clock_timestamp();
 perform sky_private.lock_sync_commit_control();
 wait_ms:=extract(epoch from clock_timestamp()-started)*1000;
 if wait_ms<100 then raise exception 'Adapter B did not wait for A';end if;
 if ${clock} is distinct from '${JSON.stringify(empty)}'::jsonb or ${witness}<>'[]'::jsonb then raise exception 'Adapter A rollback leaked clock/witness';end if;
 perform set_config('sky_guide.adapter_concurrent_b',jsonb_build_object('a_pid',a_pid,'wait_ms',wait_ms,'before_clock',before_clock,'before_witness',before_witness,'after_rollback_clock',${clock},'after_rollback_witness',${witness})::text,true);
end;$b$;
`
 const receipt=`jsonb_build_object('pid',pg_backend_pid(),'tx',pg_current_xact_id()::text,'clock',${clock},'witness',${witness})`
 const wrap=(barrier,metadata)=>replaceOnce(replaceOnce(prepared.sql,start,start+barrier),end,`, 'concurrency',${metadata}${end}`)
 const a=wrap(aBarrier,receipt),b=wrap(bBarrier,`(${receipt} || current_setting('sky_guide.adapter_concurrent_b')::jsonb)`)
 for(const sql of [a,b])assert.ok(Buffer.byteLength(sql)<3_000_000,'Concurrent adapter byte budget exceeded')
 return {a,b,observer:buildReleaseValidationBracketConcurrency().observer,
  callbacks:prepared.callbacks,queryChecks:prepared.queryChecks,negativeChecks:prepared.negativeChecks,
  versions:[...new Set(prepared.rows.map(r=>r.global_catalog_version).filter(v=>v!==null))].sort()}
}

export async function verifyReleaseValidationBracketAdapterConcurrency(a,b,observer){
 const prepared=await buildReleaseValidationBracketAdapterConcurrency()
 for(const actual of [a,b]){
  exactKeys(actual,['phases','callbacks','query_checks','negative_checks','revision','intent','control','applied','receipts','concurrency'])
  await verifySyncCommitAdapterRehearsal(actual)
 }
 const ac=a.concurrency,bc=b.concurrency
 exactKeys(ac,['pid','tx','clock','witness'])
 exactKeys(bc,['pid','tx','clock','witness','a_pid','wait_ms','before_clock','before_witness','after_rollback_clock','after_rollback_witness'])
 exactKeys(observer,['a_pid','b_pid','observer_pid','blocking_pids','wait_type','clock'])
 for(const pid of [ac.pid,bc.pid,observer.observer_pid])assert.ok(Number.isInteger(pid)&&pid>0)
 assert.equal(new Set([ac.pid,bc.pid,observer.observer_pid]).size,3)
 assert.equal(bc.a_pid,ac.pid);assert.equal(observer.a_pid,ac.pid);assert.equal(observer.b_pid,bc.pid)
 for(const c of [ac,bc]){
  assert.match(c.tx,/^[1-9]\d*$/)
  exactKeys(c.clock,Object.keys(empty));assert.equal(c.clock.singleton,1)
  assert.ok(Number.isSafeInteger(c.clock.epoch)&&c.clock.epoch>0&&c.clock.epoch%2===0)
  assert.equal(c.clock.write_depth,0);assert.equal(c.clock.writer_xid,null)
  assert.deepEqual(c.witness.map(w=>w.catalog_version).sort(),prepared.versions)
  for(const w of c.witness){
   exactKeys(w,['catalog_version','transaction_id','epoch'])
   assert.equal(w.transaction_id,c.tx)
   assert.ok(Number.isSafeInteger(w.epoch)&&w.epoch>=0&&w.epoch<=c.clock.epoch&&w.epoch%2===0)
  }
 }
 assert.notEqual(ac.tx,bc.tx)
 assert.ok(Number.isFinite(bc.wait_ms)&&bc.wait_ms>=100&&bc.wait_ms<30000)
 assert.equal(observer.wait_type,'Lock');assert.deepEqual(observer.blocking_pids,[ac.pid])
 for(const c of [bc.before_clock,bc.after_rollback_clock,observer.clock])assert.deepEqual(c,empty)
 assert.deepEqual(bc.before_witness,[]);assert.deepEqual(bc.after_rollback_witness,[])
 return {sessions:3,adapterRuns:2,callbacks:prepared.callbacks,queryChecks:prepared.queryChecks,
  negativeChecks:prepared.negativeChecks,scope:'competing full owner adapter transcripts / outer ROLLBACK only'}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw new Error('Provide E-drive fixture directory')
 const prepared=await buildReleaseValidationBracketAdapterConcurrency()
 for(const name of ['a','b','observer'])writeFileSync(join(process.argv[2],`release-bracket-adapter-concurrency-${name}.sql`),prepared[name])
 process.stdout.write(`PREPARED/NOT RUN:2 full adapter transcripts (${prepared.callbacks}/${prepared.queryChecks}/${prepared.negativeChecks} each),3 sessions; no durable/CAS/SDK proof\n`)
}
