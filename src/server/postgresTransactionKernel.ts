import { performance } from 'node:perf_hooks'
import { setTimeout,clearTimeout } from 'node:timers'
import type { SqlStatement } from './canonicalPayloadWrite.ts'
import type { CatalogRow } from './catalogRows.ts'
import type { SqlConnection,SqlDatabase } from './postgresSyncRows.ts'
import type { PrivateTextResult } from './postgresSyncTransport.ts'
import { decodePrivateReadTransport } from './postgresSyncTransport.ts'
import { gatePrivateStatement } from './postgresStatementGate.ts'

export type TransactionStatus='I'|'T'|'E'
export interface PrivateProtocolResult extends PrivateTextResult {command:string;status:TransactionStatus}
export interface PrivateProtocolLease {
 // Stable physical client identity; discard removes reuse/new dispatch even if
 // abort/remote cleanup isn't acknowledged. SDK adapter must enforce this port.
 key:object;query(statement:SqlStatement,signal:AbortSignal):Promise<PrivateProtocolResult>
 release():void;discard():void
}
// Acquisition must exclusively own the physical client until release/discard.
// Disposal must prevent queued/late work from using that client again.
export interface PrivateProtocolPool {acquire(signal:AbortSignal):Promise<PrivateProtocolLease>}
export interface TransactionKernelLimits {
 connectMs:number;statementMs:number;lockMs:number;idleMs:number;transactionMs:number;cleanupMs:number;maxInputBytes:number
}
export type TransactionOutcome='not_committed'|'indeterminate'
const errorCodes=new Set(['invalid_limits','invalid_options','invalid_dispatch','acquire_timeout','invalid_lease','begin_response','configuration_response',
 'statement_timeout','callback_closed_or_busy','statement_state','read_response','cas_response','write_response','statement_failed',
 'transaction_timeout','callback_incomplete','commit_timeout','commit_rejected','commit_response','commit_failed','rollback_timeout','commit_indeterminate','transaction_failed'])
export class PrivateTransactionError extends Error {
 readonly code:string;readonly outcome:TransactionOutcome;readonly sqlState:string|null
 constructor(code:string,outcome:TransactionOutcome,sqlState:string|null=null) {
  const safeCode=errorCodes.has(code)?code:'transaction_failed'
  super('Private transaction '+safeCode);this.name='PrivateTransactionError';this.code=safeCode;this.outcome=outcome==='indeterminate'?'indeterminate':'not_committed';this.sqlState=sqlState!==null&&/^[0-9A-Z]{5}$/.test(sqlState)?sqlState:null
 }
}
// Only the adapter may attest actual ErrorResponse+ReadyForQuery, not a network
// error/stale cached client status. No private message/detail/cause retained.
export class ConfirmedSqlRejection extends Error {
 readonly sqlState:string;readonly status:'I'|'E'
 constructor(sqlState:string,status:'I'|'E') {
  super('Confirmed private SQL rejection');this.name='ConfirmedSqlRejection'
  if(!/^[0-9A-Z]{5}$/.test(sqlState)||!['I','E'].includes(status)) throw new Error('Invalid SQL rejection attestation')
  this.sqlState=sqlState;this.status=status
 }
}
const failure=(code:string,outcome:TransactionOutcome='not_committed',raw?:unknown)=>new PrivateTransactionError(code,outcome,raw instanceof ConfirmedSqlRejection?raw.sqlState:null)
const validEmpty=(r:PrivateProtocolResult,command:string,status:TransactionStatus)=>r&&r.command===command&&r.status===status&&Array.isArray(r.rows)&&!r.rows.length&&Array.isArray(r.fields)&&!r.fields.length

