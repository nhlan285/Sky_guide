import { readFileSync,writeFileSync } from 'node:fs'
import { join,resolve } from 'node:path'
import { fileURLToPath,URL } from 'node:url'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { prepareRuntimeJournalPrivilegeProposal } from '../../src/server/runtimeJournalPrivilegePlan.ts'
import { journalSchemaSha256,runtimeJournalPrivilegeBaseline,runtimeJournalColumnBaseline } from '../../src/server/runtimeJournalPrivilegeBaseline.ts'

// Pre-install REVIEW preparation only. No synthetic catalog is a native inventory.
// Native37-function/155-trigger83-owner preflight must pass after authorized schema
// application and before grant; current installed79-owner catalog will reject it.
export function buildRuntimeJournalPrivilegeProposal() {
 const up=readFileSync(new URL('../../supabase/proposals/sync_commit_journal_up.sql',import.meta.url))
 if(createHash('sha256').update(up).digest('hex')!==journalSchemaSha256)throw new Error('Pinned journal schema proposal changed')
 const p=prepareRuntimeJournalPrivilegeProposal()
 const reader='sky_guide_sync_reader',writer='sky_guide_sync_writer',id="'12345678-1234-4123-8123-000000000999'::uuid"
 const denied=[
  [reader,"insert into sky_private.source_registry(id) values('K15');",['42501']],
  [reader,`select sky_private.activate_sync_commit_intent(${id});`,['42501']],
  [reader,`select sky_private.settle_sync_commit_intent(${id},'not_committed');`,['42501']],
  [writer,'insert into sky_private.sync_commit_control(singleton,active_intent_id) values(1,null);',['42501']],
  [writer,`delete from sky_private.sync_commit_intent where id=${id};`,['42501']],
  [writer,`update sky_private.sync_commit_intent set state_digest=repeat('0',64) where id=${id};`,['42501']],
  [writer,`insert into sky_private.sync_commit_intent(id,target_revision) values(${id},1);`,['42501','428C9']],
  [writer,'update sky_private.sync_commit_control set singleton=1 where singleton=1;',['42501']],
 ]
 const denialSql=['-- PREPARED/NOT RUN. Requires approved roles/schema, quiesced consumers; all checks under outer ROLLBACK.',
  'begin isolation level read committed read write;',"set local statement_timeout='30s';",...denied.flatMap(([role,sql,codes],n)=>[
   `set local role ${role};`,
   `do $denied$ begin begin ${sql} raise exception 'Denied operation ${n+1} unexpectedly allowed' using errcode='P0999';exception when ${codes.map(c=>`sqlstate '${c}'`).join(' or ')} then null;end;end;$denied$;`,
  ]),'reset role;',`select ${denied.length} as denied_checks;`,'rollback;'].join('\n')+'\n'
 const files={
  'runtime-journal-preflight.sql':p.preflight+'\n',
  'runtime-journal-grant-proposal.sql':p.grant,
  'runtime-journal-rollback-proposal.sql':p.rollback,
  'runtime-journal-role-check.sql':'-- PREPARED/NOT RUN. Read-only ACL/policy introspection AFTER authorized grants; not actual runtime allow/deny proof.\n'+p.roleCheck+'\n',
  'runtime-journal-denial-fixture.sql':denialSql,
  'runtime-journal-manifest.json':JSON.stringify({status:'PREPARED/NOT APPLIED/NOT NATIVE VERIFIED',schemaSha256:journalSchemaSha256,
   tables:p.tables,helpers:p.helpers,expectedCatalog:runtimeJournalPrivilegeBaseline,expectedJournalColumns:runtimeJournalColumnBaseline},null,2)+'\n',
 }
 if(Object.values(files).some(v=>Buffer.byteLength(v)>200000))throw new Error('Review file budget exceeded')
 return {files,tables:p.tables.length,helpers:p.helpers.length,policies:(p.grant.match(/create policy /g)||[]).length}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 if(!process.argv[2])throw new Error('Provide E-drive review output directory outside Git')
 const p=buildRuntimeJournalPrivilegeProposal()
 for(const [file,contents] of Object.entries(p.files))writeFileSync(join(process.argv[2],file),contents)
 process.stdout.write(JSON.stringify({status:'PREPARED/NOT RUN',tables:p.tables,helpers:p.helpers,policies:p.policies,
  files:Object.fromEntries(Object.entries(p.files).map(([name,text])=>[name,{bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex')}]))})+'\n')
}
