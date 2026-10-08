import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { resolve,join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

// Bounded independent-session SQL proof only, no durable/SDK race acceptance.
// Each fixture owns an outer ROLLBACK; only zero-row writes and local labels.
export function buildReleaseValidationBracketConcurrency(){
 const prefix=name=>`begin isolation level read committed read write;\nset local statement_timeout='30s';\nset local application_name='sg_bracket_${name}_5d9058e';\n`
 const clock='(select to_jsonb(c) from sky_private.release_validation_clock c where singleton=1)'
 const a=prefix('A')+`do $a$ begin
 if ${clock} is distinct from jsonb_build_object('singleton',1,'epoch',0,'write_depth',0,'writer_xid',null) then raise exception 'A baseline changed';end if;
 update sky_private.source_registry set id=id where false;
 if ${clock} is distinct from jsonb_build_object('singleton',1,'epoch',2,'write_depth',0,'writer_xid',null) then raise exception 'A bracket changed';end if;
 perform pg_catalog.pg_sleep(8);
end;$a$;
select jsonb_build_object('pid',pg_backend_pid(),'tx',pg_current_xact_id()::text,'clock',${clock}) as concurrent_a;
rollback;\n`
 const b=prefix('B')+`do $b$ declare a_pid integer;until_at timestamptz:=clock_timestamp()+interval '5 seconds';started timestamptz;wait_ms numeric;before_clock jsonb;begin
 loop
  select pid into a_pid from pg_stat_activity where application_name='sg_bracket_A_5d9058e' and usename=current_user and datname=current_database() and wait_event='PgSleep';
  exit when a_pid is not null;
  if clock_timestamp()>until_at then raise exception 'Independent A session not observed';end if;
  perform pg_sleep(0.05);perform pg_stat_clear_snapshot();
 end loop;
 select ${clock} into before_clock;started:=clock_timestamp();
 perform sky_private.lock_sync_commit_control();
 wait_ms:=extract(epoch from clock_timestamp()-started)*1000;
 if wait_ms<100 then raise exception 'B did not wait for A';end if;
 if ${clock} is distinct from jsonb_build_object('singleton',1,'epoch',0,'write_depth',0,'writer_xid',null) then raise exception 'A rollback leaked clock';end if;
 update sky_private.source_registry set id=id where false;
 if ${clock} is distinct from jsonb_build_object('singleton',1,'epoch',2,'write_depth',0,'writer_xid',null) then raise exception 'B bracket changed';end if;
 perform set_config('sky_guide.concurrent_b',jsonb_build_object('pid',pg_backend_pid(),'a_pid',a_pid,'tx',pg_current_xact_id()::text,'wait_ms',wait_ms,'before_clock',before_clock,'clock',${clock})::text,true);
end;$b$;
select current_setting('sky_guide.concurrent_b')::jsonb as concurrent_b;
rollback;\n`
 const observer=prefix('observer').replace('read write','read only')+`do $observer$ declare observed jsonb;until_at timestamptz:=clock_timestamp()+interval '5 seconds';begin
 loop
  perform pg_stat_clear_snapshot();
  select jsonb_build_object('a_pid',a.pid,'b_pid',b.pid,'observer_pid',pg_backend_pid(),'blocking_pids',pg_blocking_pids(b.pid),'wait_type',b.wait_event_type,'clock',${clock}) into observed
  from pg_stat_activity a cross join pg_stat_activity b
  where a.application_name='sg_bracket_A_5d9058e' and b.application_name='sg_bracket_B_5d9058e'
   and a.usename=current_user and b.usename=current_user and a.datname=current_database() and b.datname=current_database()
   and a.wait_event='PgSleep' and b.wait_event_type='Lock' and pg_blocking_pids(b.pid) @>array[a.pid];
  exit when observed is not null;
  if clock_timestamp()>until_at then raise exception 'Independent B blocked by A not observed';end if;
  perform pg_sleep(0.05);
 end loop;
 perform set_config('sky_guide.concurrent_observer',observed::text,true);
end;$observer$;
select current_setting('sky_guide.concurrent_observer')::jsonb as concurrent_observer;
rollback;\n`
 return {a,b,observer}
}
export function verifyReleaseValidationBracketConcurrency(a,b,observer){
 for(const pid of [a.pid,b.pid,observer.observer_pid])assert.ok(Number.isInteger(pid)&&pid>0)
 assert.equal(new Set([a.pid,b.pid,observer.observer_pid]).size,3)
 assert.equal(b.a_pid,a.pid);assert.equal(observer.a_pid,a.pid);assert.equal(observer.b_pid,b.pid)
 assert.notEqual(a.tx,b.tx);assert.match(a.tx,/^\d+$/);assert.match(b.tx,/^\d+$/)
 assert.ok(Number.isFinite(b.wait_ms)&&b.wait_ms>=100&&b.wait_ms<30000)
 assert.equal(observer.wait_type,'Lock');assert.ok(observer.blocking_pids.includes(a.pid))
 const empty={singleton:1,epoch:0,write_depth:0,writer_xid:null},written={...empty,epoch:2}
 assert.deepEqual(a.clock,written);assert.deepEqual(b.clock,written)
 assert.deepEqual(b.before_clock,empty);assert.deepEqual(observer.clock,empty)
 return {sessions:3,blockedWriter:true,scope:'zero-row owner writes / outer ROLLBACK only'}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw new Error('Provide E-drive fixture directory')
 for(const [name,sql]of Object.entries(buildReleaseValidationBracketConcurrency()))writeFileSync(join(process.argv[2],'release-bracket-concurrency-'+name+'.sql'),sql)
 process.stdout.write('PREPARED/NOT RUN:3 independent sessions, no durable/SDK proof\n')
}
