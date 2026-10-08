import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { performance } from 'node:perf_hooks'
import { createPostgresTransactionKernel,ConfirmedSqlRejection,PrivateTransactionError } from '../../src/server/postgresTransactionKernel.ts'
import { gatePrivateStatement } from '../../src/server/postgresStatementGate.ts'
import { privateSyncReader,privateSyncColumns } from '../../src/server/postgresSyncRows.ts'
import { createPostgresSyncStore } from '../../src/server/postgresSyncStore.ts'
import { postgresSyncSequence } from '../fixtures/postgresSyncSequence.mjs'
import { empty,emptyTables,storeOptions,contract,decodeTables } from '../fixtures/postgresSyncStore.mjs'
import { protocolPool,kernelLimits } from '../fixtures/postgresProtocolPort.mjs'

const readLimits={maxRows:10,maxBytes:4096},rw={isolation:'read committed',readOnly:false},ro={isolation:'repeatable read',readOnly:true}
const registry={text:'select id from sky_private.source_registry limit $1',values:[2]}
const head={text:`select ${privateSyncColumns.sync_generation.join(',')} from sky_private.sync_generation where singleton=$1 limit $2 for update`,values:[1,2]}
const read=async(db,options=ro)=>db.transaction(options,async c=>privateSyncReader(c,readLimits).head())
const failCheck=(error,outcome='not_committed')=>error instanceof PrivateTransactionError&&error.outcome===outcome&&!/PRIVATE|secret/.test(error.message)&&error.cause===undefined

test('one acquired lease owns explicit isolation/configuration/read/COMMIT and idle release',async()=>{
 const pool=protocolPool(),db=createPostgresTransactionKernel(pool,kernelLimits)
 assert.equal((await read(db))[0].revision,0)
 const l=pool.leases[0],sql=l.queries.map(s=>s.text)
 assert.equal(sql[0],'begin isolation level repeatable read read only')
 assert.deepEqual(sql.slice(1,4),["set local statement_timeout='5000ms'","set local lock_timeout='2000ms'","set local idle_in_transaction_session_timeout='10000ms'"])
 assert.ok(sql[4].includes('with __sg_rows as materialized (select singleton,revision'))
 assert.equal(sql.at(-1),'commit');assert.equal(l.released,true);assert.equal(l.discarded,false)
})

test('complete5-phase portable Store runs through lowered text/OID protocol and lifecycle',async()=>{
 const {initial,phases}=await postgresSyncSequence(),next=new Map(phases.map(p=>[p.next.revision,p.tables]))
 const pool=protocolPool(initial,{nextTables:rev=>next.get(rev)}),db=createPostgresTransactionKernel(pool,kernelLimits),store=createPostgresSyncStore(db,contract,storeOptions)
 for(const p of phases) {
  assert.equal(await store.compareAndSwap(p.sourceId,p.expected,p.next),true)
  assert.deepEqual(pool.tables,p.tables)
  assert.deepEqual(await store.read(p.sourceId),p.next)
  assert.deepEqual(await store.read(p.sourceId==='K15'?'K01':'K15'),await decodeTables(p.tables,p.sourceId==='K15'?'K01':'K15'))
 }
 assert.equal(await store.compareAndSwap('K15',0,empty()),false)
 const last=pool.leases.at(-1);assert.equal(last.queries.length,6) //BEGIN,3 local SET,one locked probe,COMMIT.
 assert.ok(last.queries[4].text.includes('for update'))
 assert.ok(pool.leases.every(l=>l.released&&!l.discarded))
})

test('callback/gate/absorbed query/deferred errors roll back; never retry callback or COMMIT',async()=>{
 for(const scenario of ['callback','gate','absorbed','server','deferred']) {
  const pool=protocolPool(undefined,{beforeQuery:s=>{if((scenario==='server'&&s.text.startsWith('with '))||(scenario==='deferred'&&s.text==='set constraints all immediate'))throw new ConfirmedSqlRejection('23514','E')}})
  const db=createPostgresTransactionKernel(pool,kernelLimits);let calls=0
  await assert.rejects(()=>db.transaction(rw,async c=>{
   calls++;if(scenario==='callback')throw new Error('PRIVATE secret callback')
   if(scenario==='gate')return c.query({text:'commit',values:[]},readLimits)
   if(scenario==='absorbed'){try{await c.query({text:'drop schema sky_private',values:[]},readLimits)}catch{/* Deliberately absorb the error to test transaction taint. */}return true}
   if(scenario==='deferred')return c.query({text:'set constraints all immediate',values:[]},readLimits)
   return c.query(registry,readLimits)
  }),e=>failCheck(e))
  assert.equal(calls,1);assert.ok(pool.leases[0].queries.some(s=>s.text==='rollback'));assert.ok(!pool.leases[0].queries.some(s=>s.text==='commit'))
  assert.deepEqual(pool.tables,emptyTables());assert.ok(pool.leases[0].released)
 }
})

