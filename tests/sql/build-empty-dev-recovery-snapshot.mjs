import assert from 'node:assert/strict'
import { readFileSync,readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { URL } from 'node:url'
import { buildReleaseValidationBracketProposal } from './build-release-validation-bracket-proposal.mjs'

const digest=value=>createHash('sha256').update(value).digest('hex')
const rows={
 sync_generation:[{singleton:1,revision:0,current_acceptance_revision:null,last_promoted_at:null}],
 sync_commit_control:[{singleton:1,active_intent_id:null}],
 release_validation_clock:[{singleton:1,epoch:0,write_depth:0,writer_xid:null}],
}
const names=()=>buildReleaseValidationBracketProposal().tables.concat(['release_validation_clock','release_validation_witness']).sort()

// Read-only preparation for the current empty development installation. This
// intentionally excludes platform schemas/auth data/credential-bearing catalogs.
export function buildEmptyDevRecoverySnapshot(){
 const tables=names().map(name=>`jsonb_build_object('name','${name}','rows',coalesce((select jsonb_agg(to_jsonb(r)) from sky_private.${name} r),'[]'::jsonb))`)
 return `begin isolation level read committed read only;\nset local statement_timeout='30s';\nselect jsonb_build_object('format','sky-guide-empty-dev-snapshot-v1','tables',jsonb_build_array(${tables.join(',')})) as empty_recovery_snapshot;\nrollback;\n`
}
export function verifyEmptyDevRecoverySnapshot(actual){
 assert.deepEqual(Object.keys(actual).sort(),['format','tables'])
 assert.equal(actual.format,'sky-guide-empty-dev-snapshot-v1')
 assert.deepEqual(actual.tables.map(t=>t.name),names())
 for(const table of actual.tables){
  assert.deepEqual(Object.keys(table).sort(),['name','rows'])
  assert.deepEqual(table.rows,rows[table.name]??[],'Snapshot not original empty development state: STOP')
 }
 return {tables:85,rows:3,scope:'empty development snapshot preparation only; actual backup/restore NOT RUN'}
}
export function buildEmptyDevRecoveryManifest(actual,baselineSql,globalAudit){
 const proof=verifyEmptyDevRecoverySnapshot(actual)
 assert.equal(globalAudit.roles.some(r=>r.name.startsWith('cli_login')),false)
 const directory=new URL('../../supabase/migrations/',import.meta.url)
 const files=readdirSync(directory).filter(n=>/^\d{14}_[a-z_]+\.sql$/.test(n)).sort()
 assert.equal(files.length,16)
 assert.equal(files.at(-1),'20261008044236_private_release_validation_brackets.sql')
 const migrations=files.map(name=>{const bytes=readFileSync(new URL(name,directory));return {name,bytes:bytes.length,sha256:digest(bytes)}})
 assert.equal(migrations.at(-1).sha256,'d518e0e751b6c8ab0321f3b66b17a6dfa22f176e02294fc0b70e87124325d8bf')
 return {format:'sky-guide-empty-dev-recovery-manifest-v1',project:'tpbydviuknovimroeodm',...proof,
  migrations,baselineSourceSha256:digest(baselineSql),snapshotSha256:digest(JSON.stringify(actual)),globalRoleAuditSha256:digest(JSON.stringify(globalAudit)),
  ownerRows:actual.tables.map(t=>({name:t.name,rows:t.rows.length,sha256:digest(JSON.stringify(t.rows))})),
  restoreStatus:'NOT RUN; no restore target or persistent fixture COMMIT authorized',
  exclusions:['platform/auth/storage schemas','credentials/passwords','Supabase extensions/provider metadata','migration-history statements not covered by source receipts'],
  warning:'Checksums establish artifact identity only. This is not pg_dump, a full disaster-recovery backup, off-site replication or a successful restore proof.'}
}
