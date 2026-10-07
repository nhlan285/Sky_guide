import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { buildReleaseMetadataScanProposal } from '../sql/build-release-metadata-scan-proposal.mjs'
import { buildReleaseScanEquivalence } from '../sql/build-release-scan-equivalence.mjs'
import { releaseScanCases,referenceReleaseScanFlags } from '../fixtures/releaseMetadataScanCases.mjs'
import { verifyReleaseScanEquivalence } from '../sql/verify-release-scan-equivalence.mjs'
import { runtimePrivilegeBaseline } from '../../src/server/runtimePrivilegeBaseline.ts'
import { runtimeJournalPrivilegeBaseline,reviewedReleaseScanBodyMd5 } from '../../src/server/runtimeJournalPrivilegeBaseline.ts'

test('one function proposal retains every event/global predicate and guards exact empty up/down metadata',()=>{
 const p=buildReleaseMetadataScanProposal(),up=p.files['release-metadata-scan-up.sql'],down=p.files['release-metadata-scan-down.sql']
 assert.equal(readFileSync(new URL('../../supabase/proposals/release_metadata_scan_up.sql',import.meta.url),'utf8'),up)
 assert.equal(readFileSync(new URL('../../supabase/proposals/release_metadata_scan_down.sql',import.meta.url),'utf8'),down)
 assert.ok(up.includes('as materialized'));assert.ok(up.includes('for update'))
 assert.ok(up.includes("if tg_op='UPDATE' and old.catalog_version<>new.catalog_version"))
 assert.ok(up.includes("if not found then return null"))
 assert.equal((p.proposedBody.match(/union all select/g)||[]).length,5)
 for(const field of ['source_present','import_report_present','incomplete_membership','invalid_order','invalid_owner','invalid_publication','invalid_provenance'])assert.ok(p.proposedBody.includes(field))
 assert.ok(up.includes('Same trigger signature/settings/locks/global invariants'))
 assert.ok(up.includes(p.oldBodyMd5));assert.ok(down.includes(p.newBodyMd5));assert.ok(down.includes(p.originalBody))
 assert.ok(p.files['release-metadata-scan-before-check.sql'].includes(p.oldBodyMd5))
 assert.ok(p.files['release-metadata-scan-after-check.sql'].includes(p.newBodyMd5))
 assert.equal(p.files['release-metadata-scan-after-check.sql'],p.files['release-metadata-scan-before-check.sql'].replace(p.oldBodyMd5,p.newBodyMd5))
 assert.equal(runtimePrivilegeBaseline.functions.find(f=>f.name==='validate_release_metadata').bodyMd5,p.oldBodyMd5)
 assert.equal(reviewedReleaseScanBodyMd5,p.newBodyMd5)
 for(const f of runtimePrivilegeBaseline.functions)assert.deepEqual(runtimeJournalPrivilegeBaseline.functions.find(current=>current.name===f.name),f)
 assert.equal(readFileSync(new URL('../../supabase/migrations/20261007160926_private_release_metadata_scan.sql',import.meta.url),'utf8'),up)
 assert.equal(readFileSync(new URL('../../supabase/migrations/20261007161625_restore_release_metadata_scan.sql',import.meta.url),'utf8'),down)
 assert.doesNotMatch(up+'\n'+down,/\b(?:disable trigger|set_config|create table|create role|grant |delete from|truncate|drop trigger|drop function)\b/i)
 assert.doesNotMatch(up,/if n<>case/i)
 const compact=s=>s.replace(/\s+/g,' ')
 for(const fragment of ["(select count(*) from sky_private.release_dataset where catalog_version=version)<>5","(select count(*) from sky_private.release_source where catalog_version=version)<>5","header.source_present<>exists(select 1 from sky_private.release_source_snapshot where catalog_version=version)","header.import_report_present<>exists(select 1 from sky_private.release_import_summary where catalog_version=version)"]){assert.ok(compact(p.originalBody).includes(fragment));assert.ok(compact(p.proposedBody).includes(fragment))}
})

test('read-only corpus extracts pinned original SQL and compares full five flags, including SQL NULL/inner JOIN behavior',()=>{
 const r=buildReleaseScanEquivalence(),cases=releaseScanCases()
 assert.equal(r.cases.length,128);assert.doesNotMatch(r.query,/sky_private\./)
 assert.ok(r.legacySelect.includes('where n>0 and p<>n-1'))
 assert.ok(r.legacySelect.includes('join domain_identity i using(kind,id)'))
 assert.ok(r.proposedSelect.includes('as materialized'))
 const receipt={cases:cases.length,mismatches:[],observations:cases.map(c=>({case:c.name,legacy:referenceReleaseScanFlags(c.state),proposed:referenceReleaseScanFlags(c.state)}))}
 assert.equal(verifyReleaseScanEquivalence(receipt).cases,128)
 for(const mutate of [r=>r.observations.pop(),r=>r.observations[0].proposed.incomplete_membership=true,r=>r.observations[0].case='substituted',r=>r.mismatches=[{}]]){
  const bad=globalThis.structuredClone(receipt);mutate(bad);assert.throws(()=>verifyReleaseScanEquivalence(bad))
 }
 assert.equal(referenceReleaseScanFlags(cases.find(c=>c.name==='stale provenance allowed').state).invalid_provenance,false)
 assert.equal(referenceReleaseScanFlags(cases.find(c=>c.name==='stale lookup revision').state).invalid_owner,true)
})
