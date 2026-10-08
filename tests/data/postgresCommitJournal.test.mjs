import assert from 'node:assert/strict'
import test from 'node:test'
import { Buffer } from 'node:buffer'
import { createPostgresIntentSyncStore } from '../../src/server/postgresSyncStore.ts'
import { createPostgresCommitJournal } from '../../src/server/postgresCommitJournal.ts'
import { createPostgresTransactionKernel } from '../../src/server/postgresTransactionKernel.ts'
import { createSyncCommitJournalFence } from '../../src/server/syncCommitJournalFence.ts'
import { commitJournalColumns,decodeCommitJournalRow } from '../../src/server/syncCommitJournalRows.ts'
import { prepareSyncCommitProposalRow,commitProposalColumns } from '../../src/server/syncCommitProposalRows.ts'
import { gatePrivateStatement } from '../../src/server/postgresStatementGate.ts'
import { preparePrivateReadTransport,decodePrivateReadTransport } from '../../src/server/postgresSyncTransport.ts'
import { privateSyncColumns } from '../../src/server/postgresSyncRows.ts'
import { postgresSyncSequence } from '../fixtures/postgresSyncSequence.mjs'
import { decodeTables,storeOptions,contract,empty,expectedFailure } from '../fixtures/postgresSyncStore.mjs'
import { journalPool } from '../fixtures/postgresJournalPort.mjs'
import { kernelLimits } from '../fixtures/postgresProtocolPort.mjs'

const clone=globalThis.structuredClone,id='12345678-1234-4123-8123-123456789abc',id2='12345678-1234-4123-8123-123456789abd'
let sequence
const data=async()=>sequence??=await postgresSyncSequence()
function setup(initial,settings={}) {
 const pool=journalPool(initial,settings),db=createPostgresTransactionKernel(pool,kernelLimits)
 const store=createPostgresIntentSyncStore(db,contract,storeOptions),journal=createPostgresCommitJournal(db,storeOptions.readLimits)
 return {pool,db,store,journal,fence:createSyncCommitJournalFence(store,journal,contract)}
}
const callback=l=>l.queries.filter(s=>!s.text.startsWith('begin ')&&!s.text.startsWith('set local ')&&!['commit','rollback'].includes(s.text))
const original=s=>s.text.startsWith('with __sg_rows')?s.text.slice('with __sg_rows as materialized ('.length,s.text.indexOf('),\n__sg_budget')):s.text
const canonicalDml=l=>callback(l).filter(s=>/^(insert|update|delete) /.test(s.text)&&!s.text.includes('sync_commit_intent'))
async function row(p) {
 const r=prepareSyncCommitProposalRow(p.sourceId,await decodeTables(p.initial,p.sourceId),p.next,id,p.initial.sync_acceptance.find(a=>a.revision===p.initial.sync_generation[0].current_acceptance_revision)??null)
 return {...r,target_revision:p.expected+1}
}

