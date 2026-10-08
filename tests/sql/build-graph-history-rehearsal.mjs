import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import process from 'node:process'
import { catalogColumns } from '../../src/server/catalogRows.ts'
import { releaseColumns,encodeReleaseRows } from '../../src/server/releaseRows.ts'
import { projectionColumns,encodeProjectionRows } from '../../src/server/projectionRows.ts'
import { encodeGraphHistoryRows,graphHistoryColumns,graphRelationTables } from '../../src/server/graphHistoryRows.ts'
import { releaseFixture } from '../fixtures/releaseRows.mjs'
import { graphHistoryFixture } from '../fixtures/graphHistoryRows.mjs'

const scalar=v=>v===null?'null':typeof v==='boolean'?v?'true':'false':typeof v==='number'?String(v):`'${v.replaceAll("'","''")}'`
const insert=(columns,rows)=>Object.entries(columns).filter(([t])=>rows[t].length).map(([t,cols])=>`insert into sky_private.${t}(${cols.join(',')}) values ${rows[t].map(r=>`(${cols.map(c=>scalar(r[c])).join(',')})`).join(',')};`).join('\n')
const {snapshot,catalog}=releaseFixture(),projection=encodeProjectionRows(snapshot,'2026-10-07T00:00:00Z')
const parts=['begin;',"set local statement_timeout='30s';","set local standard_conforming_strings=on;",insert(catalogColumns,catalog),insert(releaseColumns,encodeReleaseRows(snapshot,catalog)),
 insert({release_projection_file:projectionColumns.release_projection_file,release_projection:projectionColumns.release_projection},projection),
 "insert into sky_private.source_registry(id) values('K01');",
 "insert into sky_private.provenance select 'fixture-graph-proof',source_id,source_url,source_record_key,source_revision,retrieved_at,observed_at,attribution,license_note,transform_note,verification_status from sky_private.provenance where id='fixture-release-proof';"]
function acceptance(revision) {
 const t=n=>`2026-10-07T00:${String((revision-1)*4+n).padStart(2,'0')}:00Z`,content='abc'[revision-1].repeat(64),fetched=t(0),staged=t(1)
 const candidate=createHash('sha256').update(JSON.stringify([content,revision-1,fetched,staged])).digest('hex')
 return `insert into sky_private.sync_acceptance values(${revision},'K15','fixture-release','${content}','${'f'.repeat(64)}','${candidate}','fixture-graph-v1',${revision-1},'${fetched}','${staged}','fixture-reviewer','${t(2)}','${t(3)}',null);`
}
const orderedColumns={...graphHistoryColumns};delete orderedColumns.acceptance_graph;orderedColumns.acceptance_graph=graphHistoryColumns.acceptance_graph
const finish=revision=>`select sky_private.apply_sync_metadata_cas('K15',${revision-1},'promoted',${revision},'2026-10-07T00:${String((revision-1)*4).padStart(2,'0')}:00Z',null);set constraints all immediate;set constraints all deferred;`
const first=graphHistoryFixture(),second=globalThis.structuredClone(first)
const owner=second.identities.identities.find(n=>n.kind==='item'&&n.id==='shared');owner.revision=4;owner.updatedAt='2026-10-07T00:01:00Z'
second.identities.relations=second.identities.relations.filter(r=>r.type!=='itemMedia')
const firstRows=encodeGraphHistoryRows(first,1),secondRows=encodeGraphHistoryRows(second,2,first.identities)
parts.push(acceptance(1),insert(orderedColumns,firstRows),finish(1),acceptance(2),insert(orderedColumns,secondRows),finish(2),
 "update sky_private.item set name_default='Changed current canonical payload' where id='tsa-cosmetic-9002';")
