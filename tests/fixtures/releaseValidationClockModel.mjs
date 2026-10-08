import { runtimeJournalPrivilegeBaseline } from '../../src/server/runtimeJournalPrivilegeBaseline.ts'
import { referenceReleaseScanFlags } from './releaseMetadataScanCases.mjs'

// Planning/counterexample model ONLY. BEFORE-statement-only clock is UNSAFE if
// a callable helper validates midway through a statement, before later row writes.
// No SQL execution, native ACL/locking/trigger/header proof.
// Mutation/transaction/savepoint methods stand for database-controlled operations;
// a future caller cannot supply a validated epoch or edit internal owner records.
const tables=new Set(runtimeJournalPrivilegeBaseline.tables.map(t=>t.name))
const clone=globalThis.structuredClone
export class ReleaseValidationClockModel {
 #state;#clock=0n;#tx;#witness=new Map();#points=[];#scans=0;#depth=0;#bracket
 constructor(state,tx=1n,{bracket=false}={}){this.#state=clone(state);this.#tx=tx;this.#bracket=bracket}
 get fullScans(){return this.#scans}
 snapshot(){return clone({state:this.#state,clock:this.#clock,tx:this.#tx,witness:this.#witness,depth:this.#depth})}
 #restore(s){this.#state=clone(s.state);this.#clock=s.clock;this.#tx=s.tx;this.#witness=clone(s.witness);this.#depth=s.depth}
 #advance(){if(this.#clock===9223372036854775807n)throw new Error('Validation clock overflow');this.#clock++}
 statement(table,mutate){
  if(!tables.has(table))throw new Error('Mutation is outside reviewed83 owners')
  const before=this.snapshot()
  try{
   this.#advance() // Even a zero-row write conservatively invalidates.
   if(this.#bracket)this.#depth++
   mutate(this.#state)
   if(this.#bracket){if(this.#depth<=0)throw new Error('Unbalanced write bracket');this.#advance();this.#depth--}
  }catch(error){this.#restore(before);throw error}
 }
 savepoint(name){this.#points.push({name,state:this.snapshot()})}
 rollbackTo(name){
  const i=this.#points.findLastIndex(p=>p.name===name)
  if(i<0)throw new Error('Unknown savepoint')
  this.#restore(this.#points[i].state);this.#points.length=i+1
 }
 nextTransaction(tx,state=this.#state){
  if(this.#depth!==0)throw new Error('Cannot cross transaction boundary while writing')
  if(typeof tx!=='bigint'||tx===this.#tx)throw new Error('Distinct transaction identity required')
  this.#tx=tx;this.#state=clone(state);this.#points=[]
  // Retain witnesses to demonstrate that equal counters in a new transaction miss.
 }
 validate(version='fixture-scan'){
  const witness=this.#witness.get(version)
  const canCache=!this.#bracket||this.#depth===0
  if(canCache&&witness?.tx===this.#tx&&witness.clock===this.#clock)return clone(witness.flags)
  this.#scans++
  const flags=referenceReleaseScanFlags(this.#state)
  if(canCache&&!Object.values(flags).some(Boolean))this.#witness.set(version,{tx:this.#tx,clock:this.#clock,flags:clone(flags)})
  return flags
 }
}