test('v2 five-phase claim/execution/settlement are separate commits with token second, full state and failure witnesses',async()=>{
 const {initial,phases}=await data(),f=setup(initial,{nextTables:r=>phases.find(p=>p.next.revision===r)?.tables})
 assert.equal(f.store.compareAndSwap,undefined)
 for(const [n,p] of phases.entries()) {
  const intent=await f.store.claim(p.sourceId,p.expected,p.next,n===0?id:`12345678-1234-4123-8123-123456789ab${n}`)
  assert.ok(intent);assert.equal(f.pool.tables.sync_generation[0].revision,p.expected)
  const claim=f.pool.leases.at(-1);assert.equal(canonicalDml(claim).length,0)
  assert.match(original(callback(claim)[0]),/sync_generation.+for update$/)
  assert.match(original(callback(claim)[1]),/sync_commit_control.+for update$/)
  assert.deepEqual(await f.journal.load(),intent)
  assert.equal(await f.store.execute(intent,p.next),true)
  const execution=f.pool.leases.at(-1),queries=callback(execution)
  assert.match(original(queries[0]),/sync_generation.+for update$/)
  assert.equal(queries[1].text,'select sky_private.require_sync_commit_intent($1,$2) as applied')
  assert.ok(!queries.some(s=>s.text.includes('apply_sync_metadata_cas')))
  assert.ok(queries.find(s=>s.text.includes('apply_sync_commit_cas')))
  assert.deepEqual(await f.store.read(p.sourceId),p.next)
  assert.equal(await f.journal.resolve(intent.id),'committed')
  assert.equal(await f.journal.load(),null)
  assert.equal(await f.journal.receipt(intent.id),'committed')
  assert.equal(await f.journal.resolve(intent.id),'committed')
 }
 assert.equal(f.pool.tables.sync_commit_applied.length,5)
 // Immutable complete failure markers remain useful after a successor promotion.
 for(const i of f.pool.tables.sync_commit_intent.filter(i=>i.outcome==='failure'))assert.equal(await f.journal.resolve(i.id),'committed')
})

test('active claim blocks every source; stale claim and false activation cannot commit orphan intent',async()=>{
 const {initial,phases}=await data(),p=phases[0],f=setup(initial)
 assert.equal(await f.store.claim(p.sourceId,1,p.next,id),null)
 assert.equal(f.pool.tables.sync_commit_intent.length,0)
 const i=await f.store.claim(p.sourceId,0,p.next,id)
 assert.ok(i);assert.equal(await f.store.claim('K01',0,await expectedFailure(empty(),'K01','2026-10-07T00:08:00Z'),id2),null)
 assert.equal(f.pool.tables.sync_commit_intent.length,1)
 const denied=setup(initial,{activateFalse:true})
 await assert.rejects(()=>denied.store.claim(p.sourceId,0,p.next,id))
 assert.equal(denied.pool.tables.sync_commit_intent.length,0)
 assert.equal(denied.pool.tables.sync_commit_control[0].active_intent_id,null)
 assert.ok(denied.pool.leases[0].queries.some(s=>s.text==='rollback'))
})

test('restart absence recovery invalidates token atomically; late worker and forged token emit zero canonical DML',async()=>{
 const {initial,phases}=await data(),p=phases[0],f=setup(initial,{nextTables:()=>p.tables})
 const i=await f.store.claim(p.sourceId,0,p.next,id)
 const restarted=createSyncCommitJournalFence(f.store,createPostgresCommitJournal(f.db,storeOptions.readLimits),contract)
 assert.deepEqual(await restarted.recover(),{status:'not_committed',intentId:id})
 await assert.rejects(()=>f.store.execute(i,p.next))
 assert.equal(canonicalDml(f.pool.leases.at(-1)).length,0)
 assert.equal(callback(f.pool.leases.at(-1)).length,2)
 assert.deepEqual(await restarted.recover(id),{status:'not_committed',intentId:id})
 const g=setup(initial,{nextTables:()=>p.tables}),j=await g.store.claim(p.sourceId,0,p.next,id)
 for(const patch of [{state_digest:'0'.repeat(64)},{id:id2}]) {
  await assert.rejects(()=>g.store.execute({...j,...patch},p.next))
  assert.equal(canonicalDml(g.pool.leases.at(-1)).length,0)
 }
})

test('full desired row and business replay reject substituted next before canonical staging or mutations',async()=>{
 const {initial,phases}=await data(),p=phases[0],f=setup(initial,{nextTables:()=>p.tables})
 const i=await f.store.claim(p.sourceId,0,p.next,id)
 for(const change of [n=>n.approval.reviewerRef='forged',n=>n.lastKnownGood.publicFiles.files.set('items.json','forged'),n=>n.failures=9]) {
  const next=clone(p.next);change(next)
  await assert.rejects(()=>f.store.execute(i,next));assert.equal(canonicalDml(f.pool.leases.at(-1)).length,0)
 }
 // Changing typed desired fields without changing token/digest also fails.
 await assert.rejects(()=>f.store.execute({...i,global_reviewer_ref:'substituted'},p.next))
 assert.equal(canonicalDml(f.pool.leases.at(-1)).length,0)
 assert.equal(await f.journal.resolve(id),'not_committed')
})

