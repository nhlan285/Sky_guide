import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { stageSourceSnapshot } from '../../src/server/sourceSync.ts'
import { prepareCanonicalPayloadWrite } from '../../src/server/canonicalPayloadWrite.ts'
import { releaseColumns } from '../../src/server/releaseRows.ts'
import { privateSyncColumns } from '../../src/server/postgresSyncRows.ts'
import { canonicalJson } from '../../src/server/domainSnapshot.ts'

// Full checked-in K15, local preparation only. Unlike the tiny adapter fixture,
// this exercises all release membership and identity deferred events. Does not
// measure transport, parallel sessions, history growth or production capacity.
const scalar=v=>v===null?'null':typeof v==='boolean'?v?'true':'false':typeof v==='number'?String(v):"'"+v.replaceAll("'","''")+"'"
export async function buildFullK15ValidationRehearsal() {
 const root=new URL('../../data/public/tsa-v1-74007cf878ef/',import.meta.url)
 const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'))
 const files=new Map(Object.values({...manifest.datasets,provenance:manifest.provenance}).map(e=>[e.path,readFileSync(new URL(e.path,root),'utf8')]))
 const payload=Object.fromEntries(['items','spirits','seasons','provenance'].map(n=>[n,JSON.parse(files.get(n==='provenance'?manifest.provenance.path:manifest.datasets[n].path)).records]))
 const identities=[],relations=[]
 for(const [kind,records] of [['item',payload.items],['spirit',payload.spirits],['season',payload.seasons]])for(const r of records) {
  identities.push({kind,id:r.id,revision:1,schemaVersion:1,updatedAt:r.updatedAt,retiredAt:null,fixture:false,provenanceIds:r.provenanceIds})
  for(const [field,type] of kind==='item'?[['seasonIds','itemSeason'],['spiritIds','itemSpirit']]:kind==='spirit'?[['seasonIds','spiritSeason']]:[])
   for(const id of r[field])relations.push({type,fromId:r.id,toId:id})
 }
 const contract={sourceIds:new Set(['K15']),maxSnapshotBytes:1024,maxNormalizedBytes:32_000_000,maxRecords:100_000,maxRelations:100_000,retryDelaysMs:[]}
 const base={revision:0,lastKnownGood:null,lastPromotedAt:null,freshness:null,lastAttemptAt:null,failures:0,nextRetryAt:null,approval:null}
 const staged=await stageSourceSnapshot({sourceId:'K15',raw:'Full checked-in K15 validation rehearsal; not upstream import',normalizationVersion:'rehearsal-only',base,contract,
  normalize:async()=>({publicFiles:{manifest,files},provenanceIds:payload.provenance.map(p=>p.id),identities:{identities,relations,crosswalks:[],aliases:[],tombstones:[]}}),
  fetchedAt:'2026-10-07T00:00:00Z',now:()=>Date.parse('2026-10-07T00:01:00Z')})
 if(staged.status!=='staged')throw new Error('Full K15 cannot stage')
 const write=await prepareCanonicalPayloadWrite(staged.candidate,contract,null,{maxRows:100_000,maxBytes:32_000_000})
 const statements=write.statements.map(s=>s.text.replace(/\$(\d+)/g,(_,n)=>scalar(s.values[Number(n)-1]))+';')
 const release=[]
 for(const [table,rows] of Object.entries(write.plan.release))for(let i=0;i<rows.length;i+=100) {
  const columns=releaseColumns[table]
  release.push(`insert into sky_private.${table}(${columns.join(',')}) values ${rows.slice(i,i+100).map(r=>'('+columns.map(c=>scalar(r[c])).join(',')+')').join(',')};`)
 }
 const membershipRows=['release_item','release_lookup','release_spirit','release_season','release_provenance'].reduce((n,t)=>n+write.plan.release[t].length,0)
 const expected={items:payload.items.length,spirits:payload.spirits.length,seasons:payload.seasons.length,provenance:payload.provenance.length,identityRows:identities.length,membershipRows}
 // Refuse a populated baseline. The generation lock uses the same writer order;
 // no CAS, projection/publication pointer or forensic journal row is installed.
 const empty=Object.keys(privateSyncColumns).filter(t=>t!=='sync_generation').map(t=>`exists(select 1 from sky_private.${t})`).join(' or ')
 const sql=[
  '-- PREPARED/NOT RUN. Scoped dev native rehearsal only, quiesced consumers. ROLLBACK compulsory.',
  '-- Full K15 local payload, no production/source publication. Runtime roles are not used.',
  'begin isolation level read committed read write;',"set local statement_timeout='30s';","set local standard_conforming_strings=on;",
  `do $baseline$ begin perform singleton from sky_private.sync_generation where singleton=1 for update;
   if not found or exists(select 1 from sky_private.sync_generation where revision<>0 or current_acceptance_revision is not null or last_promoted_at is not null) or ${empty} then raise exception 'Full K15 rehearsal requires empty native baseline';end if;
   if to_regclass('sky_private.sync_commit_intent') is not null then
    if exists(select 1 from sky_private.sync_commit_intent) or exists(select 1 from sky_private.sync_commit_applied) or exists(select 1 from sky_private.sync_commit_receipt)
    or (select count(*) from sky_private.sync_commit_control)<>1 or exists(select 1 from sky_private.sync_commit_control where singleton<>1 or active_intent_id is not null) then raise exception 'Journal baseline not empty';end if;
   end if;end;$baseline$;`,
  `do $cost$ declare started timestamptz;canonical_done timestamptz;release_done timestamptz;checked timestamptz;begin
   started:=clock_timestamp();\n${statements.join('\n')}\ncanonical_done:=clock_timestamp();\n${release.join('\n')}
   release_done:=clock_timestamp();set constraints all immediate;checked:=clock_timestamp();
   perform set_config('sky_guide.rehearsal_cost',jsonb_build_object('expected',${scalar(JSON.stringify(expected))}::jsonb,
    'canonicalMs',extract(epoch from canonical_done-started)*1000,'releaseMs',extract(epoch from release_done-canonical_done)*1000,
    'deferredMs',extract(epoch from checked-release_done)*1000,'totalMs',extract(epoch from checked-started)*1000,
    'items',(select count(*) from sky_private.item),'memberships',(select count(*) from sky_private.release_item)+(select count(*) from sky_private.release_lookup)+(select count(*) from sky_private.release_spirit)+(select count(*) from sky_private.release_season)+(select count(*) from sky_private.release_provenance))::text,true);
   end;$cost$;`,
  "select current_setting('sky_guide.rehearsal_cost')::jsonb as cost_receipt;",'rollback;',
  '-- After success OR timeout/error, confirm transaction rollback and re-run the authoritative empty baseline audit.',
 ].join('\n')+'\n'
 if(Buffer.byteLength(sql)>32_000_000)throw new Error('Full K15 rehearsal byte budget exceeded')
 return {sql,expected,canonicalRows:write.rowCount,releaseRows:Object.values(write.plan.release).reduce((n,r)=>n+r.length,0)}
}

export function verifyFullK15ValidationReceipt(receipt,expected) {
 if(!receipt||canonicalJson(receipt.expected)!==canonicalJson(expected)||receipt.items!==expected.items||receipt.memberships!==expected.membershipRows)throw new Error('Incomplete full K15 receipt')
 const times=['canonicalMs','releaseMs','deferredMs','totalMs'].map(k=>receipt[k])
 if(times.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0)||Math.abs(times[3]-times.slice(0,3).reduce((a,b)=>a+b,0))>0.01||times[3]>30_000)throw new Error('Full K15 cost exceeds rehearsal budget or invalid timing')
 // A valid receipt is still single-transaction cost evidence only. Confirm the
 // separate empty-baseline receipt and agree production scale budgets separately.
 return true
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 if(!process.argv[2])throw new Error('Provide E-drive output file outside Git')
 const r=await buildFullK15ValidationRehearsal();writeFileSync(process.argv[2],r.sql)
 process.stdout.write(JSON.stringify({status:'PREPARED/NOT RUN',bytes:Buffer.byteLength(r.sql),expected:r.expected,canonicalRows:r.canonicalRows,releaseRows:r.releaseRows})+'\n')
}
