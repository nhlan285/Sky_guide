import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve,join } from 'node:path'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import assert from 'node:assert/strict'
import { catalogColumns } from '../../src/server/catalogRows.ts'
import { releaseColumns,encodeReleaseRows } from '../../src/server/releaseRows.ts'
import { payloadWriteFixture } from '../fixtures/canonicalPayloadWrite.mjs'
import { runtimeRoleExecutor } from './runtime-role-executor.mjs'
import { buildReleaseValidationBracketProposal } from './build-release-validation-bracket-proposal.mjs'
import { canonicalJson } from '../../src/server/domainSnapshot.ts'

// PREPARED/NOT RUN. No scratch DDL. All data and approved creator SET grants
// share their own outer ROLLBACK. Execute only after new scoped package approval.
const lit=v=>v===null?'null':typeof v==='boolean'?v?'true':'false':typeof v==='number'?String(v):"'"+v.replaceAll("'","''")+"'"
const insert=(columns,rows)=>Object.entries(columns).filter(([t])=>rows[t]?.length).map(([t,cols])=>`insert into sky_private.${t}(${cols.join(',')}) values ${rows[t].map(r=>'('+cols.map(c=>lit(r[c])).join(',')+')').join(',')};`).join('\n')
const group=()=>`jsonb_build_object(${Object.keys(releaseColumns).map(t=>lit(t)+",coalesce((select jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text) from sky_private."+t+" r),'[]'::jsonb)").join(',')})`
const frame=()=>`jsonb_build_object('release',${group()},'canonical',jsonb_build_object(${['domain_identity','item','provenance'].map(t=>lit(t)+",coalesce((select jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text) from sky_private."+t+" r),'[]'::jsonb)").join(',')}),'clock',(select to_jsonb(r) from sky_private.release_validation_clock r),'witness',coalesce((select jsonb_agg(to_jsonb(r) order by r.catalog_version) from sky_private.release_validation_witness r),'[]'::jsonb))`
export async function buildReleaseValidationBracketRehearsal(){
 const proposal=buildReleaseValidationBracketProposal(),{f}=await payloadWriteFixture(),release=encodeReleaseRows(f.snapshot,f.publicCatalog),version=f.snapshot.manifest.catalogVersion
 const id=release.release_lookup[0].id,privateProof=f.catalog.provenance.find(p=>p.source_id!=='K15')
 assert.ok(privateProof);assert.equal(release.release_item.length,2);assert.equal(release.release_lookup.length,2)
 const flush='set constraints sky_private.release_metadata_state immediate;'
 const helper=`sky_private.validate_release_epoch(${lit(version)})`
 const mutations=[
  `update sky_private.release_lookup set owner_revision=owner_revision+1+coalesce(length(${helper}::text),0) where catalog_version=${lit(version)} and id=${lit(id)};`,
  `update sky_private.release_lookup set position=position+5 where catalog_version=${lit(version)} and id=${lit(id)};`,
  `delete from sky_private.release_lookup where catalog_version=${lit(version)} and id=${lit(id)};`,
  `delete from sky_private.release_item where catalog_version=${lit(version)};delete from sky_private.release_lookup where catalog_version=${lit(version)};`,
  `update sky_private.domain_identity set revision=revision+1 where kind='item' and id=${lit(id)};update sky_private.release_import_summary set accepted=accepted where catalog_version=${lit(version)};`,
  `update sky_private.item set record_status='draft' where id=${lit(id)};update sky_private.release_import_summary set accepted=accepted where catalog_version=${lit(version)};`,
  `insert into sky_private.release_provenance(catalog_version,id,position) values(${lit(version)},${lit(privateProof.id)},${release.release_provenance.length});`,
 ]
 const negatives=mutations.map((sql,i)=>`do $negative_${i}$ declare before_frame jsonb;after_frame jsonb;context text;begin
 select ${frame()} into before_frame;
 begin
  ${sql}
  ${flush}
  raise exception 'Expected release rejection ${i}' using errcode='P0999';
 exception when check_violation then
  get stacked diagnostics context=pg_exception_context;
  if position('validate_release_epoch' in context)=0 then raise exception 'Wrong rejection owner for case ${i}: %',context;end if;
 end;
 select ${frame()} into after_frame;
 if before_frame is distinct from after_frame then raise exception 'Negative case ${i} leaked bracket/cache/data';end if;
end;$negative_${i}$;`).join('\n')
 const begin=['-- PREPARED/NOT RUN. New scoped bracket/definer approval required.','begin isolation level read committed read write;',"set local statement_timeout='30s';","set local standard_conforming_strings=on;",proposal.files['release-validation-bracket-after-check.sql'],proposal.emptyAfterGuard].join('\n')
 const owner=begin+'\n'+insert(catalogColumns,f.catalog)+'\n'+insert(releaseColumns,release)+`
set constraints all immediate;set constraints all deferred;
${negatives}
do $bracket_positive$ declare before_frame jsonb;after_frame jsonb;before_epoch bigint;begin
 select ${frame()} into before_frame;
 -- Direct mid-statement calls must neither reuse nor change a prior witness.
 update sky_private.release_lookup set owner_revision=owner_revision+coalesce(length(${helper}::text),0) where catalog_version=${lit(version)};
 if (select jsonb_agg(to_jsonb(w) order by w.catalog_version) from sky_private.release_validation_witness w) is distinct from before_frame->'witness' then raise exception 'Mid-statement helper recorded a premature witness';end if;
 if (select write_depth from sky_private.release_validation_clock where singleton=1)<>0 then raise exception 'Write bracket did not close';end if;
 ${flush}set constraints sky_private.release_metadata_state deferred;
 select epoch into before_epoch from sky_private.release_validation_clock where singleton=1;
 update sky_private.release_lookup set position=position where false;
 if (select epoch from sky_private.release_validation_clock where singleton=1)<>before_epoch+2 then raise exception 'Zero-row statement did not invalidate twice';end if;
 perform ${helper};
 insert into sky_private.release_lookup(catalog_version,id,position,owner_revision)
 select catalog_version,id,position,owner_revision from sky_private.release_lookup where catalog_version=${lit(version)}
 on conflict(catalog_version,id) do update set position=excluded.position,owner_revision=excluded.owner_revision;
 if (select write_depth from sky_private.release_validation_clock where singleton=1)<>0 then raise exception 'UPSERT bracket did not balance';end if;
 ${flush}set constraints sky_private.release_metadata_state deferred;
 select ${frame()} into before_frame;
 begin
  update sky_private.release_lookup set position=position where false;perform ${helper};
  raise exception 'Injected statement failure' using errcode='P0999';
 exception when sqlstate 'P0999' then null;end;
 select ${frame()} into after_frame;
 if before_frame is distinct from after_frame then raise exception 'Failed subtransaction leaked clock/witness';end if;
end;$bracket_positive$;
select set_config('sky_guide.bracket_before_frame',${frame()}::text,true);
savepoint bracket_boundary;
update sky_private.release_lookup set position=position where false;
select ${helper};
rollback to savepoint bracket_boundary;
do $boundary$ begin
 if current_setting('sky_guide.bracket_before_frame')::jsonb is distinct from ${frame()} then raise exception 'Explicit savepoint leaked clock/witness/data';end if;
end;$boundary$;
-- Test-only snapshot assertion; no production validation decision trusts a GUC.
set constraints all immediate;
select jsonb_build_object('negative_checks',${mutations.length},'positive_checks',5,'release',${group()},
 'clock',(select to_jsonb(r) from sky_private.release_validation_clock r),
 'witness',(select to_jsonb(r) from sky_private.release_validation_witness r where catalog_version=${lit(version)}),
 'transaction_id',pg_catalog.pg_current_xact_id()::text) as bracket_receipt;
rollback;
`
 const denials=[]
 for(const role of ['sky_guide_sync_writer','sky_guide_sync_reader'])for(const table of ['release_validation_clock','release_validation_witness']){
  const statements=[`select * from sky_private.${table}`,
   table==='release_validation_clock'?`insert into sky_private.${table}(singleton,epoch,write_depth) values(1,0,0)`:`insert into sky_private.${table}(catalog_version,transaction_id,epoch) values('forged',pg_catalog.pg_current_xact_id(),0)`,
   `update sky_private.${table} set epoch=0`,`delete from sky_private.${table}`,`truncate sky_private.${table}`]
  for(const sql of statements)denials.push({role,sql})
 }
 for(const role of ['sky_guide_sync_writer','sky_guide_sync_reader'])for(const name of ['enter_release_validation_statement','leave_release_validation_statement'])denials.push({role,sql:`select sky_private.${name}()`})
 denials.push({role:'sky_guide_sync_reader',sql:`select ${helper}`})
 const denial=begin+'\n'+runtimeRoleExecutor('creator')+'\n'+denials.map(({role,sql},i)=>`set local role ${role};
do $denial_${i}$ begin
 begin execute ${lit(sql)};raise exception 'Expected permission denial ${i}' using errcode='P0999';
 exception when insufficient_privilege then null;end;
end;$denial_${i}$;
reset role;`).join('\n')+`
select ${helper};
select ${denials.length} as denied_checks;
rollback;\n`
 const files={'release-validation-bracket-owner-fixture.sql':owner,'release-validation-bracket-creator-denial-fixture.sql':denial}
 if(Object.values(files).some(sql=>Buffer.byteLength(sql)>800000))throw new Error('Bracket rehearsal exceeds bounded request')
 // Whole-row native receipts include schema-generated subtype discriminators.
 // Keep insertion columns unchanged and verify these stored values as well.
 const generatedDatasets={release_item:'items',release_lookup:'lookup',release_spirit:'spirits',release_season:'seasons',release_provenance:'provenance'}
 const nativeRelease=Object.fromEntries(Object.entries(release).map(([table,rows])=>[table,rows.map(r=>({...r,...(generatedDatasets[table]?{dataset:generatedDatasets[table]}:{})}))]))
 return {files,release:nativeRelease,negativeChecks:mutations.length,positiveChecks:5,deniedChecks:denials.length,version}
}
export function verifyReleaseValidationBracketReceipt(receipt,prepared){
 assert.equal(receipt.negative_checks,prepared.negativeChecks);assert.equal(receipt.positive_checks,prepared.positiveChecks)
 for(const [table,rows]of Object.entries(prepared.release))assert.deepEqual(
  receipt.release[table].toSorted((a,b)=>canonicalJson(a)<canonicalJson(b)?-1:1),rows.toSorted((a,b)=>canonicalJson(a)<canonicalJson(b)?-1:1),table)
 assert.equal(receipt.clock.singleton,1);assert.equal(receipt.clock.write_depth,0);assert.equal(receipt.clock.writer_xid,null)
 assert.ok(Number.isSafeInteger(receipt.clock.epoch)&&receipt.clock.epoch>0)
 assert.equal(receipt.witness.catalog_version,prepared.version);assert.equal(String(receipt.witness.transaction_id),receipt.transaction_id)
 assert.equal(receipt.witness.epoch,receipt.clock.epoch)
 return {negativeChecks:prepared.negativeChecks,positiveChecks:prepared.positiveChecks}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw new Error('Provide E-drive rehearsal directory')
 const p=await buildReleaseValidationBracketRehearsal();for(const [name,sql]of Object.entries(p.files))writeFileSync(join(process.argv[2],name),sql)
 process.stdout.write(JSON.stringify({status:'PREPARED/NOT RUN',negativeChecks:p.negativeChecks,positiveChecks:p.positiveChecks,deniedChecks:p.deniedChecks,files:Object.fromEntries(Object.entries(p.files).map(([name,sql])=>[name,Buffer.byteLength(sql)]))})+'\n')
}
