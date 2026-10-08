import { writeFileSync } from 'node:fs'
import process from 'node:process'
import { catalogColumns } from '../../src/server/catalogRows.ts'
import { releaseColumns,encodeReleaseRows } from '../../src/server/releaseRows.ts'
import { projectionColumns } from '../../src/server/projectionRows.ts'
import { graphHistoryColumns } from '../../src/server/graphHistoryRows.ts'
import { manifestOrderColumns } from '../../src/server/manifestOrderRows.ts'
import { syncMetadataColumns } from '../../src/server/syncMetadataRows.ts'
import { releaseFixture } from '../fixtures/releaseRows.mjs'
import { acceptedFrame } from '../fixtures/syncReadFrame.mjs'
const scalar=v=>v===null?'null':typeof v==='boolean'?v?'true':'false':typeof v==='number'?String(v):`'${v.replaceAll("'","''")}'`
const insert=(columns,rows)=>Object.entries(columns).filter(([t])=>rows[t].length).map(([t,cols])=>`insert into sky_private.${t}(${cols.join(',')}) values ${rows[t].map(r=>`(${cols.map(c=>scalar(r[c])).join(',')})`).join(',')};`).join('\n')
const {snapshot,catalog}=releaseFixture(),{frame}=await acceptedFrame()
const columns={...graphHistoryColumns};delete columns.acceptance_graph;columns.acceptance_graph=graphHistoryColumns.acceptance_graph
const parts=['begin;',"set local statement_timeout='30s';","set local standard_conforming_strings=on;",insert(catalogColumns,catalog),insert(releaseColumns,encodeReleaseRows(snapshot,catalog)),
 insert({release_projection_file:projectionColumns.release_projection_file,release_projection:projectionColumns.release_projection},frame.projection),
 "insert into sky_private.source_registry(id) values('K01');",
 insert({sync_acceptance:syncMetadataColumns.sync_acceptance},frame.metadata),insert(columns,frame.graph),insert({acceptance_manifest_dataset:manifestOrderColumns},{acceptance_manifest_dataset:frame.manifestOrder}),
 "select sky_private.apply_sync_metadata_cas('K15',0,'promoted',1,'2026-10-07T00:00:00Z',null);set constraints all immediate;set constraints all deferred;"]
const staged=`insert into sky_private.sync_acceptance select 2,source_id,catalog_version,content_hash,source_hash,
 encode(sha256(convert_to('["'||content_hash||'",1,"'||fetched_at||'","'||staged_at||'"]','UTF8')),'hex'),normalization_version,1,fetched_at,staged_at,reviewer_ref,reviewed_at,promoted_at,valid_until
 from sky_private.sync_acceptance where revision=1;`
const negatives=[
 ['partial order',staged+"insert into sky_private.acceptance_manifest_dataset values(2,'items',0);select sky_private.apply_sync_metadata_cas('K15',1,'reconfirmed',2,'2026-10-07T00:00:00Z',null);set constraints all immediate;",'23514'],
 ['missing acceptance',"insert into sky_private.acceptance_manifest_dataset values(999,'items',0)",'23503'],
 ['extra dataset',"insert into sky_private.acceptance_manifest_dataset values(1,'private',0)",'23514'],
 ['out of range order',"insert into sky_private.acceptance_manifest_dataset values(1,'items',4)",'23514'],
 ['negative order',"insert into sky_private.acceptance_manifest_dataset values(1,'items',-1)",'23514'],
 ['duplicate dataset',"insert into sky_private.acceptance_manifest_dataset values(1,'items',0)",'23505'],
 ['duplicate position',staged+"insert into sky_private.acceptance_manifest_dataset values(2,'items',0),(2,'lookup',0)",'23505'],
 ['immutable order',"update sky_private.acceptance_manifest_dataset set position=position where acceptance_revision=1",'23514'],
 ['immutable delete',"delete from sky_private.acceptance_manifest_dataset where acceptance_revision=1",'23514'],
 ['immutable truncate',"truncate sky_private.acceptance_manifest_dataset",'23514'],
 ['orphan acceptance',staged+"insert into sky_private.acceptance_manifest_dataset values(2,'items',0),(2,'lookup',1),(2,'spirits',2),(2,'seasons',3);set constraints all immediate;",'23503'],
]
parts.push(`do $$ declare case_row record;actual_state text;passed integer:=0;begin
 for case_row in select * from(values ${negatives.map(([label,query,state])=>`(${scalar(label)},$case$${query}$case$,${scalar(state)})`).join(',')}) c(label,query,expected_state) loop
  actual_state:=null;begin execute case_row.query;exception when others then get stacked diagnostics actual_state=returned_sqlstate;end;
  if actual_state is distinct from case_row.expected_state then raise exception 'Manifest case % expected %, got %',case_row.label,case_row.expected_state,coalesce(actual_state,'SUCCESS');end if;passed:=passed+1;
 end loop;
 if passed<>11 or (select revision from sky_private.sync_generation)<>1 or (select count(*) from sky_private.acceptance_manifest_dataset)<>4 then raise exception 'Manifest rollback failed';end if;
end;$$;`,
 "select sky_private.apply_sync_metadata_cas('K01',1,'failure',null,'2026-10-07T00:04:00Z','2026-10-07T00:05:00.000Z');set constraints all immediate;set constraints all deferred;",
 "select sky_private.apply_sync_metadata_cas('K15',2,'failure',null,'2026-10-07T00:05:00Z','2026-10-07T00:06:00.000Z');set constraints all immediate;",
 "update sky_private.item set name_default='Changed current canonical payload' where id='tsa-cosmetic-9002';")
const selectRows=(table,cols,filter)=>`coalesce((select jsonb_agg(to_jsonb(r)) from(select ${cols.join(',')} from sky_private.${table} ${filter}) r),'[]'::jsonb)`
const metadata=source=>`jsonb_build_object(${Object.entries(syncMetadataColumns).map(([table,cols])=>`'${table}',${selectRows(table,cols,table==='sync_source_state'?`where source_id='${source}'`:table==='sync_acceptance'?'where revision=1':table==='sync_audit'?'where revision=3':'')}`).join(',')})`
const graph=`jsonb_build_object(${Object.entries(graphHistoryColumns).map(([table,cols])=>`'${table}',${selectRows(table,cols,'where acceptance_revision=1')}`).join(',')})`
const projection=`jsonb_build_object(${Object.entries(projectionColumns).map(([table,cols])=>`'${table}',${selectRows(table,cols,"where catalog_version='fixture-release'")}`).join(',')})`
parts.push(`select jsonb_build_object('negative_cases',11,${['K15','K01'].map(source=>`'${source}',jsonb_build_object('metadata',${metadata(source)},'graph',${graph},'projection',${projection},'manifestOrder',${selectRows('acceptance_manifest_dataset',manifestOrderColumns,'where acceptance_revision=1 order by position desc')})`).join(',')}) as rows;`,'rollback;')
if(!process.argv[2]) throw new Error('Provide an output file outside Git')
writeFileSync(process.argv[2],parts.join('\n'),'utf8')
process.stdout.write(`Native SyncState composition fixture: 11 negatives; ${parts.join('\n').length} bytes\n`)
