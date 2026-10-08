import assert from 'node:assert/strict'
import test from 'node:test'
import { createSyncCommitFence } from '../../src/server/syncCommitFence.ts'
import { prepareSyncCommitIntent,decodeSyncCommitIntent } from '../../src/server/syncCommitIntent.ts'
import { createPostgresCommitWitness } from '../../src/server/postgresCommitWitness.ts'
import { createPostgresTransactionKernel,PrivateTransactionError } from '../../src/server/postgresTransactionKernel.ts'
import { createPostgresSyncStore } from '../../src/server/postgresSyncStore.ts'
import { postgresSyncSequence } from '../fixtures/postgresSyncSequence.mjs'
import { contract,storeOptions,decodeTables } from '../fixtures/postgresSyncStore.mjs'
import { protocolPool,kernelLimits } from '../fixtures/postgresProtocolPort.mjs'

const id='12345678-1234-4123-8123-123456789abc',clone=globalThis.structuredClone
// Contract/fault model only: shared backing object survives a controller restart,
// NOT actual durable storage, process crash, journal database/ACL or multi-host proof.
function journal(settings={}) {
 let active=null;const receipts=[],events=[]
 return {receipts,events,get active(){return clone(active)},async load(){if(settings.loadError)throw new Error('PRIVATE journal');return clone(active)},
  async claim(i){events.push('claim');if(settings.claimBefore)throw new Error('PRIVATE claim');if(active)return false;active=clone(i);if(settings.claimAfter)throw new Error('PRIVATE claim ACK');return true},
  async settle(intentId,resolution){events.push('settle');if(settings.settleBefore)throw new Error('PRIVATE settle');assert.equal(active.id,intentId);receipts.push({id:intentId,resolution});active=null;if(settings.settleAfter)throw new Error('PRIVATE settle ACK')},
 }
}
let sequence
const data=async()=>sequence??=await postgresSyncSequence()
const intent=async p=>prepareSyncCommitIntent(p.sourceId,await decodeTables(p.initial,p.sourceId),p.next,id)
const promote=(f,p)=>f.promote(p.next.lastKnownGood,p.next.approval,{validUntil:p.next.freshness.validUntil,now:()=>Date.parse(p.next.lastPromotedAt)})
const execute=(f,p)=>p.next.failures?f.failure(p.sourceId,p.next.lastAttemptAt,()=>Date.parse(p.next.lastAttemptAt)):promote(f,p)
function kernel(pool){return createPostgresTransactionKernel(pool,kernelLimits)}
function connected(initial,settings={},j=journal()) {
 const pool=protocolPool(initial,settings),db=kernel(pool),store=createPostgresSyncStore(db,contract,storeOptions)
 const witness=createPostgresCommitWitness(db,{maxRows:4,maxBytes:65536})
 return {pool,j,store,witness,fence:createSyncCommitFence(store,j,witness,contract)}
}

test('all5 SourceSync phases cross outward fence with global durable-claim/settle contract',async()=>{
 const {initial,phases}=await data(),frames=new Map(phases.map(p=>[p.next.revision,p.tables])),c=connected(initial,{nextTables:rev=>frames.get(rev)})
 for(const p of phases){assert.equal(await execute(c.fence,p),p.next.failures?'recorded':p.next.revision===5?'unchanged':'promoted');assert.deepEqual(c.pool.tables,p.tables);assert.equal(c.j.active,null)}
 assert.deepEqual(c.j.receipts.map(r=>r.resolution),Array(5).fill('committed'))
 assert.deepEqual(c.j.events,Array(5).fill(['claim','settle']).flat())
})

test('unknown COMMIT promotion is reconciled through fresh head lock and exact immutable review tuple',async()=>{
 const {phases}=await data(),p=phases[0];let lost=false
 const c=connected(p.initial,{nextTables:()=>p.tables,afterQuery:(s,_sig,l,r)=>{
  if(s.text==='commit'&&l.queries[0].text.endsWith('read write')&&!lost){lost=true;throw new Error('PRIVATE lost COMMIT')}
  return r
 }})
 assert.equal(await promote(c.fence,p),'promoted');assert.deepEqual(c.pool.tables,p.tables)
 assert.equal(c.j.active,null);assert.equal(c.j.receipts[0].resolution,'committed')
 const failed=c.pool.leases.find(l=>l.discarded),fresh=c.pool.leases.at(-1)
 assert.notEqual(failed.key,fresh.key);assert.ok(fresh.released)
 assert.equal(fresh.queries[0].text,'begin isolation level read committed read write')
 assert.ok(fresh.queries[4].text.includes('for update'))
 assert.ok(fresh.queries[5].text.includes('from sky_private.sync_audit where revision=$1'))
 assert.ok(fresh.queries[6].text.includes('from sky_private.sync_acceptance where revision=$1'))
})

