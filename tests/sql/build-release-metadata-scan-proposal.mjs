import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { URL,fileURLToPath } from 'node:url'
import { join,resolve } from 'node:path'
import process from 'node:process'
import { runtimeJournalPrivilegeBaseline } from '../../src/server/runtimeJournalPrivilegeBaseline.ts'
import { prepareRuntimeJournalPrivilegeProposal } from '../../src/server/runtimeJournalPrivilegePlan.ts'

const md5 = s => createHash('md5').update(s).digest('hex')
const sha = s => createHash('sha256').update(s).digest('hex')
const body = s => s.match(/\bas \$\$([\s\S]*?)\$\$;/i)?.[1]
const oldBodyMd5='b2ecccd2deae57f41a2debe3cf806529'
const tables=runtimeJournalPrivilegeBaseline.tables.map(t=>"'"+t.name+"'").join(',')
export function buildReleaseMetadataScanProposal() {
 const proposed=readFileSync(new URL('./release-metadata-scan-function.sql',import.meta.url),'utf8')
 const original=readFileSync(new URL('../../supabase/migrations/20261006180131_private_release_metadata.sql',import.meta.url),'utf8')
  .match(/create function sky_private\.validate_release_metadata\(\)[\s\S]*?\$\$;/i)?.[0]
 if(!original||md5(body(original))!==oldBodyMd5||!body(proposed))throw new Error('Original release function differs from pinned native baseline')
 const newBodyMd5=md5(body(proposed))
 const guard=expected=>`-- REVIEW ONLY / NOT APPLIED. Full native ACL/schema check is mandatory immediately before this transaction.\n`+
 `do $release_scan_guard$ declare t text;n bigint;begin
 if current_setting('session_replication_role')<>'origin' then raise exception 'Origin enforcement required';end if;
 if current_user<>'postgres' then raise exception 'Approved development actor required';end if;
 perform singleton from sky_private.sync_generation where singleton=1 for update;
 if not found or exists(select 1 from sky_private.sync_generation where singleton<>1 or revision<>0 or current_acceptance_revision is not null or last_promoted_at is not null) then raise exception 'Nonempty global baseline';end if;
 perform singleton from sky_private.sync_commit_control where singleton=1 for update;
 if not found or exists(select 1 from sky_private.sync_commit_control where singleton<>1 or active_intent_id is not null) then raise exception 'Nonempty journal control';end if;
 foreach t in array array[${tables}] loop
  execute format('select count(*) from sky_private.%I',t) into n;
  if n<>(case when t in('sync_generation','sync_commit_control') then 1 else 0 end) then raise exception 'Nonempty private owner %',t;end if;
 end loop;
 if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang join pg_roles r on r.oid=p.proowner
  where n.nspname='sky_private' and p.proname='validate_release_metadata' and pg_get_function_identity_arguments(p.oid)='' and pg_get_function_result(p.oid)='trigger'
  and md5(p.prosrc)='${expected}' and not p.prosecdef and r.rolname='postgres' and l.lanname='plpgsql' and p.proconfig=array['search_path=""']
  and p.provolatile='v' and not p.proisstrict and p.proparallel='u' and p.prokind='f' and not p.proleakproof) then raise exception 'Release validator definition/settings drift';end if;
 if (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='sky_private' and t.tgname='release_metadata_state' and not t.tgisinternal and t.tgenabled='O' and t.tgdeferrable and t.tginitdeferred)<>11 then raise exception 'Deferred release event coverage drift';end if;
end;$release_scan_guard$;\n`
 const before=prepareRuntimeJournalPrivilegeProposal().roleCheck+'\n'
 if(before.split(oldBodyMd5).length!==2)throw new Error('Expected exactly one pinned body in current83 ACL checker')
 const after=before.replace(oldBodyMd5,newBodyMd5)
 const files={
  'release-metadata-scan-up.sql':guard(oldBodyMd5)+proposed,
  'release-metadata-scan-down.sql':guard(newBodyMd5)+original.replace('create function','create or replace function')+'\n',
  'release-metadata-scan-before-check.sql':before,
  'release-metadata-scan-after-check.sql':after,
 }
 if(Object.values(files).some(s=>Buffer.byteLength(s)>200000))throw new Error('Release review output exceeds bound')
 return {files,oldBodyMd5,newBodyMd5,originalBody:body(original),proposedBody:body(proposed),functionSha256:sha(proposed)}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 if(!process.argv[2])throw new Error('Provide E-drive review directory')
 const proposal=buildReleaseMetadataScanProposal()
 for(const [name,content] of Object.entries(proposal.files))writeFileSync(join(process.argv[2],name),content)
 process.stdout.write(JSON.stringify({status:'PREPARED/NOT APPLIED',oldBodyMd5:proposal.oldBodyMd5,newBodyMd5:proposal.newBodyMd5,functionSha256:proposal.functionSha256,
  files:Object.fromEntries(Object.entries(proposal.files).map(([name,text])=>[name,{bytes:Buffer.byteLength(text),sha256:sha(text)}]))})+'\n')
}
