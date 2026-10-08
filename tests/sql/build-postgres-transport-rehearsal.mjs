import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import console from 'node:console'
import { privateSyncColumns } from '../../src/server/postgresSyncRows.ts'
import { preparePrivateReadTransport } from '../../src/server/postgresSyncTransport.ts'

const target=process.argv[2]
if(!target) throw new Error('Provide an E-drive fixture.sql output path')
const quote=v=>v===null?'null':typeof v==='string'?"'"+v.replaceAll("'","''")+"'":String(v)
const literal=s=>s.text.replace(/\$(\d+)/g,(_,n)=>quote(s.values[Number(n)-1]))
const select=(table,values=[2],where='',lock=false)=>({
 text:`select ${privateSyncColumns[table].join(',')} from sky_private.${table}${where?' where '+where:''} limit $${values.length}${lock?' for update':''}`,values,
})
let checks=0
const sql=['begin;',"set local client_encoding='UTF8';",`do $check$ begin
if current_setting('server_encoding')<>'UTF8' then raise exception 'UTF8 database required'; end if;
if (select count(*) from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='sky_private' and c.relkind='r' and a.attnum>0 and not a.attisdropped and a.atttypid not in(16,20,21,23,25,701,1043))<>0
then raise exception 'Unsupported private column OID'; end if;
end $check$;`]
function check(s,limits,expected,label) {
 const p=preparePrivateReadTransport(s,limits),q=literal(p.statement)
 const sorted=[...expected].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
 // Compare a multiset through jsonb ORDER BY; source row order is not invented.
 const expectedSql=sorted.length?`(select jsonb_agg(v order by v::text) from jsonb_array_elements(${quote(JSON.stringify(sorted))}::jsonb) v)`:"'[]'::jsonb"
 sql.push(`do $check$ declare frame jsonb; begin
select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) into frame from (${q}) t;
if frame<>${expectedSql} then raise exception ${quote(`Transport assertion failed: ${label}`)}; end if;
end $check$;`)
 checks++
}
const guard=(table,ok,present=false,row={})=>({...Object.fromEntries(privateSyncColumns[table].map(c=>[c,null])),...row,__sg_budget_ok:ok,__sg_present:present})
const head={singleton:1,revision:0,current_acceptance_revision:null,last_promoted_at:null}
for(const table of Object.keys(privateSyncColumns)) check(select(table),{maxRows:2,maxBytes:4096},
 [guard(table,true,table==='sync_generation',table==='sync_generation'?head:{})],`initial-${table}`)
check(select('sync_generation',[1,1],'singleton=$1',true),{maxRows:1,maxBytes:35},[guard('sync_generation',true,true,head)],'locked-head-exact35')
check(select('sync_generation',[1,1],'singleton=$1',true),{maxRows:1,maxBytes:34},[guard('sync_generation',false)],'locked-head-overflow')
sql.push("insert into sky_private.source_registry(id) values('K01'),('K15');")
check(select('source_registry'),{maxRows:2,maxBytes:48},['K01','K15'].map(id=>guard('source_registry',true,true,{id})),'two-row-exact48')
check(select('source_registry'),{maxRows:2,maxBytes:47},[guard('source_registry',false)],'two-row-overflow-no-partial')
check(select('source_registry',['fixture:missing',1],'id=$1'),{maxRows:1,maxBytes:1},[guard('source_registry',true)],'missing-id-fixed-empty')
const proof={id:'fixture:transport-unicode',source_id:'K01',source_url:null,source_record_key:null,source_revision:null,
 retrieved_at:'2026-10-07T00:01:00.000500Z',observed_at:null,attribution:'á 🎶 " \\ \n',license_note:'fixture-only',transform_note:'synthetic transport check',verification_status:'pending'}
sql.push(`insert into sky_private.provenance(${privateSyncColumns.provenance.join(',')}) values(${privateSyncColumns.provenance.map(c=>quote(proof[c])).join(',')});`)
const bytes=17+4*privateSyncColumns.provenance.length+Object.values(proof).reduce((sum,v)=>sum+(v===null?0:Buffer.byteLength(v)),0)
check(select('provenance',['K01',1],'source_id=$1'),{maxRows:1,maxBytes:bytes},[guard('provenance',true,true,proof)],'unicode-exact-byte-boundary')
check(select('provenance',['K01',1],'source_id=$1'),{maxRows:1,maxBytes:bytes-1},[guard('provenance',false)],'unicode-overflow-no-field')
sql.push(`insert into sky_private.provenance(${privateSyncColumns.provenance.join(',')}) values(${privateSyncColumns.provenance.map(c=>c==='id'?quote('fixture:transport-large'):c==='source_id'?quote('K15'):c==='attribution'?"repeat('🎶é',200000)":quote(proof[c])).join(',')});`)
check(select('provenance',['K15',1],'source_id=$1'),{maxRows:1,maxBytes:4096},[guard('provenance',false)],'single1200000-byte-field-hidden')
check(select('sync_acceptance',[0,1,2],'revision in($1,$2)'),{maxRows:2,maxBytes:1},[guard('sync_acceptance',true)],'empty-in-list')
const identity={kind:'cosmetic',id:'fixture:transport-identity',revision:Number.MAX_SAFE_INTEGER,schema_version:1,
 updated_at:'2026-10-07T00:01:00.000500Z',retired_at:null,fixture:true}
sql.push(`insert into sky_private.domain_identity(${privateSyncColumns.domain_identity.join(',')}) values(${privateSyncColumns.domain_identity.map(c=>quote(identity[c])).join(',')});`)
const identityBytes=17+4*privateSyncColumns.domain_identity.length+Object.values(identity).reduce((sum,v)=>sum+(v===null?0:Buffer.byteLength(String(v))),0)
check(select('domain_identity',[identity.id,1],'id=$1'),{maxRows:1,maxBytes:identityBytes},[guard('domain_identity',true,true,identity)],'safe-bigint-fraction-bool-conservative-bound')
check(select('domain_identity',[identity.id,1],'id=$1'),{maxRows:1,maxBytes:identityBytes-1},[guard('domain_identity',false)],'bool-text-conservative-overflow')
sql.push(`rollback;
select jsonb_build_object('checks',${checks},'revision',(select revision from sky_private.sync_generation where singleton=1),
'sources',(select count(*) from sky_private.source_registry),'proofs',(select count(*) from sky_private.provenance),
'noncontrol_rows',(select coalesce(sum(n),0) from (${Object.keys(privateSyncColumns).filter(t=>t!=='sync_generation').map(t=>`select count(*) as n from sky_private.${t}`).join(' union all ')}) counts),
'server_encoding',current_setting('server_encoding')) as transport_rehearsal;`)
const output=sql.join('\n')+'\n'
if(Buffer.byteLength(output)>200000) throw new Error('Native read rehearsal exceeds local size limit')
writeFileSync(target,output)
console.log(JSON.stringify({checks,bytes:Buffer.byteLength(output),sha256:createHash('sha256').update(output).digest('hex')}))