test('unknown publication absent after settlement barrier reports rejected; competing target reports conflict',async()=>{
 const {phases}=await data(),p=phases[0]
 for(const competing of [false,true]) {
  const tables=clone(competing?p.tables:p.initial)
  if(competing)tables.sync_acceptance[0].reviewer_ref='different verified reviewer'
  const pool=protocolPool(tables),db=kernel(pool),j=journal()
  const store={read:async()=>decodeTables(p.initial),compareAndSwap:async()=>{throw new PrivateTransactionError('commit_indeterminate','indeterminate')}}
  const f=createSyncCommitFence(store,j,createPostgresCommitWitness(db,{maxRows:4,maxBytes:65536}),contract)
  assert.equal(await promote(f,p),competing?'conflict':'rejected')
  assert.equal(j.receipts[0].resolution,competing?'conflict':'not_committed');assert.equal(j.active,null)
  assert.ok(pool.leases[0].queries[4].text.includes('for update'))
 }
})

test('recovery reads original slot after newer global head, not latest LKG, never repeats CAS',async()=>{
 const {phases,tables}=await data(),p=phases[0],j=journal();await j.claim(await intent(p))
 let writes=0
 const pool=protocolPool(tables),store={read:async()=>{throw new Error('must not read current Store')},compareAndSwap:async()=>{writes++;return true}}
 const f=createSyncCommitFence(store,j,createPostgresCommitWitness(kernel(pool),{maxRows:4,maxBytes:65536}),contract)
 assert.deepEqual(await f.recover(),{status:'committed',intentId:id});assert.equal(writes,0);assert.equal(j.active,null)
})

test('exact lost-ACK failure stays quarantined: immutable audit lacks complete retry/count witness',async()=>{
 const {phases,tables}=await data()
 for(const p of phases.filter(p=>p.next.failures)) {
  const c=connected(p.initial,{nextTables:()=>p.tables,afterQuery:(s,_sig,l,r)=>{if(s.text==='commit'&&l.queries[0].text.endsWith('read write'))throw new Error('PRIVATE commit ACK');return r}})
  // Make witness usable separately; original connection is discarded.
  const witness=createPostgresCommitWitness(kernel(protocolPool(p.tables)),{maxRows:4,maxBytes:65536})
  const f=createSyncCommitFence(c.store,c.j,witness,contract)
  assert.equal(await execute(f,p),'quarantined');assert.ok(c.j.active)
  const recovered=createSyncCommitFence(c.store,c.j,createPostgresCommitWitness(kernel(protocolPool(tables)),{maxRows:4,maxBytes:65536}),contract)
  assert.equal((await recovered.recover()).status,'quarantined');assert.ok(c.j.active)
  assert.equal(await recovered.failure('K15','2026-10-07T01:00:00Z'),'quarantined')
  assert.equal(c.pool.leases.length,2) //one Store read + one CAS, no repeat/write.
 }
})

test('claim errors before/after persistence and failed settlement never leak rejected or allow SQL retry',async()=>{
 const {phases}=await data(),p=phases[0]
 for(const mode of ['loadError','claimBefore','claimAfter','settleBefore','settleAfter']) {
  const j=journal({[mode]:true});let writes=0
  const store={read:async()=>decodeTables(p.initial),compareAndSwap:async()=>{writes++;return true}}
  const f=createSyncCommitFence(store,j,{reconcile:async()=>{throw new Error('must not reconcile known result')}},contract)
  assert.equal(await promote(f,p),'quarantined');assert.equal(writes,mode.startsWith('settle')?1:0)
  if(['claimAfter','settleBefore'].includes(mode)){assert.ok(j.active);assert.equal(await promote(f,p),'quarantined');assert.equal(writes,mode==='settleBefore'?1:0)}
 }
})

