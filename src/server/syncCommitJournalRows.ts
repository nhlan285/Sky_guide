import { Buffer } from 'node:buffer'
import { SOURCE_IDS,validateDateTime } from '../data/core/index.ts'
import { rangeErrors } from '../data/catalog/shared.ts'
import type { CatalogRow } from './catalogRows.ts'
import { commitProposalColumns } from './syncCommitProposalRows.ts'
import { validCommitAcceptance } from './syncCommitIntent.ts'

// Separate vocabulary: do not silently expand the installed79-owner ACL package.
export const commitJournalColumns={...commitProposalColumns,sync_commit_intent:[...commitProposalColumns.sync_commit_intent,'target_revision']} as const
export const commitUuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v)
export const commitDigest=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)
const fail=():never=>{throw new Error('Invalid private v2 journal row')}
const natural=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0
const instant=(v:unknown):v is string=>typeof v==='string'&&validateDateTime(v).valid
const before=(a:string,b:string)=>!rangeErrors({value:a,precision:'instant',timezone:null,rawLabel:null},{value:b,precision:'instant',timezone:null,rawLabel:null},[]).length
export function decodeCommitJournalRow(table:keyof typeof commitJournalColumns,input:unknown):CatalogRow {
 if(!input||typeof input!=='object'||Array.isArray(input))return fail()
 const row=input as CatalogRow,columns:readonly string[]=commitJournalColumns[table]
 if(Object.keys(row).length!==columns.length||columns.some(k=>!Object.hasOwn(row,k))
  ||Object.values(row).some(v=>v!==null&&typeof v!=='string'&&!(typeof v==='number'&&Number.isFinite(v)))
  ||Buffer.byteLength(JSON.stringify(row))>32768)return fail()
 if(table==='sync_commit_control') {
  if(row.singleton!==1||row.active_intent_id!==null&&!commitUuid(row.active_intent_id))return fail()
 }else if(table==='sync_commit_receipt') {
  if(!commitUuid(row.intent_id)||!['committed','not_committed','conflict'].includes(String(row.resolution)))return fail()
 }else if(table==='sync_commit_applied') {
  if(!commitUuid(row.intent_id)||!natural(row.revision)||row.revision===0||!commitDigest(row.state_digest))return fail()
 }else {
  if(!commitUuid(row.id)||row.format_version!==2||!SOURCE_IDS.some(s=>s===row.source_id)
   ||!natural(row.expected_revision)||row.expected_revision>=Number.MAX_SAFE_INTEGER||row.target_revision!==row.expected_revision+1
   ||!commitDigest(row.state_digest)||!['promoted','reconfirmed','failure'].includes(String(row.outcome))
   ||!instant(row.attempt_completed_at)||!natural(row.next_failures))return fail()
  for(const field of ['next_retry_at','next_success_at','next_valid_until'])if(row[field]!==null&&!instant(row[field]))return fail()
  if((row.next_health===null)!==(row.next_success_at===null)||row.next_success_at===null&&row.next_valid_until!==null
   ||row.next_retry_at!==null&&(row.next_failures===0||!before(row.attempt_completed_at,row.next_retry_at as string))
   ||row.next_valid_until!==null&&!before(row.next_success_at as string,row.next_valid_until as string)
   ||(row.outcome==='failure'?row.next_failures===0||row.next_health!==null&&row.next_health!=='offline':
    row.next_failures!==0||row.next_retry_at!==null||row.next_health!=='healthy'))return fail()
  const fields=commitProposalColumns.sync_commit_intent.filter(k=>k.startsWith('global_')&&k!=='global_valid_until')
  if(row.global_source_id===null) {
   if(fields.some(k=>row[k]!==null)||row.global_valid_until!==null||row.outcome!=='failure')return fail()
  }else {
   if(!natural(row.global_base_revision)||row.global_base_revision>row.expected_revision)return fail()
   const revision=row.global_base_revision+1,a:CatalogRow={revision,...Object.fromEntries([...fields,'global_valid_until'].map(k=>[k.slice(7),row[k]]))}
   if(!validCommitAcceptance(a,{revision,source_id:row.global_source_id,attempt_completed_at:row.global_fetched_at}))return fail()
   if(row.outcome!=='failure'&&(row.global_source_id!==row.source_id||row.global_base_revision!==row.expected_revision
    ||row.global_fetched_at!==row.attempt_completed_at||row.global_promoted_at!==row.next_success_at||row.global_valid_until!==row.next_valid_until))return fail()
  }
 }
 return structuredClone(row)
}
