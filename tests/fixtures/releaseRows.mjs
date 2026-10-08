import { createHash } from 'node:crypto'
import { encodeCatalogRows } from '../../src/server/catalogRows.ts'
import { canonicalJson, canonicalizeSnapshotFiles } from '../../src/server/domainSnapshot.ts'

// Explicitly synthetic public-shaped fixture, never approved source facts.
export function releaseFixture() {
  const meta={provenanceIds:['fixture-release-proof'],updatedAt:'2026-10-07T00:00:00Z',recordStatus:'published',fixture:false}
  const item=id => ({...meta,id,sourceKeys:{K15:id},name:{default:id,translations:{}},slot:'unknown',rawSlot:'Fixture only',accessoryAnchor:null,
    seasonIds:[],spiritIds:[],acquisitionOptions:[],assetIds:[],dyeRegions:[],dyeStatus:'unknown',ruleIds:[],compatibility:null})
  const payload={items:[item('tsa-cosmetic-9002'),item('tsa-cosmetic-9001')],lookup:[{id:'tsa-cosmetic-9001',upstreamId:9001,identifier:'Fixture A',category:'unknown',categoryEvidence:null,offers:[]},
    {id:'tsa-cosmetic-9002',upstreamId:9002,identifier:'Fixture B',category:'unknown',categoryEvidence:null,offers:[]}],
    spirits:[],seasons:[],provenance:[{id:'fixture-release-proof',sourceId:'K15',sourceUrl:'https://example.invalid/release-fixture',sourceRecordKey:null,sourceRevision:null,
      retrievedAt:'2026-10-07T00:00:00Z',observedAt:null,attribution:'Synthetic fixture',licenseNote:'No source import',transformNote:'Test only',verificationStatus:'verified'}]}
  const version='fixture-release',generatedAt='2026-10-07T00:00:00Z',files=new Map(),entries={}
  for(const [index,[name,records]] of Object.entries(payload).entries()) {
    const text=canonicalJson({schemaVersion:1,dataVersion:version,generatedAt:`2026-10-07T00:00:0${index}Z`,sourceIds:['K15'],fixture:false,records})
    entries[name]={path:`${name}.json`,dataVersion:version,sha256:createHash('sha256').update(text).digest('hex')};files.set(entries[name].path,text)
  }
  const {provenance,...datasets}=entries
  const manifest={schemaVersion:1,catalogVersion:version,generatedAt,datasets,provenance,aliases:null,tombstones:null,assetManifestVersion:'',
    source:{repository:'thatskyapplication/thatskyapplication',revision:'a'.repeat(40),normalizationVersion:'fixture-v1',sourcePaths:[
      {path:'packages/utility/source/fixture-b.ts',gitBlobSha:'b'.repeat(40)},{path:'packages/utility/source/fixture-a.ts',gitBlobSha:'c'.repeat(40)},
      {path:'packages/utility/source/fixture-b.ts',gitBlobSha:'b'.repeat(40)}],transport:'public-repository',status:'pinned-snapshot'},
    importReport:{accepted:2,excluded:0,unknownCategory:2,unknownCost:2,rejected:[]}}
  return {snapshot:canonicalizeSnapshotFiles({manifest,files}),catalog:encodeCatalogRows(payload)}
}