test('confirmed not-committed error safely clears intent; generic Store error is conservatively fenced',async()=>{
 const {phases}=await data(),p=phases[0]
 for(const mode of ['confirmed','generic','settle']) {
  const j=journal({settleBefore:mode==='settle'}),store={read:async()=>decodeTables(p.initial),compareAndSwap:async()=>{throw mode==='generic'?new Error('PRIVATE exception'):new PrivateTransactionError('statement_failed','not_committed')}}
  const f=createSyncCommitFence(store,j,{reconcile:async()=>{throw new Error('PRIVATE witness unavailable')}},contract)
  assert.equal(await promote(f,p),mode==='confirmed'?'rejected':'quarantined')
  assert.equal(Boolean(j.active),mode!=='confirmed')
 }
})

test('witness malformed/missing/regressed data and query failure cannot release global fence',async()=>{
 const {phases}=await data(),p=phases[0],i=await intent(p)
 for(const mode of ['auditAbsent','acceptanceAbsent','badAudit','badReview','query','budget']) {
  const t=clone(p.tables)
  if(mode==='auditAbsent')t.sync_audit=[]
  if(mode==='acceptanceAbsent')t.sync_acceptance=[]
  if(mode==='badAudit')t.sync_audit[0].revision=3
  if(mode==='badReview')t.sync_acceptance[0].candidate_hash='0'.repeat(64)
  const pool=protocolPool(t,{beforeQuery:s=>{if(mode==='query'&&s.text.startsWith('with '))throw new Error('PRIVATE read')}}),j=journal();await j.claim(i)
  const f=createSyncCommitFence({},j,createPostgresCommitWitness(kernel(pool),{maxRows:4,maxBytes:mode==='budget'?1:65536}),contract)
  assert.equal((await f.recover()).status,'quarantined');assert.ok(j.active);assert.equal(j.receipts.length,0)
 }
 const regressed=clone(p.initial),later=await intent(phases[1]),j=journal();await j.claim(later)
 const f=createSyncCommitFence({},j,createPostgresCommitWitness(kernel(protocolPool(regressed)),{maxRows:4,maxBytes:65536}),contract)
 assert.equal((await f.recover()).status,'quarantined');assert.ok(j.active)
})

test('full immutable acceptance fields participate; valid competing review/validity cannot prove own commit',async()=>{
 const {phases}=await data(),p=phases[0],i=await intent(p)
 for(const [field,value] of [['reviewer_ref','other-reviewer'],['reviewed_at','2026-10-07T00:02:30Z'],['promoted_at','2026-10-07T00:03:30Z'],['valid_until','2026-10-08T00:00:00Z'],['catalog_version','different-version'],['normalization_version','different-normalizer']]) {
  const t=clone(p.tables);t.sync_acceptance[0][field]=value
  const w=createPostgresCommitWitness(kernel(protocolPool(t)),{maxRows:4,maxBytes:65536})
  assert.equal(await w.reconcile(i),'conflict',field)
 }
})

test('pending journal and local concurrent operation block every source; restarted controller can recover only',async()=>{
 const {phases}=await data(),p=phases[0],j=journal();let finish,writes=0
 const wait=new Promise(resolve=>{finish=resolve}),store={read:async()=>{await wait;return decodeTables(p.initial)},compareAndSwap:async()=>{writes++;return true}}
 const f=createSyncCommitFence(store,j,{reconcile:async()=> 'committed'},contract),running=promote(f,p)
 assert.equal(await f.failure('K01','2026-10-07T01:00:00Z'),'quarantined')
 assert.equal((await f.recover()).status,'quarantined');finish();assert.equal(await running,'promoted');assert.equal(writes,1)
 await j.claim(await intent(p));const restarted=createSyncCommitFence(store,j,{reconcile:async()=> 'committed'},contract)
 assert.equal(await restarted.failure('K01','2026-10-07T01:00:00Z'),'quarantined');assert.equal(writes,1)
 assert.equal((await restarted.recover()).status,'committed');assert.equal(writes,1)
})

