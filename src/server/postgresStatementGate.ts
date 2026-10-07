import { Buffer } from 'node:buffer'
import type { SqlStatement } from './canonicalPayloadWrite.ts'
import { preparePrivateReadTransport } from './postgresSyncTransport.ts'
import type { PrivateReadTransport } from './postgresSyncTransport.ts'
import type { SqlReadLimits } from './postgresSyncRows.ts'
import { runtimeTablePrivileges } from './runtimePrivilegePlan.ts'
import type { RuntimeTablePrivilege } from './runtimePrivilegePlan.ts'
import { commitProposalColumns } from './syncCommitProposalRows.ts'
import { commitUuid,commitDigest,decodeCommitJournalRow } from './syncCommitJournalRows.ts'

export type PrivateStatement={kind:'read';transport:PrivateReadTransport}|{kind:'cas'|'INSERT'|'UPDATE'|'DELETE'|'SET';statement:SqlStatement}
const privileges=new Map<string,RuntimeTablePrivilege>(runtimeTablePrivileges().map(p=>[p.table,p]))
const fail=():never=>{throw new Error('Invalid private callback SQL')}
const names=(s:string)=>s.split(',')
const slots='\\$[1-9][0-9]*',list=`${slots}(?:,${slots})*`
const insertPattern=new RegExp(`^insert into sky_private\\.([a-z_0-9]+)\\(([a-z_0-9,]+)\\) values ?(\\(${list}\\)(?:,\\(${list}\\))*)(?: on conflict\\(([a-z_0-9,]+)\\) (do nothing|do update set ([a-z_0-9=.,]+)))?$`)
const deletePattern=new RegExp(`^delete from sky_private\\.([a-z_0-9]+) where (?:([a-z_0-9]+) in\\(${list}\\)(?: and kind=${slots})?|\\(kind,id\\) in\\(\\(${slots},${slots}\\)(?:,\\(${slots},${slots}\\))*\\))$`)
const keys:Record<string,readonly string[]>={source_registry:['id'],provenance:['id'],domain_identity:['kind','id'],item:['id'],spirit:['id'],season:['id'],item_k15:['id'],provenance_order:['provenance_id'],
 source_crosswalk:['source_id','kind','source_key'],alias:['kind','from_id'],tombstone:['kind','id']}
function checkInput(statement:SqlStatement,maxBytes:number) {
 let bytes=Buffer.byteLength(statement.text)
 for(const value of statement.values) bytes+=4+(value===null?0:Buffer.byteLength(String(value)))
 if(bytes>maxBytes||statement.values.length>65535) return fail()
}

// Finite grammar emitted by Store/canonical writer, not a user SQL API.
export function gatePrivateStatement(input:SqlStatement,limits:SqlReadLimits,readOnly:boolean,maxInputBytes:number):PrivateStatement {
 if(!input||typeof input.text!=='string'||!Array.isArray(input.values)||!Number.isSafeInteger(maxInputBytes)||maxInputBytes<1
  ||!Number.isSafeInteger(limits.maxRows)||limits.maxRows<1||limits.maxRows>=Number.MAX_SAFE_INTEGER
  ||!Number.isSafeInteger(limits.maxBytes)||limits.maxBytes<1) return fail()
 for(const value of input.values) {
  if(value!==null&&typeof value!=='string'&&typeof value!=='boolean'&&!(typeof value==='number'&&Number.isFinite(value))) return fail()
 }
 checkInput(input,maxInputBytes)
 if(input.text.includes('\0')||/[;'"]|--|\/\*/.test(input.text)) return fail()
 const statement={text:input.text,values:[...input.values]},parameters=[...input.text.matchAll(/\$(\d+)/g)].map(m=>Number(m[1]))
 if(parameters.length!==input.values.length||parameters.some((n,i)=>n!==i+1)) return fail()
 if(input.text.startsWith('select ')&&!input.text.startsWith('select sky_private.')) {
  if(readOnly&&input.text.endsWith(' for update')) return fail()
  const transport=preparePrivateReadTransport(statement,limits)
  checkInput(transport.statement,maxInputBytes)
  return {kind:'read',transport}
 }
 if(readOnly) return fail()
 if(input.text==='select sky_private.apply_sync_metadata_cas($1,$2,$3,$4,$5,$6) as applied') {
  if(input.values.length!==6) return fail()
  return {kind:'cas',statement}
 }
 if(/^select sky_private\.(activate_sync_commit_intent\(\$1\)|(?:require_sync_commit_intent|apply_sync_commit_cas|settle_sync_commit_intent)\(\$1,\$2\)) as applied$/.test(input.text)) {
  if(!commitUuid(input.values[0]))return fail()
  if(input.text.includes('settle_sync_commit_intent')) {
   if(!['committed','not_committed','conflict'].includes(String(input.values[1])))return fail()
  }else if(input.values.length===2&&!commitDigest(input.values[1]))return fail()
  return {kind:'cas',statement}
 }
 if(/^set constraints all (deferred|immediate)$/.test(input.text)&&!input.values.length) return {kind:'SET',statement}
 const insert=insertPattern.exec(input.text)
 if(insert) {
  if(insert[1]==='sync_commit_intent') {
   const columns=commitProposalColumns.sync_commit_intent
   if(insert[2]!==columns.join(',')||insert[3]!==`(${columns.map((_,i)=>`$${i+1}`).join(',')})`||insert[4]||input.values.length!==columns.length)return fail()
   decodeCommitJournalRow('sync_commit_intent',{...Object.fromEntries(columns.map((c,i)=>[c,input.values[i]])),target_revision:(input.values[3] as number)+1})
   return {kind:'INSERT',statement}
  }
  const p=privileges.get(insert[1]),columns=names(insert[2])
  if(!p||!columns.length||new Set(columns).size!==columns.length||columns.some(c=>!p.insert.includes(c))
   ||[...insert[3].matchAll(/\(([^)]+)\)/g)].some(m=>names(m[1]).length!==columns.length)) return fail()
  if(insert[4]&&JSON.stringify(names(insert[4]))!==JSON.stringify(keys[insert[1]])) return fail()
  if(insert[6]) {
   const assigned=names(insert[6]).map(s=>/^([a-z_0-9]+)=excluded\.([a-z_0-9]+)$/.exec(s))
   if(p.lockOnly||assigned.some(a=>!a||a[1]!==a[2]||!p.update.includes(a[1])||!columns.includes(a[1]))
    ||new Set(assigned.map(a=>a![1])).size!==assigned.length) return fail()
  }
  return {kind:'INSERT',statement}
 }
 const update=/^update sky_private\.([a-z_0-9]+) set position=position\+\$1$/.exec(input.text)
 if(update) {
  const p=privileges.get(update[1])
  if(!p||p.lockOnly||!p.update.includes('position')||input.values.length!==1||!Number.isSafeInteger(input.values[0])||(input.values[0] as number)<1) return fail()
  return {kind:'UPDATE',statement}
 }
 const del=deletePattern.exec(input.text)
 if(del) {
  const p=privileges.get(del[1])
  const table=del[1],field=del[2],proof=['payload_provenance','field_provenance','field_provenance_field'].includes(table)
  const owner=table.startsWith('spirit_')?'spirit_id':table.startsWith('season_')?'season_id':'item_id'
  if(!p?.delete||table==='identity_provenance'&&field||!field&&table!=='identity_provenance'
   ||field&&(field!==(proof?'id':owner)||proof!==input.text.includes(' and kind='))) return fail()
  return {kind:'DELETE',statement}
 }
 return fail()
}