test('confirmed commit rejection/ROLLBACK command is not successful commit; lost ACK is indeterminate',async()=>{
 for(const mode of ['server','rollback','lost','bad']) {
  const pool=protocolPool(undefined,{commitRollback:mode==='rollback',
   beforeQuery:s=>{if(mode==='server'&&s.text==='commit')throw new ConfirmedSqlRejection('23514','E')},
   afterQuery:(s,_signal,_lease,r)=>{if(s.text==='commit'){if(mode==='lost')throw new Error('PRIVATE secret lost COMMIT');if(mode==='bad')return {...r,command:'SET'}}return r}})
  const db=createPostgresTransactionKernel(pool,kernelLimits)
  await assert.rejects(()=>read(db,rw),e=>failCheck(e,['lost','bad'].includes(mode)?'indeterminate':'not_committed'))
  const l=pool.leases[0]
  if(['lost','bad'].includes(mode)){assert.ok(l.discarded);assert.ok(!l.released)}else assert.ok(l.released)
 }
})

test('whole publication may already commit before ACK loss; false CAS/corrupt bool rolls back instead',async()=>{
 const {initial,phases}=await postgresSyncSequence(),p=phases[0]
 for(const mode of ['lost','false','corrupt']) {
  const pool=protocolPool(initial,{nextTables:()=>p.tables,casFalse:mode==='false',afterQuery:(s,_sig,_l,r)=>{
   if(mode==='lost'&&s.text==='commit')throw new Error('PRIVATE secret after durable mock commit')
   if(mode==='corrupt'&&s.text.startsWith('select sky_private.apply_sync_metadata_cas('))r.rows[0][0]='true'
   return r
  }})
  const store=createPostgresSyncStore(createPostgresTransactionKernel(pool,kernelLimits),contract,storeOptions)
  await assert.rejects(()=>store.compareAndSwap(p.sourceId,p.expected,p.next),e=>failCheck(e,mode==='lost'?'indeterminate':'not_committed'))
  assert.deepEqual(pool.tables,mode==='lost'?p.tables:initial)
  if(mode!=='lost')assert.ok(pool.leases[0].queries.some(s=>s.text==='rollback'))
 }
})

test('rollback error/bad ACK evicts; accepted commit with bad cleanup never reports failure',async()=>{
 for(const mode of ['error','bad']) {
  const pool=protocolPool(undefined,{afterQuery:(s,_sig,_l,r)=>{
   if(s.text==='rollback'){if(mode==='error')throw new Error('PRIVATE secret rollback');return {...r,status:'T'}}return r
  }})
  await assert.rejects(()=>createPostgresTransactionKernel(pool,kernelLimits).transaction(rw,async()=>{throw new Error('PRIVATE secret body')}),e=>failCheck(e))
  assert.ok(pool.leases[0].discarded);assert.ok(!pool.leases[0].released)
 }
})

test('confirmed COMMIT value survives release failure; discarded physical key cannot be reused',async()=>{
 const pool=protocolPool(undefined,{releaseError:true,discardError:true}),db=createPostgresTransactionKernel(pool,kernelLimits)
 assert.equal(await db.transaction(rw,async()=>42),42)
 const l=pool.leases[0];assert.ok(l.discarded)
 pool.acquire=async()=>l
 await assert.rejects(()=>read(db),e=>failCheck(e))
 assert.equal(l.queries.filter(s=>s.text.startsWith('begin')).length,1)
})

test('malformed begin/configuration/read state/row types evict or roll back without COMMIT',async()=>{
 for(const mode of ['begin','config','state','oid','guard']) {
  const pool=protocolPool(undefined,{afterQuery:(s,_sig,_l,r)=>{
   if(mode==='begin'&&s.text.startsWith('begin'))return {...r,status:'I'}
   if(mode==='config'&&s.text.startsWith('set local'))return {...r,rows:[['unexpected']]}
   if(s.text.startsWith('with ')) {
    if(mode==='state')return {...r,status:'I'}
    if(mode==='oid')r.fields[0].dataTypeID=114
    if(mode==='guard')r.rows[0][r.rows[0].length-2]='f'
   }return r
  }})
  await assert.rejects(()=>read(createPostgresTransactionKernel(pool,kernelLimits)),e=>failCheck(e))
  assert.ok(!pool.leases[0].queries.some(s=>s.text==='commit'))
 }
})

test('input snapshots, readonly mutation/lock, arbitrary/multiple SQL, unsafe DML and byte budgets fail before dispatch',async()=>{
 const invalid=[{text:'begin',values:[]},{text:'select 1',values:[]},{...registry,text:registry.text+';commit'},
  {text:'insert into sky_private.item(id) values($1) returning id',values:['x']},
  {text:'update sky_private.sync_acceptance set position=position+$1',values:[1]},
  {text:'delete from sky_private.item where id in($1)',values:['x']},
  {text:'delete from sky_private.acquisition_cost where currency in($1)',values:['c']},
  {text:'delete from sky_private.payload_provenance where id in($1)',values:['x']},
  {text:'insert into sky_private.source_registry(id) values($1) on conflict(id) do update set id=excluded.id',values:['K15']}]
 for(const s of invalid)assert.throws(()=>gatePrivateStatement(s,readLimits,false,4000000))
 assert.throws(()=>gatePrivateStatement(head,readLimits,true,4000000))
 assert.throws(()=>gatePrivateStatement({text:'insert into sky_private.source_registry(id) values($1)',values:['🎶'.repeat(50)]},readLimits,false,100))
 assert.throws(()=>gatePrivateStatement(registry,readLimits,false,100)) //Lowered SQL budget, not just short original.
 const pool=protocolPool(),db=createPostgresTransactionKernel(pool,kernelLimits),options={...ro}
 await assert.rejects(()=>db.transaction(options,async c=>{options.readOnly=false;return c.query({text:'insert into sky_private.source_registry(id) values($1)',values:['K15']},readLimits)}),e=>failCheck(e))
 assert.equal(pool.leases[0].queries.length,5) //only driver controls and rollback.
})