test('intent codec preserves only bounded exact fields and rejects tampering/extra/private payloads',async()=>{
 const {phases}=await data(),good=await intent(phases[0]);assert.deepEqual(decodeSyncCommitIntent(JSON.parse(JSON.stringify(good))),good)
 for(const change of [i=>i.version=2,i=>i.id='-'.repeat(36),i=>i.revision=0,i=>i.sourceId='unknown',i=>i.stateDigest='bad',i=>i.success='recorded',i=>i.acceptance.candidate_hash='0'.repeat(64),i=>i.acceptance.reviewed_at='2026-10-07T00:03:00.0000001Z',i=>i.audit.extra='PRIVATE',i=>i.extra='PRIVATE',i=>i.acceptance.reviewer_ref='x'.repeat(32768)]) {
  const i=clone(good);change(i);assert.throws(()=>decodeSyncCommitIntent(i))
 }
 const original=clone(good);const decoded=decodeSyncCommitIntent(original);original.acceptance.reviewer_ref='mutated';assert.deepEqual(decoded,good)
 const j=journal();await j.claim({...good,extra:'PRIVATE'});const f=createSyncCommitFence({},j,{reconcile:async()=> 'committed'},contract)
 assert.deepEqual(await f.recover(),{status:'quarantined',intentId:null});assert.ok(j.active)
})

test('failure absence and competing promotion can settle safely, but invalid CAS result keeps intent',async()=>{
 const {phases}=await data(),p=phases[3],i=await intent(p)
 assert.equal(await createPostgresCommitWitness(kernel(protocolPool(p.initial)),{maxRows:4,maxBytes:65536}).reconcile(i),'not_committed')
 const j=journal(),store={read:async()=>decodeTables(p.initial,p.sourceId),compareAndSwap:async()=> 'invalid boolean'}
 const f=createSyncCommitFence(store,j,{reconcile:async()=>{throw new Error('must not clear malformed CAS')}},contract)
 assert.equal(await execute(f,p),'quarantined');assert.ok(j.active)
 const promotion=phases[0],t=clone(promotion.tables),promotedIntent=await intent(promotion)
 t.sync_audit[0].source_id='K01';t.sync_acceptance[0].source_id='K01'
 assert.equal(await createPostgresCommitWitness(kernel(protocolPool(t)),{maxRows:4,maxBytes:65536}).reconcile(promotedIntent),'conflict')
})

test('malformed journal claim/settle acknowledgements fail closed before SQL or outward success',async()=>{
 const {phases}=await data(),p=phases[0]
 for(const ack of [undefined,'true',1,{},false]) {
  let writes=0;const j=journal();j.claim=async()=>ack
  const f=createSyncCommitFence({read:async()=>decodeTables(p.initial),compareAndSwap:async()=>{writes++;return true}},j,{},contract)
  assert.equal(await promote(f,p),'quarantined');assert.equal(writes,0)
 }
 const j=journal();j.settle=async()=>false
 const f=createSyncCommitFence({read:async()=>decodeTables(p.initial),compareAndSwap:async()=>true},j,{},contract)
 assert.equal(await promote(f,p),'quarantined');assert.ok(j.active)
})

test('restart/generic error cannot clear absence while original pre-BEGIN worker might dispatch later',async()=>{
 const {phases}=await data(),p=phases[0],j=journal();await j.claim(await intent(p))
 const witness=createPostgresCommitWitness(kernel(protocolPool(p.initial)),{maxRows:4,maxBytes:65536})
 const restarted=createSyncCommitFence({},j,witness,contract)
 assert.equal((await restarted.recover()).status,'quarantined');assert.ok(j.active);assert.equal(j.receipts.length,0)
 let writes=0;const other=createSyncCommitFence({read:async()=>decodeTables(p.initial),compareAndSwap:async()=>{writes++;return true}},j,witness,contract)
 assert.equal(await promote(other,p),'quarantined');assert.equal(writes,0)
 const pending=journal(),generic=createSyncCommitFence({read:async()=>decodeTables(p.initial),compareAndSwap:async()=>{throw new Error('PRIVATE generic unknown dispatch')}},pending,witness,contract)
 assert.equal(await promote(generic,p),'quarantined');assert.ok(pending.active);assert.equal(pending.receipts.length,0)
})