test('failure proof uses immutable applied marker; audit alone or malformed marker stays unresolved',async()=>{
 const {phases}=await data(),p=phases[2]
 for(const mutate of [l=>l.local.sync_commit_applied=[],l=>l.local.sync_commit_applied[0].state_digest='0'.repeat(64),l=>l.local.sync_commit_applied[0].revision++]) {
  const f=setup(p.initial,{nextTables:()=>p.tables,afterQuery:async(s,_signal,l,r)=>{if(s.text.includes('apply_sync_commit_cas'))mutate(l);return r}})
  const i=await f.store.claim(p.sourceId,p.expected,p.next,id)
  assert.equal(await f.store.execute(i,p.next),true)
  await assert.rejects(()=>f.journal.resolve(id));assert.equal(await f.journal.receipt(id),null)
 }
})

test('lost execution COMMIT acknowledgement reconciles promoted and complete independent-source failure',async()=>{
 const {phases}=await data()
 for(const p of [phases[0],phases[2]]) {
  const f=setup(p.initial,{nextTables:()=>p.tables,afterQuery:async(s,_signal,l,r)=>{
   if(s.text==='commit'&&l.queries.some(q=>q.text.includes('apply_sync_commit_cas')))throw new Error('ACK lost')
   return r
  }})
  const result=p.next.failures?await f.fence.failure(p.sourceId,p.next.lastAttemptAt,storeOptions.now):
   await f.fence.promote(p.next.lastKnownGood,p.next.approval,{validUntil:p.next.freshness.validUntil,now:()=>Date.parse(p.next.lastPromotedAt)})
  assert.equal(result,p.next.failures?'recorded':'promoted')
  assert.equal(f.pool.tables.sync_commit_receipt[0].resolution,'committed')
  assert.equal(await f.journal.load(),null)
  assert.deepEqual(await f.store.read(p.sourceId),p.next)
  assert.ok(f.pool.leases.some(l=>l.discarded))
 }
})

test('outward v2 boundary preserves every five-phase SourceSync result and has no follow-up failure or retries',async()=>{
 const {initial,phases}=await data(),f=setup(initial,{nextTables:r=>phases.find(p=>p.next.revision===r)?.tables})
 for(const [n,p] of phases.entries()) {
  const result=p.next.failures?await f.fence.failure(p.sourceId,p.next.lastAttemptAt,storeOptions.now):
   await f.fence.promote(p.next.lastKnownGood,p.next.approval,{validUntil:p.next.freshness.validUntil,now:()=>Date.parse(p.next.lastPromotedAt)})
  assert.equal(result,p.next.failures?'recorded':n===4?'unchanged':'promoted')
  assert.deepEqual(await f.store.read(p.sourceId),p.next)
 }
 assert.equal(f.pool.tables.sync_commit_intent.length,5)
 assert.equal(f.pool.tables.sync_audit.length,5)
})

test('denied token/deferred/post-read errors roll back applied marker and resolve absence without source-failure retry',async()=>{
 const {initial,phases}=await data(),p=phases[0]
 for(const settings of [{requireFalse:true},{afterQuery:async(s,_signal,l,r)=>{
  if(s.text==='set constraints all immediate'&&l.queries.some(q=>q.text.includes('apply_sync_commit_cas')))throw new Error('Deferred failure')
  return r
 }},{nextTables:()=>initial}]) {
  const f=setup(initial,{nextTables:()=>p.tables,...settings})
  assert.equal(await f.fence.promote(p.next.lastKnownGood,p.next.approval,{validUntil:null,now:()=>Date.parse(p.next.lastPromotedAt)}),'rejected')
  assert.equal(f.pool.tables.sync_generation[0].revision,0)
  assert.equal(f.pool.tables.sync_audit.length,0);assert.equal(f.pool.tables.sync_commit_applied.length,0)
  assert.equal(f.pool.tables.sync_commit_intent.length,1)
  assert.equal(f.pool.tables.sync_commit_receipt[0].resolution,'not_committed')
 }
})

