import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { canonicalJson,canonicalizeSnapshotFiles } from '../../src/server/domainSnapshot.ts'
import { stageSourceSnapshot } from '../../src/server/sourceSync.ts'
import { contract,empty } from './syncReadFrame.mjs'

// Synthetic candidates only; keep explicit supplied graph and independent record
// ordering instead of deriving new source facts from a private retained payload.
export async function payloadCandidate(snapshot,graph,change=()=>{},selectedContract=contract) {
 const source=globalThis.structuredClone(snapshot),identities=globalThis.structuredClone(graph)
 const records=Object.fromEntries(Object.entries({...source.manifest.datasets,provenance:source.manifest.provenance}).map(([name,e])=>[name,JSON.parse(source.files.get(e.path)).records]))
 change(records,identities,source.manifest)
 for(const [name,entry] of Object.entries({...source.manifest.datasets,provenance:source.manifest.provenance})) {
  const text=canonicalJson({...JSON.parse(source.files.get(entry.path)),dataVersion:entry.dataVersion,records:records[name]})
  source.files.set(entry.path,text);entry.sha256=createHash('sha256').update(text).digest('hex')
 }
 const publicFiles=canonicalizeSnapshotFiles(source),provenanceIds=[...new Set([...records.provenance.map(p=>p.id),...identities.identities.flatMap(n=>n.provenanceIds)])]
 const staged=await stageSourceSnapshot({sourceId:'K15',raw:'synthetic payload transition',normalizationVersion:'fixture-v1',base:empty(),contract:selectedContract,
  normalize:async()=>({identities,publicFiles,provenanceIds}),fetchedAt:'2026-10-07T00:00:00Z',now:()=>Date.parse('2026-10-07T00:01:00Z')})
 assert.equal(staged.status,'staged');return staged.candidate
}
