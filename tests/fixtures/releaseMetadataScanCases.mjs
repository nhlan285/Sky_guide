// Predicate-only synthetic rows. NULL/dangling cases deliberately test JOIN/SQL
// semantics; they do not bypass immediate schema/FK/NOT NULL constraints.
export function releaseScanCases() {
 const version='fixture-scan',member=(id,position)=>({catalog_version:version,id,position,owner_revision:1})
 const valid={
  release_item:[member('item-a',0),member('item-b',1)],release_lookup:[member('item-b',0),member('item-a',1)],
  release_spirit:[member('spirit-a',0)],release_season:[member('season-a',0)],
  release_provenance:[{catalog_version:version,id:'prov-a',position:0}],
  release_source_path:[{catalog_version:version,position:0},{catalog_version:version,position:1}],
  domain_identity:[['item','item-a'],['item','item-b'],['spirit','spirit-a'],['season','season-a']].map(([kind,id])=>({kind,id,revision:1,fixture:false,retired_at:null})),
  item:['item-a','item-b'].map(id=>({id,record_status:'published'})),spirit:[{id:'spirit-a',record_status:'published'}],season:[{id:'season-a',record_status:'published'}],
  provenance:[{id:'prov-a',source_id:'K15',source_url:'https://example.org/fixture',verification_status:'verified'}],
 }
 const cases=[{name:'valid independent item/lookup order',state:valid}]
 const mutations=[
  ['no items or lookup',s=>{s.release_item=[];s.release_lookup=[]}],
  ['missing lookup member',s=>s.release_lookup.pop()],
  ['extra lookup member',s=>s.release_lookup.push(member('other-item',2))],
  ['lookup gap',s=>s.release_lookup[1].position=2],
  ['duplicate position (immediate UNIQUE also rejects)',s=>s.release_lookup[1].position=0],
  ['spirit missing zero',s=>s.release_spirit[0].position=1],
  ['empty optional seasons',s=>s.release_season=[]],
  ['provenance gap',s=>s.release_provenance[0].position=3],
  ['source path gap',s=>s.release_source_path[1].position=2],
  ['absent source paths',s=>s.release_source_path=[]],
  ['stale lookup revision',s=>s.release_lookup[0].owner_revision=2],
  ['fixture identity',s=>s.domain_identity[0].fixture=true],
  ['retired identity',s=>s.domain_identity[0].retired_at='2026-10-07T00:00:00Z'],
  ['unpublished item',s=>s.item[0].record_status='draft'],
  ['unpublished spirit',s=>s.spirit[0].record_status='draft'],
  ['unpublished season',s=>s.season[0].record_status='draft'],
  ['wrong provenance source',s=>s.provenance[0].source_id='K01'],
  ['unknown provenance URL',s=>s.provenance[0].source_url=null],
  ['unverified provenance',s=>s.provenance[0].verification_status='unverified'],
  ['stale provenance allowed',s=>s.provenance[0].verification_status='stale'],
  ['missing identity JOIN (FK context separate)',s=>s.domain_identity.pop()],
  ['missing canonical JOIN (FK context separate)',s=>s.item.pop()],
  ['missing provenance JOIN (FK context separate)',s=>s.provenance=[]],
  ['NULL publication SQL comparison (NOT NULL context separate)',s=>s.spirit[0].record_status=null],
  ['NULL owner SQL comparison (NOT NULL context separate)',s=>s.release_spirit[0].owner_revision=null],
  ['other version ignored',s=>s.release_item.push({...member('other-version',100),catalog_version:'outside-scope'})],
  ['multiple violations',s=>{s.release_lookup=[];s.item[0].record_status='draft';s.provenance[0].source_url=null}],
 ]
 for(const [name,mutate] of mutations){const state=globalThis.structuredClone(valid);mutate(state);cases.push({name,state})}
 // Combine mutations deterministically, including reverted final states. No
 // claimed PostgreSQL timing/trigger proof arises from this finite corpus.
 let seed=42
 for(let n=0;n<100;n++){
  const state=globalThis.structuredClone(valid)
  for(let k=0;k<3;k++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0
   const variation=globalThis.structuredClone(valid);mutations[seed%mutations.length][1](variation)
   for(const table of Object.keys(valid))if(JSON.stringify(variation[table])!==JSON.stringify(valid[table]))state[table]=variation[table]
  }
  cases.push({name:'combined-'+n,state})
 }
 return cases
}

export function referenceReleaseScanFlags(state) {
 const rows=table=>state[table].filter(r=>r.catalog_version==='fixture-scan')
 const items=rows('release_item'),lookup=rows('release_lookup'),ne=(a,b)=>a!=null&&b!=null&&a!==b
 const keys=new Set(items.map(r=>r.id)),lookupKeys=new Set(lookup.map(r=>r.id))
 const incomplete_membership=!items.length||[...keys].some(id=>!lookupKeys.has(id))||[...lookupKeys].some(id=>!keys.has(id))
 const invalid_order=['release_item','release_lookup','release_spirit','release_season','release_provenance','release_source_path'].some(table=>{
  const values=rows(table);return values.length>0&&Math.max(...values.map(r=>r.position))!==values.length-1
 })
 const invalid_owner=[['release_item','item'],['release_lookup','item'],['release_spirit','spirit'],['release_season','season']].some(([table,kind])=>rows(table).some(r=>{
  const identity=state.domain_identity.find(i=>i.kind===kind&&i.id===r.id)
  return !!identity&&(ne(identity.revision,r.owner_revision)||identity.fixture===true||identity.retired_at!=null)
 }))
 const invalid_publication=[['release_item','item'],['release_spirit','spirit'],['release_season','season']].some(([table,kind])=>rows(table).some(r=>{
  const owner=state[kind].find(o=>o.id===r.id);return !!owner&&ne(owner.record_status,'published')
 }))
 const invalid_provenance=rows('release_provenance').some(r=>{
  const p=state.provenance.find(p=>p.id===r.id)
  return !!p&&(ne(p.source_id,'K15')||p.source_url==null||(p.verification_status!=null&&!['verified','stale'].includes(p.verification_status)))
 })
 return {incomplete_membership,invalid_order,invalid_owner,invalid_publication,invalid_provenance}
}