test('malformed journal terminal result cannot escape as successful recovery',async()=>{
 const store={read:async()=>empty(),claim:async()=>null,execute:async()=>false}
 for(const terminal of [['committed'],{},undefined,true,'unknown']) {
  const fence=createSyncCommitJournalFence(store,{load:async()=>null,receipt:async()=>terminal,resolve:async()=>terminal},contract)
  assert.deepEqual(await fence.recover(id),{status:'quarantined',intentId:id})
 }
})

test('lost settlement COMMIT acknowledgement stays quarantined then terminal ID lookup resolves exact receipt',async()=>{
 const {initial,phases}=await data(),p=phases[0],f=setup(initial,{nextTables:()=>p.tables,afterQuery:async(s,_signal,l,r)=>{
  if(s.text==='commit'&&l.queries.some(q=>q.text.includes('settle_sync_commit_intent')))throw new Error('ACK lost')
  return r
 }})
 assert.equal(await f.fence.promote(p.next.lastKnownGood,p.next.approval,{now:()=>Date.parse(p.next.lastPromotedAt),validUntil:null}),'quarantined')
 const terminal=f.pool.tables.sync_commit_receipt[0]
 const leases=f.pool.leases.length
 assert.equal(await f.fence.failure('K01','2026-10-07T00:08:00Z',storeOptions.now),'quarantined')
 assert.equal(f.pool.leases.length,leases)
 assert.deepEqual(await f.fence.recover(),{status:'committed',intentId:terminal.intent_id})
 assert.equal(f.pool.tables.sync_commit_intent.length,1)
})

test('lost claim acknowledgement never dispatches canonical writer; restart settles pending claim without retry',async()=>{
 const {initial,phases}=await data(),p=phases[0],f=setup(initial,{nextTables:()=>p.tables,afterQuery:async(s,_signal,l,r)=>{
  if(s.text==='commit'&&l.queries.some(q=>q.text.includes('activate_sync_commit_intent')))throw new Error('ACK lost')
  return r
 }})
 assert.equal(await f.fence.promote(p.next.lastKnownGood,p.next.approval,{now:()=>Date.parse(p.next.lastPromotedAt),validUntil:null}),'quarantined')
 assert.ok(!f.pool.leases.some(l=>l.queries.some(s=>s.text.includes('require_sync_commit_intent'))))
 const i=f.pool.tables.sync_commit_intent[0]
 assert.deepEqual(await f.fence.recover(),{status:'not_committed',intentId:i.id})
 assert.equal(f.pool.tables.sync_generation[0].revision,0)
})

test('typed row codec rejects incompatible clocks, null/global tuples, UUID/version/bytes and generated target drift',async()=>{
 const {phases}=await data(),r=await row(phases[0])
 assert.deepEqual(decodeCommitJournalRow('sync_commit_intent',r),r)
 for(const patch of [{target_revision:2},{format_version:1},{id:'unbounded'},{global_source_id:null},{global_candidate_hash:'0'.repeat(64)},
  {next_health:null},{next_failures:1},{next_valid_until:'2025-01-01T00:00:00Z'},{next_retry_at:r.attempt_completed_at},
  {global_reviewer_ref:'x'.repeat(32768)},{extra:'private'}])assert.throws(()=>decodeCommitJournalRow('sync_commit_intent',{...r,...patch}))
 for(const [table,bad] of [['sync_commit_control',{singleton:1,active_intent_id:'bad'}],['sync_commit_applied',{intent_id:id,revision:0,state_digest:r.state_digest}],['sync_commit_receipt',{intent_id:id,resolution:'unknown'}]])assert.throws(()=>decodeCommitJournalRow(table,bad))
})

