import assert from 'node:assert/strict'
import { protocolPool } from './postgresProtocolPort.mjs'
import { emptyTables } from './postgresSyncStore.mjs'
import { commitProposalColumns } from '../../src/server/syncCommitProposalRows.ts'
import { ConfirmedSqlRejection } from '../../src/server/postgresTransactionKernel.ts'

// Synthetic protocol model only: no SQL engine, durable storage, session locking,
// server trigger/ACL, SDK, crash or cancellation proof. Independent SourceSync
// frames are installed at finalization, exactly as in the earlier Store model.
export function journalPool(initial=emptyTables(),settings={}) {
 const clone=globalThis.structuredClone,names=['sync_commit_intent','sync_commit_control','sync_commit_applied','sync_commit_receipt']
 const start={...clone(initial),sync_commit_intent:[],sync_commit_control:[{singleton:1,active_intent_id:null}],sync_commit_applied:[],sync_commit_receipt:[]}
 return protocolPool(start,{...settings,executeQuery:async(s,signal,lease)=>{
  const empty=command=>({command,status:lease.state,fields:[],rows:[]})
  const bool=value=>({command:'SELECT',status:lease.state,fields:[{name:'applied',dataTypeID:16,format:'text'}],rows:[[value?'t':'f']]})
  const reject=()=>{lease.state='E';throw new ConfirmedSqlRejection('23514','E')}
  let t=lease.local
  if(s.text.startsWith('insert into sky_private.sync_commit_intent(')) {
   const row=Object.fromEntries(commitProposalColumns.sync_commit_intent.map((c,i)=>[c,s.values[i]]))
   row.target_revision=row.expected_revision+1
   if(t.sync_commit_intent.some(i=>i.id===row.id))return reject()
   t.sync_commit_intent.push(row);return empty('INSERT')
  }
  const helper=/^select sky_private\.(activate_sync_commit_intent|require_sync_commit_intent|apply_sync_commit_cas|settle_sync_commit_intent)\(/.exec(s.text)
  if(!helper)return settings.executeQuery?.(s,signal,lease)
  const [id,arg]=s.values,i=t.sync_commit_intent.find(i=>i.id===id),control=t.sync_commit_control[0],h=t.sync_generation[0]
  const marker=t.sync_commit_applied.find(p=>p.intent_id===id),receipt=t.sync_commit_receipt.find(r=>r.intent_id===id)
  if(helper[1]==='activate_sync_commit_intent') {
   if(settings.activateFalse||!i||control.active_intent_id!==null||h.revision!==i.expected_revision||receipt)return bool(false)
   control.active_intent_id=id;return bool(true)
  }
  if(helper[1]==='settle_sync_commit_intent') {
   if(receipt)return receipt.resolution===arg?bool(true):reject()
   if(!i||control.active_intent_id!==id)return reject()
   if(arg==='committed'? !marker||marker.revision!==i.target_revision||marker.state_digest!==i.state_digest:
    arg==='not_committed'?h.revision!==i.expected_revision||marker||t.sync_audit.some(a=>a.revision===i.target_revision)||t.sync_acceptance.some(a=>a.revision===i.target_revision):
    marker||h.revision<i.target_revision||!t.sync_audit.some(a=>a.revision===i.target_revision))return reject()
   t.sync_commit_receipt.push({intent_id:id,resolution:arg});control.active_intent_id=null;return bool(true)
  }
  if(settings.requireFalse)return bool(false)
  if(!i||control.active_intent_id!==id||i.state_digest!==arg||h.revision!==i.expected_revision||receipt||marker)return reject()
  if(helper[1]==='require_sync_commit_intent')return bool(true)
  const next=settings.nextTables?.(i.target_revision,i.source_id)
  assert.ok(next,'Independent expected next frame required')
  lease.local={...clone(next),...Object.fromEntries(names.map(n=>[n,clone(t[n])]))};t=lease.local
  t.sync_commit_applied.push({intent_id:id,revision:i.target_revision,state_digest:i.state_digest})
  return bool(true)
 }})
}