// No SDK/pool/credential creation. A future transport implements acknowledged text
// protocol, synchronous safe lease disposal and abort semantics; no implicit retry.
export function createPostgresTransactionKernel(pool:PrivateProtocolPool,input:TransactionKernelLimits):SqlDatabase {
 const limits={...input},poisoned=new WeakSet<object>()
 for(const [key,value] of Object.entries(limits)) if(!Number.isSafeInteger(value)||value<1||value>(key==='maxInputBytes'?Number.MAX_SAFE_INTEGER:2147483647)) throw failure('invalid_limits')
 if(Object.keys(limits).length!==7||['connectMs','statementMs','lockMs','idleMs','transactionMs','cleanupMs','maxInputBytes'].some(k=>!Object.hasOwn(limits,k))) throw failure('invalid_limits')
 const discard=(lease:PrivateProtocolLease)=>{if(lease.key&&typeof lease.key==='object')poisoned.add(lease.key);try{lease.discard()}catch{/* No secret/provider message or unsafe release fallback. */}}
 const release=(lease:PrivateProtocolLease)=>{try{lease.release()}catch{discard(lease)}}
 return {transaction:async<T>(options:Parameters<SqlDatabase['transaction']>[0],work:(connection:SqlConnection)=>Promise<T>):Promise<T>=>{
  if(!options||!['read committed','repeatable read'].includes(options.isolation)||typeof options.readOnly!=='boolean'||typeof work!=='function') throw failure('invalid_options')
  const tx={isolation:options.isolation,readOnly:options.readOnly}
  let lease:PrivateProtocolLease|null=null,inFlight=false,closed=false,tainted=false,discarded=false,state:TransactionStatus|null=null
  let commitSent=false,committed=false,deadline=0
  const evict=()=>{if(lease&&!discarded){discarded=true;discard(lease)}}
  const bounded=async<R>(run:(signal:AbortSignal)=>Promise<R>,expires:number,code:string):Promise<R>=>{
   const remaining=Math.ceil(expires-performance.now())
   if(remaining<1) throw failure(code,commitSent&&!committed?'indeterminate':'not_committed')
   const controller=new AbortController()
   let timer:ReturnType<typeof setTimeout>|undefined
   const pending=Promise.resolve().then(()=>{
    if(performance.now()>=expires) {controller.abort();throw failure(code,commitSent&&!committed?'indeterminate':'not_committed')}
    return run(controller.signal)
   })
   try {
    const value=await Promise.race([pending,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(failure(code,commitSent&&!committed?'indeterminate':'not_committed'))},remaining)})])
    if(performance.now()>=expires) {controller.abort();throw failure(code,commitSent&&!committed?'indeterminate':'not_committed')}
    return value
   }finally{if(timer!==undefined)clearTimeout(timer)}
  }
  const query=async(statement:SqlStatement,expires:number,code='statement_timeout',committing=false)=>{
   if(!lease||inFlight||discarded) throw failure('invalid_dispatch',commitSent?'indeterminate':'not_committed')
   inFlight=true
   try {const result=await bounded(signal=>{if(committing)commitSent=true;return lease!.query(statement,signal)},expires,code);state=result.status;return result}
   catch(error){if(error instanceof ConfirmedSqlRejection) state=error.status;else {state=null;evict()}throw error}
   finally{inFlight=false}
  }
  try {
   const acquireDeadline=performance.now()+limits.connectMs
   lease=await bounded(signal=>pool.acquire(signal).then(client=>{
    if(signal.aborted||performance.now()>=acquireDeadline){discard(client);throw failure('acquire_timeout')}
    return client
   }),acquireDeadline,'acquire_timeout')
   if(!lease||!lease.key||typeof lease.key!=='object'||poisoned.has(lease.key)) {evict();throw failure('invalid_lease')}
   deadline=performance.now()+limits.transactionMs
   const begin=await query({text:`begin isolation level ${tx.isolation} ${tx.readOnly?'read only':'read write'}`,values:[]},Math.min(deadline,performance.now()+limits.statementMs))
   if(!validEmpty(begin,'BEGIN','T')) {evict();throw failure('begin_response')}
   for(const [name,ms] of [['statement_timeout',limits.statementMs],['lock_timeout',limits.lockMs],['idle_in_transaction_session_timeout',limits.idleMs]] as const) {
    const r=await query({text:`set local ${name}='${ms}ms'`,values:[]},Math.min(deadline,performance.now()+limits.statementMs))
    if(!validEmpty(r,'SET','T')) {evict();throw failure('configuration_response')}
   }
   const connection:SqlConnection={query:async(statement,readLimits)=>{
    if(closed||tainted||inFlight) {tainted=true;throw failure('callback_closed_or_busy')}
    try {
     const plan=gatePrivateStatement(statement,readLimits,tx.readOnly,limits.maxInputBytes)
     const r=await query(plan.kind==='read'?plan.transport.statement:plan.statement,Math.min(deadline,performance.now()+limits.statementMs))
     if(r.status!=='T') {evict();throw failure('statement_state')}
     if(plan.kind==='read') {
      if(r.command!=='SELECT') throw failure('read_response')
      return decodePrivateReadTransport(plan.transport,r)
     }
     if(plan.kind==='cas') {
      if(r.command!=='SELECT'||r.rows.length!==1||r.fields.length!==1||r.fields[0].name!=='applied'||r.fields[0].dataTypeID!==16||r.fields[0].format!=='text'
       ||r.rows[0].length!==1||!['t','f'].includes(r.rows[0][0] as string)||readLimits.maxBytes<12) throw failure('cas_response')
      return [{applied:r.rows[0][0]==='t'}] as CatalogRow[]
     }
     if(!validEmpty(r,plan.kind,'T')) throw failure('write_response')
     return []
    }catch(error){tainted=true;throw error instanceof PrivateTransactionError?error:failure('statement_failed','not_committed',error)}
   }}
   let value:T
   try {value=await bounded(()=>Promise.resolve().then(()=>work(connection)),deadline,'transaction_timeout')}
   finally{closed=true}
   if(tainted||inFlight||discarded) {if(inFlight)evict();throw failure('callback_incomplete')}
   if(performance.now()>=deadline) throw failure('transaction_timeout')
   try {
    const ack=await query({text:'commit',values:[]},Math.min(deadline,performance.now()+limits.statementMs),'commit_timeout',true)
    if(validEmpty(ack,'ROLLBACK','I')) {commitSent=false;throw failure('commit_rejected')}
    if(!validEmpty(ack,'COMMIT','I')) {evict();throw failure('commit_response','indeterminate')}
    committed=true;return value
   }catch(error){
    if(error instanceof ConfirmedSqlRejection) {commitSent=false;throw failure('commit_rejected','not_committed',error)}
    throw error instanceof PrivateTransactionError?error:failure('commit_failed',commitSent?'indeterminate':'not_committed')
   }
  }catch(error){
   closed=true
   if(inFlight)evict()
   const uncertain=commitSent&&!committed
   if(lease&&!discarded&&state!==null&&state!=='I') {
    try {const ack=await query({text:'rollback',values:[]},performance.now()+limits.cleanupMs,'rollback_timeout');if(!validEmpty(ack,'ROLLBACK','I'))evict()}
    catch{evict()}
   }
   if(uncertain) {evict();throw failure('commit_indeterminate','indeterminate',error)}
   throw error instanceof PrivateTransactionError?new PrivateTransactionError(error.code,'not_committed',error.sqlState):failure('transaction_failed','not_committed',error)
  }finally {
   closed=true
   if(lease&&!discarded) {if(committed||state==='I')release(lease);else evict()}
  }
 }}
}