const base=encodeGraphHistoryRows(first,3),cases=[]
function malformed(label,change,state='23514',adjust=true) {
 const rows=globalThis.structuredClone(base);change(rows)
 if(adjust&&rows.acceptance_graph.length) Object.assign(rows.acceptance_graph[0],{identity_count:rows.graph_identity.length,identity_provenance_count:rows.graph_identity_provenance.length,candidate_provenance_count:rows.graph_provenance.length,
  crosswalk_count:rows.graph_crosswalk.length,alias_count:rows.graph_alias.length,tombstone_count:rows.graph_tombstone.length,relation_count:Object.values(graphRelationTables).reduce((n,t)=>n+rows[t].length,0)})
 cases.push([label,acceptance(3)+insert(orderedColumns,rows)+finish(3),state])
}
malformed('count mismatch',r=>{r.acceptance_graph[0].identity_count=0},'23514',false)
malformed('missing required samples',r=>{r.graph_instrument_samples=[];for(const t of Object.values(graphRelationTables)) for(const e of r[t]) if(e.position>base.graph_instrument_samples[0].position) e.position--})
malformed('global relation duplicate position',r=>{r.graph_item_season[0].position=r.graph_item_spirit[0].position})
malformed('global relation gap',r=>{r.graph_item_season[0].position=100})
malformed('identity gap',r=>{r.graph_identity[0].position=100})
malformed('evidence gap',r=>{r.graph_identity_provenance[0].position=100})
malformed('missing nonfixture evidence',r=>{r.graph_identity_provenance=r.graph_identity_provenance.filter(p=>!(p.kind==='item'&&p.id==='shared'))})
malformed('undeclared candidate proof',r=>{r.graph_identity_provenance[0].provenance_id='fixture-unregistered'},'23503')
malformed('unregistered source',r=>{r.graph_crosswalk[0].source_id='K99'},'23503')
malformed('crosswalk target kind',r=>{r.graph_crosswalk[0].kind='call'},'23503')
malformed('required endpoint wrong kind',r=>{r.graph_instrument_samples[0].to_id='media'})
malformed('retired relation endpoint',r=>{r.graph_item_media[0].from_id='retired'})
malformed('missing tombstone',r=>{r.graph_tombstone.pop()})
malformed('retirement mismatch',r=>{r.graph_tombstone[0].retired_at='2026-10-06T00:00:00Z'})
malformed('retired replacement',r=>{r.graph_tombstone[0].replacement_id='retired'})
malformed('alias replacement disagreement',r=>{r.graph_tombstone[1].replacement_id='emote-item'})
malformed('alias cycle',r=>{r.graph_alias[1].target_identity_id=null;r.graph_alias[1].target_alias_id='legacy-unknown'})
malformed('alias inactive terminal',r=>{r.graph_alias[1].target_identity_id='gone'})
malformed('alias active source',r=>{r.graph_alias[0].from_id='shared'})
malformed('alias target discriminator',r=>{r.graph_alias[0].target_identity_id='retired';r.graph_alias[0].target_alias_id=null})
malformed('alias both targets',r=>{r.graph_alias[0].target_identity_id='shared'})
malformed('rule event parent',r=>{r.graph_identity.push({...r.graph_identity.find(n=>n.kind==='event'),id:'other-event',fixture:true,position:r.graph_identity.length});r.graph_rule_event[0].to_id='other-event'})
malformed('override event parent',r=>{r.graph_identity.push({...r.graph_identity.find(n=>n.kind==='event'),id:'other-event',fixture:true,position:r.graph_identity.length});r.graph_override_event[0].to_id='other-event'})
malformed('occurrence event parent',r=>{r.graph_identity.push({...r.graph_identity.find(n=>n.kind==='event'),id:'other-event',fixture:true,position:r.graph_identity.length});r.graph_occurrence_event[0].to_id='other-event'})
malformed('two rules disagree',r=>{r.graph_identity.push({...r.graph_identity.find(n=>n.kind==='eventRule'),id:'other-rule',fixture:true,position:r.graph_identity.length});r.graph_rule_event.push({...r.graph_rule_event[0],from_id:'other-rule',position:20});r.graph_occurrence_rule[0].to_id='other-rule'})
malformed('to-one extra target',r=>{r.graph_spirit_location.push({...r.graph_spirit_location[0],to_id:'another-location',position:20})},'23505')
malformed('extension item reused',r=>{r.graph_call_item.push({...r.graph_call_item[0],from_id:'another-call',position:20})},'23505')
malformed('header omitted cannot commit',r=>{r.acceptance_graph=[]},'23503')
malformed('bad header digest spelling',r=>{r.acceptance_graph[0].graph_sha256='invalid'})
malformed('revision zero',r=>{r.graph_identity[0].revision=0})
malformed('retirement after update',r=>{r.graph_identity[0].retired_at='2026-10-07T01:00:00Z'})
malformed('crosswalk duplicate key',r=>{r.graph_crosswalk.push({...r.graph_crosswalk[0],position:2})},'23505')
for(const [table,cols] of Object.entries(graphHistoryColumns)) {
 cases.push([`${table} update`,`update sky_private.${table} set acceptance_revision=acceptance_revision where acceptance_revision=1`,'23514'])
 cases.push([`${table} delete`,`delete from sky_private.${table} where acceptance_revision=1`,'23514'])
 cases.push([`${table} truncate`,`truncate sky_private.${table} cascade`,'23514'])
 const row=firstRows[table][0]
 if(row) cases.push([`${table} sealed append`,insert({[table]:cols},{[table]:[row]}),'23514'])
}
cases.push(['missing acceptance',insert({graph_identity:graphHistoryColumns.graph_identity},{graph_identity:[{...firstRows.graph_identity[0],acceptance_revision:999}]}),'23503'])
parts.push(`do $$ declare case_row record;actual_state text;passed integer:=0;
begin
 for case_row in select * from(values ${cases.map(([label,query,state])=>`(${scalar(label)},$case$${query}$case$,${scalar(state)})`).join(',\n')}) c(label,query,expected_state) loop
  actual_state:=null;
  begin execute case_row.query; exception when others then get stacked diagnostics actual_state=returned_sqlstate;end;
  if actual_state is distinct from case_row.expected_state then raise exception 'Graph case % expected %, got %',case_row.label,case_row.expected_state,coalesce(actual_state,'SUCCESS');end if;
  passed:=passed+1;
 end loop;
 if passed<>${cases.length} or (select count(*) from sky_private.acceptance_graph)<>2 or (select revision from sky_private.sync_generation)<>2 then raise exception 'Graph rollback/count failed';end if;
end;$$;`)
parts.push(`select jsonb_build_object('negative_cases',${cases.length},'frames',jsonb_build_object(${[1,2].map(revision=>`'${revision}',jsonb_build_object(${Object.entries(graphHistoryColumns).map(([table,cols])=>`'${table}',coalesce((select jsonb_agg(to_jsonb(r)) from(select ${cols.join(',')} from sky_private.${table} where acceptance_revision=${revision} order by ${table==='graph_identity_provenance'?'kind,id,position':table==='acceptance_graph'?'acceptance_revision':'position desc'}) r),'[]'::jsonb)`).join(',')})`).join(',')})) as rows;`,'rollback;')
if(!process.argv[2]) throw new Error('Provide an output file outside Git')
writeFileSync(process.argv[2],parts.join('\n'),'utf8')
process.stdout.write(`Graph rehearsal: ${cases.length} negative cases; ${parts.join('\n').length} bytes\n`)
