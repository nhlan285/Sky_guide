import { writeFileSync } from 'node:fs'
import process from 'node:process'
import { catalogColumns } from '../../src/server/catalogRows.ts'
import { prepareCanonicalPayloadWrite } from '../../src/server/canonicalPayloadWrite.ts'
import { encodeReleaseRows,releaseColumns } from '../../src/server/releaseRows.ts'
import { encodeProjectionRows,projectionColumns } from '../../src/server/projectionRows.ts'
import { payloadWriteFixture,writeLimits } from '../fixtures/canonicalPayloadWrite.mjs'
import { contract } from '../fixtures/syncReadFrame.mjs'
const scalar=v=>v===null?'null':typeof v==='boolean'?v?'true':'false':typeof v==='number'?String(v):`'${v.replaceAll("'","''")}'`
// Test-only rendering of actual production bind statements, synthetic values
// only. Callback replacement is one pass: literal $1 inside a value stays literal.
const render=s=>s.text.replace(/\$(\d+)/g,(_all,n)=>scalar(s.values[Number(n)-1]))+';'
const insert=(columns,rows)=>Object.entries(columns).filter(([t])=>rows[t].length).map(([t,cols])=>`insert into sky_private.${t}(${cols.join(',')}) values ${rows[t].map(r=>`(${cols.map(c=>scalar(r[c])).join(',')})`).join(',')};`).join('\n')
const select=(t,cols,where='')=>`coalesce((select jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text) from(select ${cols.join(',')} from sky_private.${t} ${where}) r),'[]'::jsonb)`
const group=(columns,filter=()=> '')=>`jsonb_build_object(${Object.entries(columns).map(([t,cols])=>`'${t}',${select(t,cols,filter(t))}`).join(',')})`
const canonical=group(catalogColumns,t=>['domain_identity','identity_provenance'].includes(t)?"where kind in('item','spirit','season')":'')
const reservation=group({domain_identity:catalogColumns.domain_identity,identity_provenance:catalogColumns.identity_provenance,source_crosswalk:['source_id','kind','source_key','target_id'],alias:['kind','from_id','target_identity_id','target_alias_id'],tombstone:['kind','id','retired_at','replacement_id']})
const frame=`jsonb_build_object('catalog',${canonical},'reservations',${reservation})`
const {f,current,candidate}=await payloadWriteFixture(),write=await prepareCanonicalPayloadWrite(candidate,contract,current,writeLimits),parts=['begin;',"set local statement_timeout='30s';","set local standard_conforming_strings=on;",insert(catalogColumns,f.catalog),
 insert(releaseColumns,encodeReleaseRows(f.snapshot,f.publicCatalog)),insert({release_projection_file:projectionColumns.release_projection_file,release_projection:projectionColumns.release_projection},encodeProjectionRows(f.snapshot,'2026-10-07T00:02:30Z')),
 'set constraints all immediate;select revision from sky_private.sync_generation where singleton=1 for update;set constraints all deferred;']
const sql=write.statements.map(render)
for(const end of [Math.floor(sql.length/2),sql.length]) parts.push(`do $rollback_test$ declare before_frame jsonb;after_frame jsonb;begin
 select ${frame} into before_frame;
 begin ${sql.slice(0,end).join('\n')} ${end===sql.length?'set constraints all immediate;':''}
 raise exception 'Injected canonical write failure' using errcode='P0999';
 exception when sqlstate 'P0999' then null;end;
 select ${frame} into after_frame;
 if before_frame is distinct from after_frame then raise exception 'Canonical fragment rollback leaked writes';end if;
end;$rollback_test$;`)
parts.push(...sql,'set constraints all immediate;')
// Deliberate repeat of the same canonical fragment is idempotent. This does not
// prove stale-review CAS handling; complete SyncStore must gate writes first.
const repeat=await prepareCanonicalPayloadWrite(candidate,contract,{payload:write.plan.payload,graph:candidate.identities},writeLimits)
parts.push('set constraints all deferred;',...repeat.statements.map(render),'set constraints all immediate;','set constraints all deferred;',
 insert(releaseColumns,write.plan.release),insert({release_projection_file:projectionColumns.release_projection_file,release_projection:projectionColumns.release_projection},encodeProjectionRows(candidate.publicFiles,'2026-10-07T00:03:30Z')),'set constraints all immediate;',
 `select jsonb_build_object('rollback_cases',2,'catalog',${canonical},'reservations',${reservation},'oldProjection',${group(projectionColumns,()=>"where catalog_version='fixture-release'")},'nextProjection',${group(projectionColumns,()=>"where catalog_version='fixture-release-next'")},'control', (select to_jsonb(r) from sky_private.sync_generation r)) as rows;`,'rollback;')
if(!process.argv[2]) throw new Error('Provide output outside Git')
writeFileSync(process.argv[2],parts.join('\n'),'utf8')
process.stdout.write(`Actual prepared canonical writer SQL; two injected rollback cases/repeat/history; ${parts.join('\n').length} bytes\n`)
