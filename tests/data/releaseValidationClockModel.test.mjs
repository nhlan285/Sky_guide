import assert from 'node:assert/strict'
import test from 'node:test'
import { ReleaseValidationClockModel } from '../fixtures/releaseValidationClockModel.mjs'
import { releaseScanCases,referenceReleaseScanFlags } from '../fixtures/releaseMetadataScanCases.mjs'

const clone=globalThis.structuredClone,valid=()=>clone(releaseScanCases()[0].state)
const expected=model=>referenceReleaseScanFlags(model.snapshot().state)

test('predicate cache trace matches128 reference states; repeated events reuse only successful checks',()=>{
 for(const c of releaseScanCases()){
  const m=new ReleaseValidationClockModel(valid())
  for(let event=0;event<100;event++)assert.deepEqual(m.validate(),expected(m))
  assert.equal(m.fullScans,1)
  m.statement('release_lookup',s=>Object.assign(s,clone(c.state)))
  assert.deepEqual(m.validate(),referenceReleaseScanFlags(c.state),c.name)
  assert.deepEqual(m.validate(),referenceReleaseScanFlags(c.state),c.name)
  assert.equal(m.fullScans,Object.values(referenceReleaseScanFlags(c.state)).some(Boolean)?3:2,c.name)
 }
})

test('canonical changes after a prior constraint flush invalidate every later metadata event',()=>{
 for(const [table,mutate,flag] of [
  ['domain_identity',s=>s.domain_identity[0].revision++, 'invalid_owner'],
  ['item',s=>s.item[1].record_status='draft','invalid_publication'],
  ['provenance',s=>s.provenance[0].source_url=null,'invalid_provenance'],
 ]){
  const m=new ReleaseValidationClockModel(valid());assert.equal(m.validate()[flag],false)
  m.statement(table,mutate)
  // Metadata-only invalidation would return the previous false flag incorrectly.
  m.statement('release_import_summary',()=>{})
  assert.equal(m.validate()[flag],true,table);assert.deepEqual(m.validate(),expected(m))
  assert.equal(m.snapshot().witness.get('fixture-scan').clock,0n)
 }
})

test('nested savepoints and failed statements restore data/clock/witness together; later invalid write still rejects',()=>{
 const m=new ReleaseValidationClockModel(valid());m.validate();m.savepoint('outer')
 m.statement('release_lookup',s=>s.release_lookup[0].owner_revision=2)
 assert.equal(m.validate().invalid_owner,true)
 m.savepoint('inner');m.statement('release_lookup',s=>s.release_lookup[0].owner_revision=1)
 assert.equal(m.validate().invalid_owner,false)
 m.rollbackTo('inner');assert.equal(m.validate().invalid_owner,true)
 m.rollbackTo('outer');assert.deepEqual(m.validate(),expected(m))
 const before=m.snapshot()
 assert.throws(()=>m.statement('item',s=>{s.item[0].record_status='draft';throw new Error('statement failed')}))
 assert.deepEqual(m.snapshot(),before);assert.deepEqual(m.validate(),expected(m))
 m.statement('release_source_path',s=>s.release_source_path[1].position=5)
 assert.equal(m.validate().invalid_order,true)
 assert.throws(()=>m.statement('release_validation_witness',()=>{}),/outside reviewed83/)
 // This last assertion describes required ownership; it is not native ACL proof.
})

test('witness is scoped by release and transaction, including a snapshot changed by another transaction',()=>{
 const m=new ReleaseValidationClockModel(valid());m.validate();m.validate('other-release');assert.equal(m.fullScans,2)
 m.validate();assert.equal(m.fullScans,2)
 const changed=valid();changed.domain_identity[0].fixture=true
 m.nextTransaction(2n,changed)
 assert.equal(m.validate().invalid_owner,true);assert.equal(m.fullScans,3)
 assert.throws(()=>m.nextTransaction(2n),/Distinct transaction identity/)
})

test('counterexample rejects BEFORE-statement-only design: a callable helper can claim before the last row mutation',()=>{
 const m=new ReleaseValidationClockModel(valid());m.validate()
 m.statement('release_lookup',s=>{
  // A row expression or trigger can call an EXECUTE-granted helper while the
  // current statement is still modifying rows. The epoch is already advanced.
  assert.equal(m.validate().invalid_owner,false)
  s.release_lookup[0].owner_revision=2
 })
 assert.equal(expected(m).invalid_owner,true)
 assert.equal(m.validate().invalid_owner,false)
 assert.notDeepEqual(m.validate(),expected(m))
 // This intentionally demonstrates unsound acceptance, not a passing design.
 // Require actual row-level invalidation or an unforgeable final-state mechanism.
})