test('pending background query/overlapping query taints callback and never sends COMMIT',async()=>{
 for(const concurrent of [false,true]) {
  let finish;const pending=new Promise(resolve=>{finish=resolve})
  const pool=protocolPool(undefined,{beforeQuery:s=>s.text.startsWith('with ')?pending:undefined}),db=createPostgresTransactionKernel(pool,kernelLimits)
  await assert.rejects(()=>db.transaction(rw,async c=>{
   c.query(registry,readLimits).catch(()=>{})
   if(concurrent)try{await c.query(registry,readLimits)}catch{/* Deliberately absorb the overlapping query error. */}
   return true
  }),e=>failCheck(e))
  finish();await setTimeout(5)
  assert.ok(pool.leases[0].discarded);assert.ok(!pool.leases[0].queries.some(s=>s.text==='commit'))
 }
})

test('acquisition timeout discards late lease without BEGIN; callback timeout closes escaped connection',async()=>{
 let finish;const wait=new Promise(resolve=>{finish=resolve}),pool=protocolPool(undefined,{afterAcquire:async l=>{await wait;return l}}),db=createPostgresTransactionKernel(pool,{...kernelLimits,connectMs:30})
 await assert.rejects(()=>read(db),e=>failCheck(e))
 finish();await setTimeout(5);assert.ok(pool.leases[0].discarded);assert.equal(pool.leases[0].queries.length,0)
 let conn,done;const waitWork=new Promise(resolve=>{done=resolve}),p=protocolPool(),k=createPostgresTransactionKernel(p,{...kernelLimits,transactionMs:30})
 await assert.rejects(()=>k.transaction(rw,async c=>{conn=c;await waitWork;return true}),e=>failCheck(e))
 done();await setTimeout(5);await assert.rejects(()=>conn.query(registry,readLimits),e=>failCheck(e))
 assert.ok(!p.leases[0].queries.some(s=>s.text==='commit'));assert.ok(p.leases[0].released)
})

test('statement/commit/rollback timeouts abort and discard; late completion cannot change outcome',async()=>{
 for(const mode of ['statement','commit','rollback']) {
  let finish;const wait=new Promise(resolve=>{finish=resolve})
  const pool=protocolPool(undefined,{afterQuery:async(s,_sig,_l,r)=>{if(mode==='statement'&&s.text.startsWith('with ')||s.text===mode)await wait;return r}})
  const db=createPostgresTransactionKernel(pool,{...kernelLimits,statementMs:30,cleanupMs:30})
  const work=mode==='rollback'?()=>db.transaction(rw,async()=>{throw new Error('PRIVATE secret rollback')}):()=>read(db,rw)
  await assert.rejects(work,e=>failCheck(e,mode==='commit'?'indeterminate':'not_committed'))
  finish();await setTimeout(5);assert.ok(pool.leases[0].discarded);assert.ok(pool.leases[0].aborts.length)
 }
})

test('bad settings/invalid attestation/private typed messages are sanitized without leaking detail',async()=>{
 for(const patch of [{connectMs:0},{statementMs:NaN},{transactionMs:2147483648},{maxInputBytes:0},{extra:1}])
  assert.throws(()=>createPostgresTransactionKernel(protocolPool(),{...kernelLimits,...patch}),e=>failCheck(e))
 assert.throws(()=>new ConfirmedSqlRejection('PRIVATE secret','E'))
 const fake=new PrivateTransactionError('PRIVATE secret','indeterminate','PRIVATE secret');fake.message='PRIVATE secret altered'
 await assert.rejects(()=>createPostgresTransactionKernel(protocolPool(),kernelLimits).transaction(rw,async()=>{throw fake}),e=>failCheck(e)&&e.code==='transaction_failed'&&e.sqlState===null)
})

test('synchronous callback overruns are detected before COMMIT dispatch despite delayed timers',async()=>{
 const pool=protocolPool(),db=createPostgresTransactionKernel(pool,{...kernelLimits,transactionMs:30})
 await assert.rejects(()=>db.transaction(rw,async()=>{
  const stop=performance.now()+40
  while(performance.now()<stop){/* Simulate non-preemptible callback CPU work. */}
  return true
 }),e=>failCheck(e)&&e.code==='transaction_timeout')
 assert.ok(!pool.leases[0].queries.some(s=>s.text==='commit'))
 assert.ok(pool.leases[0].released||pool.leases[0].discarded)
})
