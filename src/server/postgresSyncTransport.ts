import { Buffer } from 'node:buffer'
import type { CatalogRow, SqlScalar } from './catalogRows.ts'
import type { SqlStatement } from './canonicalPayloadWrite.ts'
import { privateSyncColumns } from './postgresSyncRows.ts'
import type { SqlReadLimits } from './postgresSyncRows.ts'
import { commitJournalColumns,commitUuid } from './syncCommitJournalRows.ts'

export interface PrivateReadTransport {
  readonly statement:SqlStatement
  readonly columns:readonly string[]
  readonly limits:Readonly<SqlReadLimits>
  readonly uuidColumns:readonly string[]
}
// Future driver: rowMode:'array', text format, per-query identity type parsers.
// Never use the SDK's default bigint/Date/JSON conversions for this boundary.
export interface PrivateTextResult {
  fields:readonly {name:string;dataTypeID:number;format:'text'|'binary'}[]
  rows:readonly (readonly (string|null)[])[]
}
const guards=['__sg_budget_ok','__sg_present'] as const
const fail=():never=>{throw new Error('Invalid or over-budget private SQL transport')}
const scalar=(v:unknown):v is SqlScalar=>v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v)
const readColumns={...privateSyncColumns,...commitJournalColumns}

// Only the SELECT grammar emitted by privateSyncReader; not a general SQL API.
// The original limited SELECT is MATERIALIZED once, including its FOR UPDATE.
// Aggregate byte accounting completes before any payload column may be returned.
export function preparePrivateReadTransport(input:SqlStatement,inputLimits:SqlReadLimits):PrivateReadTransport {
  const limits={...inputLimits},values=[...input.values]
  if(!Number.isSafeInteger(limits.maxRows)||limits.maxRows<1||limits.maxRows>=Number.MAX_SAFE_INTEGER
    ||!Number.isSafeInteger(limits.maxBytes)||limits.maxBytes<1||values.some(v=>!scalar(v))) return fail()
  const match=/^select ([a-z0-9_,]+) from sky_private\.([a-z0-9_]+)(?: where ([a-z0-9_]+)=\$(\d+)| where revision in\((\$\d+(?:,\$\d+)*)\))? limit \$(\d+)( for update)?$/.exec(input.text)
  if(!match||!Object.hasOwn(readColumns,match[2])) return fail()
  const columns:readonly string[]=readColumns[match[2] as keyof typeof readColumns]
  if(match[1]!==columns.join(',')||match[3]&&!columns.includes(match[3])||match[5]&&!columns.includes('revision')) return fail()
  const parameters=[...input.text.matchAll(/\$(\d+)/g)].map(m=>Number(m[1]))
  if(parameters.length!==values.length||parameters.some((p,i)=>p!==i+1)
    ||!Number.isSafeInteger(values.at(-1))||(values.at(-1) as number)<1||(values.at(-1) as number)>limits.maxRows) return fail()
  // DataRow: message type+length+field count =7,4 length bytes per field,
  // original ::text UTF-8 bytes, plus two bool guard fields (5 each). Bool
  // ::text is longer than wire t/f, so the SQL guard is conservative for bools.
  const rowBytes=`${17+4*columns.length}+${columns.map(c=>`coalesce(octet_length(${c}::text),0)`).join('+')}`
  const text=`with __sg_rows as materialized (${input.text}),
__sg_budget as materialized (select count(*)<=$${values.length+1} and coalesce(sum(${rowBytes}),0)<=$${values.length+2} as ok from __sg_rows)
select ${columns.map(c=>`case when b.ok then r.${c} else null end as ${c}`).join(',')},b.ok as ${guards[0]},r.__sg_present is true as ${guards[1]}
from __sg_budget b left join (select __sg_rows.*,true as __sg_present from __sg_rows) r on b.ok`
  return Object.freeze({statement:Object.freeze({text,values:Object.freeze([...values,limits.maxRows,limits.maxBytes])}),
    columns:Object.freeze([...columns]),limits:Object.freeze(limits),uuidColumns:Object.freeze(Object.hasOwn(commitJournalColumns,match[2])?columns.filter(c=>['id','intent_id','active_intent_id'].includes(c)):[])})
}

function decodeScalar(raw:string|null,oid:number,uuid=false):SqlScalar {
  // Validate OID even for NULL: unsupported types cannot silently enter frames.
  if(![16,20,21,23,25,701,1043].includes(oid)&&!(uuid&&oid===2950)) return fail()
  if(uuid&&![2950,25,1043].includes(oid))return fail()
  if(raw===null) return null
  if(typeof raw!=='string') return fail()
  if(uuid)return commitUuid(raw)&&(oid===2950||oid===25||oid===1043)?raw:fail()
  if(oid===25||oid===1043) return raw
  if(oid===16) return raw==='t'?true:raw==='f'?false:fail()
  if(oid===701) {
    if(!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)) return fail()
    const value=Number(raw)
    return Number.isFinite(value)&&(value!==0||/^-?0+(?:\.0*)?$/.test(raw.split(/[eE]/)[0]))?value:fail()
  }
  if(!/^-?(?:0|[1-9]\d*)$/.test(raw)) return fail()
  const value=Number(raw),bound=oid===21?32767:oid===23?2147483647:Number.MAX_SAFE_INTEGER
  return Number.isSafeInteger(value)&&value<=bound&&value>=-(bound+(oid===20?0:1))?value:fail()
}

export function decodePrivateReadTransport(plan:PrivateReadTransport,result:PrivateTextResult):CatalogRow[] {
  const names=[...plan.columns,...guards]
  if(!result||!Array.isArray(result.fields)||!Array.isArray(result.rows)||result.rows.length<1
    ||result.rows.length>Math.max(1,plan.limits.maxRows)||result.fields.length!==names.length
    ||result.fields.some((f,i)=>!f||f.name!==names[i]||f.format!=='text')
    ||result.fields.slice(-2).some(f=>f.dataTypeID!==16)) return fail()
  let bytes=0
  const rows:CatalogRow[]=[]
  for(const row of result.rows) {
    if(!Array.isArray(row)||row.length!==names.length||row.some(v=>v!==null&&typeof v!=='string')) return fail()
    if(row.at(-2)!=='t') return fail()
    if(row.at(-1)==='f') {
      if(result.rows.length!==1||row.slice(0,-2).some(v=>v!==null)) return fail()
      // Empty result is a fixed, all-NULL guard row, outside payload budget.
      plan.columns.forEach((c,i)=>decodeScalar(null,result.fields[i].dataTypeID,plan.uuidColumns.includes(c)))
      return []
    }
    if(row.at(-1)!=='t') return fail()
    bytes+=7+4*row.length+row.reduce((sum,v)=>sum+(v===null?0:Buffer.byteLength(v)),0)
    if(bytes>plan.limits.maxBytes) return fail()
    rows.push(Object.fromEntries(plan.columns.map((c,i)=>[c,decodeScalar(row[i],result.fields[i].dataTypeID,plan.uuidColumns.includes(c))])))
  }
  return rows
}