test('closed gate accepts only explicit journal insert/helper vocabulary; no receipt/control/raw SQL escape',async()=>{
 const {phases}=await data(),r=await row(phases[0]),limits=storeOptions.readLimits,columns=commitProposalColumns.sync_commit_intent
 const insert={text:`insert into sky_private.sync_commit_intent(${columns.join(',')}) values(${columns.map((_,i)=>`$${i+1}`).join(',')})`,values:columns.map(c=>r[c])}
 assert.equal(gatePrivateStatement(insert,limits,false,32768).kind,'INSERT')
 const helper={text:'select sky_private.require_sync_commit_intent($1,$2) as applied',values:[id,r.state_digest]}
 assert.equal(gatePrivateStatement(helper,limits,false,32768).kind,'cas')
 for(const s of [insert,helper])assert.throws(()=>gatePrivateStatement(s,limits,true,32768))
 for(const s of [{...helper,values:['bad',r.state_digest]},{...helper,values:[id,'bad']},{...helper,text:helper.text.replace('require_sync_commit_intent','lock_sync_commit_control')},
  {...insert,text:insert.text+' on conflict(id) do nothing'},{text:'insert into sky_private.sync_commit_receipt(intent_id,resolution) values($1,$2)',values:[id,'committed']},
  {text:'update sky_private.sync_commit_control set active_intent_id=$1',values:[id]},
  {text:'select sky_private.settle_sync_commit_intent($1,$2) as applied',values:[id,'unknown']}])assert.throws(()=>gatePrivateStatement(s,limits,false,32768))
 assert.throws(()=>gatePrivateStatement(insert,limits,false,Buffer.byteLength(insert.text)))
 // Original79-owner privilege vocabulary remains unchanged.
 assert.equal(Object.keys(privateSyncColumns).length,79)
})

test('bounded journal SELECT preserves UUID OID/text and generated revision; overflow/malformed UUID cannot enter frame',async()=>{
 const {phases}=await data(),r=await row(phases[0]),columns=commitJournalColumns.sync_commit_intent
 const s={text:`select ${columns.join(',')} from sky_private.sync_commit_intent where id=$1 limit $2`,values:[id,2]}
 const p=preparePrivateReadTransport(s,{maxRows:2,maxBytes:32768})
 const result={fields:[...columns.map(name=>({name,dataTypeID:name==='id'?2950:typeof r[name]==='number'?20:25,format:'text'})),
  ...['__sg_budget_ok','__sg_present'].map(name=>({name,dataTypeID:16,format:'text'}))],rows:[[...columns.map(c=>r[c]===null?null:String(r[c])),'t','t']]}
 assert.deepEqual(decodePrivateReadTransport(p,result),[r])
 const bad=clone(result);bad.rows[0][0]=id.toUpperCase();assert.throws(()=>decodePrivateReadTransport(p,bad))
 const overflow=clone(result);overflow.rows[0][columns.length]='f';assert.throws(()=>decodePrivateReadTransport(p,overflow))
 const wrong=clone(result);wrong.fields[1].dataTypeID=2950;assert.throws(()=>decodePrivateReadTransport(p,wrong))
 const emptyResult=clone(result);emptyResult.rows=[[...columns.map(()=>null),'t','f']]
 assert.deepEqual(decodePrivateReadTransport(p,emptyResult),[])
 const badNull=clone(emptyResult);badNull.fields[0].dataTypeID=23;assert.throws(()=>decodePrivateReadTransport(p,badNull))
 const small=preparePrivateReadTransport(s,{maxRows:2,maxBytes:1});assert.throws(()=>decodePrivateReadTransport(small,result))
})
