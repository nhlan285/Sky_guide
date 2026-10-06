// Synthetic payloads only. Deferred IDs are supplied registries, not source facts.
export const catalogFixtureContext={deferred:{nodeIds:new Set(['future-node']),iapProductIds:new Set(['future-product']),assetIds:new Set(['future-asset']),ruleIds:new Set(['future-rule']),realmIds:new Set(['future-realm']),treeIds:new Set(['future-tree']),mapIds:new Set(['future-map']),articleIds:new Set(['future-article'])}}
export const catalogFixture=() => {
  const meta={provenanceIds:[],updatedAt:'2026-10-07T00:00:00Z',recordStatus:'draft',fixture:true}
  const acquisition=(costStatus,costs) => ({id:'same-option',kind:'other',costStatus,costs,friendshipNodeId:'future-node',iapProductId:'future-product',validFrom:{value:'',precision:'unknown',timezone:null,rawLabel:''},validTo:{value:'2026-10-07',precision:'date',timezone:'Asia/Saigon',rawLabel:'7 October'},provenanceIds:['fixture-proof']})
  const item=(id,option) => ({...meta,id,sourceKeys:{K15:id,tsaIdentifier:''},name:{default:'Fixture',translations:{vi:'',en:'Fixture'}},slot:'unknown',rawSlot:'Raw source label',accessoryAnchor:null,seasonIds:['fixture-season-b','fixture-season-a'],spiritIds:['fixture-spirit'],acquisitionOptions:[option],assetIds:['future-asset'],dyeRegions:[],dyeStatus:'unknown',ruleIds:['future-rule'],compatibility:null})
  const a=item('tsa-cosmetic-9001',acquisition('unknown',[{currency:'other',sourceCurrencyLabel:'seasonal hearts',amount:null}]))
  const b={...item('tsa-cosmetic-9002',acquisition('free',[])),fieldProvenance:{}}
  a.sourceKeys=Object.fromEntries([['K15','9001'],['tsaIdentifier',''],['__proto__','retained literal key']])
  a.name.translations=Object.fromEntries([['vi',''],['__proto__','translated literal key']])
  const season=(id) => ({...meta,id,kind:'season',name:{default:'Fixture season',translations:{}},startsAt:null,endsAt:{value:'unknown',precision:'unknown',timezone:null,rawLabel:null},timeStatus:'unknown',summary:null,spiritIds:[],itemIds:['tsa-cosmetic-9002','tsa-cosmetic-9001'],realmIds:['future-realm'],mapIds:['future-map'],officialArticleIds:['future-article'],fieldProvenance:{}})
  return {items:[a,b],lookup:[{id:b.id,upstreamId:9002,identifier:'FixtureB',category:'unknown',categoryEvidence:null,offers:[{id:'same-option',acquisition:'shop',seasonPass:false,bundle:true,money:14.99,sourceUrl:'https://example.invalid/fixture-b'}]},
    {id:a.id,upstreamId:9001,identifier:'FixtureA',category:'other',categoryEvidence:'Fixture only',image:null,images:null,offers:[{id:'same-option',acquisition:'unknown',seasonPass:true,bundle:false,money:null,sourceUrl:'https://example.invalid/fixture-a'}]}],
    spirits:[{...meta,id:'fixture-spirit',name:{default:'Fixture spirit',translations:{}},category:'unknown',realmId:'future-realm',seasonIds:['fixture-season-a','fixture-season-b'],treeIds:['future-tree'],fieldProvenance:{name:['fixture-proof'],category:['fixture-proof']}}],
    seasons:[season('fixture-season-a'),season('fixture-season-b')],
    provenance:[{id:'fixture-proof',sourceId:'K15',sourceUrl:null,sourceRecordKey:'',sourceRevision:null,retrievedAt:'2026-10-07t07:00:00,123+07',observedAt:null,attribution:'Fixture',licenseNote:'No artwork',transformNote:"Test only 'quoted' \\ path\nnext line",verificationStatus:'pending'}]}
}
