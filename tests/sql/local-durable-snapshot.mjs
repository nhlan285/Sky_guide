import assert from 'node:assert/strict'
import { buildReleaseValidationBracketProposal } from './build-release-validation-bracket-proposal.mjs'
import { verifyLocalHistory } from './run-local-postgres-rehearsal.mjs'

export function buildLocalDurableSnapshot(){
 const p=buildReleaseValidationBracketProposal()
 const names=[...p.tables,'release_validation_clock','release_validation_witness'].sort()
 const tables=names.map(name=>`jsonb_build_object('name','${name}','rows',coalesce((select jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate pg_catalog."C") from sky_private.${name} r),'[]'::jsonb))`)
 return `begin isolation level read committed read write;
set local statement_timeout='30s';
${p.files['release-validation-bracket-after-check.sql']}
select jsonb_build_object('tables',jsonb_build_array(${tables.join(',')}),
'migrations',(select jsonb_agg(to_jsonb(r) order by version) from supabase_migrations.schema_migrations r),
'server',jsonb_build_object('pid',pg_backend_pid(),'started',pg_postmaster_start_time(),'version',current_setting('server_version_num')));
rollback;`
}
export function verifyLocalDurableSnapshot(actual,expected){
 const p=buildReleaseValidationBracketProposal()
 assert.deepEqual(Object.keys(actual).sort(),['migrations','server','tables'])
 assert.deepEqual(actual.tables.map(t=>t.name),[...p.tables,'release_validation_clock','release_validation_witness'].sort())
 for(const table of actual.tables){assert.deepEqual(Object.keys(table).sort(),['name','rows']);assert.ok(Array.isArray(table.rows))}
 assert.equal(actual.server.version,'170011');assert.ok(Number.isInteger(actual.server.pid)&&actual.server.pid>0)
 assert.ok(Number.isFinite(Date.parse(actual.server.started)))
 verifyLocalHistory({migrations:actual.migrations})
 if(expected){assert.deepEqual(actual.tables,expected.tables,'Durable row/field/order drift: STOP');assert.deepEqual(actual.migrations,expected.migrations,'Migration history drift: STOP')}
 return {tables:85,rows:actual.tables.reduce((sum,t)=>sum+t.rows.length,0),sourceHistoryExact:true,allRowsExact:!!expected}
}
