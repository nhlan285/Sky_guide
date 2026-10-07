import { writeFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { createPostgresSyncStore } from '../../src/server/postgresSyncStore.ts'
import { privateSyncColumns } from '../../src/server/postgresSyncRows.ts'
import { postgresSyncSequence } from '../fixtures/postgresSyncSequence.mjs'
import { scriptedDatabase,storeOptions,contract } from '../fixtures/postgresSyncStore.mjs'
const scalar=v=>v===null?'null':typeof v==='boolean'?v?'true':'false':typeof v==='number'?String(v):`'${v.replaceAll("'","''")}'`
const render=s=>s.text.replace(/\$(\d+)/g,(_all,n)=>scalar(s.values[Number(n)-1]))
const parts=['begin;',"set local statement_timeout='30s';","set local standard_conforming_strings=on;"]
const {initial,phases}=await postgresSyncSequence()
for(const t of ['source_registry','provenance','provenance_order']) parts.push(`insert into sky_private.${t}(${privateSyncColumns[t].join(',')}) values ${initial[t].map(r=>`(${privateSyncColumns[t].map(c=>scalar(r[c])).join(',')})`).join(',')};`)
const select=(t,cols)=>`coalesce((select jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text) from(select ${cols.join(',')} from sky_private.${t}) r),'[]'::jsonb)`
const entries=Object.entries(privateSyncColumns),groups=[entries.slice(0,40),entries.slice(40)]
const all=groups.map(g=>`jsonb_build_object(${g.map(([t,cols])=>`'${t}',${select(t,cols)}`).join(',')})`).join('||')
let readChecks=0
const compile=(tx,wrongCas=false,injectDeferred=false)=>'do $store_step$ declare actual_rows jsonb;expected_rows jsonb;begin\n'+tx.queries.map((s,i)=>{
 const query=globalThis.structuredClone(s)
 if(wrongCas&&query.text.includes('apply_sync_metadata_cas')) query.values[1]++
 if(query.text.startsWith('select ')) {
  if(!wrongCas&&!injectDeferred) readChecks++
  const expected=scalar(JSON.stringify(tx.responses[i]))
  if(!tx.responses[i].length) return `if exists(${render(query)}) then raise exception 'Native empty query ${i} returned rows' using errcode='P0999';end if;`
  return `
   select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) into actual_rows from(${render(query)}) r;
   select coalesce(jsonb_agg(r order by r::text),'[]'::jsonb) into expected_rows from jsonb_array_elements(${expected}::jsonb) r;
   if actual_rows is distinct from expected_rows then raise exception 'Native Store query ${i} differs from validated expected frame' using errcode='P0999';end if;
  `
 }
 if(injectDeferred&&query.text==='set constraints all immediate') return `insert into sky_private.public_release(catalog_version,schema_version,generated_at,asset_manifest_version,source_present,import_report_present,aliases_path,aliases_data_version,aliases_sha256,tombstones_path,tombstones_data_version,tombstones_sha256) values('fixture-injected-incomplete',1,'2026-10-07T00:00:00Z',null,false,false,null,null,null,null,null,null);${render(query)};`
 return render(query)+';'
}).join('\n')+'\nend;$store_step$;'
for(const [index,p] of phases.entries()) {
 const db=scriptedDatabase(p.initial,{nextTables:p.tables}),store=createPostgresSyncStore(db,contract,storeOptions)
 if(!await store.compareAndSwap(p.sourceId,p.expected,p.next)) throw new Error('Fixture transition conflict')
 const tx=db.transactions[0]
 if(index===0) for(const [wrong,deferred,code] of [[true,false,'P0999'],[false,true,'23514']]) parts.push(`do $rollback_check$ declare before_frame jsonb;after_frame jsonb;begin
  select ${all} into before_frame;
  begin ${compile(tx,wrong,deferred)} raise exception 'Injected failure was not detected';
  exception when sqlstate '${code}' then null;end;
  select ${all} into after_frame;
  if before_frame is distinct from after_frame then raise exception 'Whole publication rollback leaked state';end if;
 end;$rollback_check$;`)
 parts.push(compile(tx))
 // Verify actual SQL selected-source reads for BOTH sources, rather than assume
 // global LKG belongs to that source's last successful publication.
 for(const sourceId of ['K15','K01']) {
  const reads=scriptedDatabase(p.tables),reader=createPostgresSyncStore(reads,contract,storeOptions)
  await reader.read(sourceId);parts.push(compile(reads.transactions[0]))
 }
}
parts.push(`select jsonb_build_object('rollback_cases',2,'phases',5,'query_checks',${readChecks},'tables',${all}) as rows;`,'rollback;')
const sql=parts.join('\n');if(Buffer.byteLength(sql)>1_000_000) throw new Error(`Native synthetic rehearsal byte limit exceeded: ${Buffer.byteLength(sql)} bytes/${readChecks} positive query checks`)
if(!process.argv[2]) throw new Error('Provide output outside Git')
writeFileSync(process.argv[2],sql,'utf8')
process.stdout.write(`Full portable Store actual SQL transcript: 5 phases/2 rollback cases/${readChecks} query assertions; ${Buffer.byteLength(sql)} bytes\n`)
