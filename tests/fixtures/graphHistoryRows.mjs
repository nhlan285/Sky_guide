import { relations } from '../../src/data/domain/identity.ts'

// Synthetic metadata only. Identity reservations for future kinds do not imply
// game facts, typed module payload support or publication/asset rights.
export function graphHistoryFixture() {
  const time='2026-10-07T00:00:00.123456789Z',provenanceIds=['fixture-release-proof','fixture-graph-proof']
  const refs={item:'shared',spirit:'shared',season:'season',location:'location',cosmetic:'cosmetic',event:'event',
    eventRule:'rule',eventOverride:'override',eventOccurrence:'occurrence',sampleSet:'samples',instrument:'instrument',emote:'emote',call:'call',media:'media'}
  const node=(kind,id,retiredAt=null) => ({kind,id,revision:3,schemaVersion:1,updatedAt:time,retiredAt,fixture:false,provenanceIds:[...provenanceIds].reverse()})
  const identities=Object.entries(refs).map(([kind,id])=>node(kind,id))
  for(const id of ['instrument-item','emote-item','call-item']) identities.push(node('item',id))
  identities.push(node('item','retired',time),node('item','gone',time),{...node('media','fixture-private'),fixture:true,provenanceIds:[]})
  const edges=Object.entries(relations).map(([type,[from,to]])=>({type,fromId:refs[from],toId:refs[to]}))
  edges.find(e=>e.type==='instrumentItem').toId='instrument-item'
  edges.find(e=>e.type==='emoteItem').toId='emote-item'
  edges.find(e=>e.type==='callItem').toId='call-item'
  return {identities:{identities:identities.reverse(),
    crosswalks:[{sourceId:'K15',sourceKey:'Ánh sáng \' 🌌',target:{kind:'item',id:'shared'}},{sourceId:'K01',sourceKey:'Ánh sáng \' 🌌',target:{kind:'spirit',id:'shared'}}],
    aliases:[{from:{kind:'item',id:'legacy-unknown'},to:{kind:'item',id:'retired'}},{from:{kind:'item',id:'retired'},to:{kind:'item',id:'shared'}}],
    tombstones:[{target:{kind:'item',id:'gone'},retiredAt:time,replacement:null},{target:{kind:'item',id:'retired'},retiredAt:time,replacement:{kind:'item',id:'shared'}}],
    relations:edges.reverse()},provenanceIds}
}
