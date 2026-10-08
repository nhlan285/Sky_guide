import { writeFileSync } from 'node:fs'
import process from 'node:process'
import { catalogColumns } from '../../src/server/catalogRows.ts'
import { releaseColumns,encodeReleaseRows } from '../../src/server/releaseRows.ts'
import { projectionColumns,encodeProjectionRows } from '../../src/server/projectionRows.ts'
import { graphHistoryColumns,encodeGraphHistoryRows } from '../../src/server/graphHistoryRows.ts'
import { syncMetadataColumns } from '../../src/server/syncMetadataRows.ts'
import { manifestOrderColumns,encodeManifestOrderRows } from '../../src/server/manifestOrderRows.ts'
import { candidateReviewHash,stageSourceSnapshot } from '../../src/server/sourceSync.ts'
import { payloadEvidenceFixture } from '../fixtures/payloadEvidence.mjs'
import { acceptedFrame,contract,empty } from '../fixtures/syncReadFrame.mjs'
const scalar=v=>v===null?'null':typeof v==='boolean'?v?'true':'false':typeof v==='number'?String(v):`'${v.replaceAll("'","''")}'`
const insert=(columns,rows)=>Object.entries(columns).filter(([t])=>rows[t].length).map(([t,cols])=>`insert into sky_private.${t}(${cols.join(',')}) values ${rows[t].map(r=>`(${cols.map(c=>scalar(r[c])).join(',')})`).join(',')};`).join('\n')
const f=payloadEvidenceFixture(),staged=await stageSourceSnapshot({sourceId:'K15',raw:'synthetic evidence boundary',normalizationVersion:'fixture-v1',base:empty(),contract,
 normalize:async()=>({identities:f.graph,publicFiles:f.snapshot,provenanceIds:f.provenanceIds}),fetchedAt:'2026-10-07T00:00:00Z',now:()=>Date.parse('2026-10-07T00:01:00Z')})
if(staged.status!=='staged') throw new Error('Invalid synthetic candidate')
const candidate=staged.candidate,{frame}=await acceptedFrame()
Object.assign(frame.metadata.sync_acceptance[0],{content_hash:candidate.contentHash,source_hash:candidate.sourceHash,candidate_hash:candidateReviewHash(candidate)})
frame.graph=encodeGraphHistoryRows({identities:candidate.identities,provenanceIds:candidate.provenanceIds},1)
frame.projection=encodeProjectionRows(candidate.publicFiles,'2026-10-07T00:02:30Z');frame.manifestOrder=encodeManifestOrderRows(candidate.publicFiles.manifest,1)
const graphColumns={...graphHistoryColumns};delete graphColumns.acceptance_graph;graphColumns.acceptance_graph=graphHistoryColumns.acceptance_graph
const parts=['begin;',"set local statement_timeout='30s';","set local standard_conforming_strings=on;",insert(catalogColumns,f.catalog),insert(releaseColumns,encodeReleaseRows(f.snapshot,f.publicCatalog)),
 insert({release_projection_file:projectionColumns.release_projection_file,release_projection:projectionColumns.release_projection},frame.projection),insert({sync_acceptance:syncMetadataColumns.sync_acceptance},frame.metadata),
 insert(graphColumns,frame.graph),insert({acceptance_manifest_dataset:manifestOrderColumns},{acceptance_manifest_dataset:frame.manifestOrder}),
 "select sky_private.apply_sync_metadata_cas('K15',0,'promoted',1,'2026-10-07T00:00:00Z',null);set constraints all immediate;"]
const reserved=`insert into sky_private.domain_identity values('item','private-reserved-only',1,1,'2026-10-07T00:00:00Z',null,true);insert into sky_private.identity_provenance values('item','private-reserved-only','fixture-private-proof',0);`
const unboundPayload=`insert into sky_private.domain_identity values('item','private-payload',1,1,'2026-10-07T00:00:00Z',null,false);insert into sky_private.identity_provenance values('item','private-payload','fixture-private-proof',0);insert into sky_private.item(id,position,record_status,name_default,slot,dye_status,field_provenance_present) values('private-payload',2,'draft','Synthetic only','unknown','unknown',false);`
const cases=[
 ['nonfixture evidence delete',"delete from sky_private.payload_provenance where id='tsa-cosmetic-9001'",'23514'],
 ['payload evidence truncate',"truncate sky_private.payload_provenance",'23514'],
 ['payload order gap',"update sky_private.payload_provenance set position=10 where id='tsa-cosmetic-9001'",'23514'],
 ['negative payload order',"update sky_private.payload_provenance set position=-1 where id='tsa-cosmetic-9001'",'23514'],
 ['unsupported kind',"insert into sky_private.payload_provenance values('media','tsa-cosmetic-9001','fixture-private-proof',0)",'23514'],
 ['identity without payload',"set constraints all deferred;"+reserved+"insert into sky_private.payload_provenance values('item','private-reserved-only','fixture-private-proof',0);set constraints all immediate;",'23514'],
 ['registered proof outside owner',"update sky_private.payload_provenance set provenance_id='fixture-public-proof-b' where id='tsa-cosmetic-9001'",'23503'],
 ['unknown proof',"update sky_private.payload_provenance set provenance_id='not-registered' where id='tsa-cosmetic-9001'",'23503'],
 ['duplicate proof',"insert into sky_private.payload_provenance values('item','tsa-cosmetic-9001','fixture-release-proof',1)",'23505'],
 ['duplicate position',"insert into sky_private.payload_provenance values('item','tsa-cosmetic-9001','fixture-private-proof',0)",'23505'],
 ['canonical evidence still referenced',"delete from sky_private.identity_provenance where id='tsa-cosmetic-9001' and provenance_id='fixture-release-proof'",'23503'],
 ['nonfixture payload without own evidence',"set constraints all deferred;"+unboundPayload+"set constraints all immediate;",'23514'],
 ['missing identity',"insert into sky_private.payload_provenance values('item','missing-id','fixture-private-proof',0)",'23503'],
]
parts.push(`do $$ declare case_row record;actual_state text;passed integer:=0;begin
 for case_row in select * from(values ${cases.map(([label,query,state])=>`(${scalar(label)},$case$${query}$case$,${scalar(state)})`).join(',')}) c(label,query,expected_state) loop
  actual_state:=null;begin execute case_row.query;exception when others then get stacked diagnostics actual_state=returned_sqlstate;end;
  if actual_state is distinct from case_row.expected_state then raise exception 'Evidence case % expected %, got %',case_row.label,case_row.expected_state,coalesce(actual_state,'SUCCESS');end if;passed:=passed+1;
 end loop;
 if passed<>13 or (select count(*) from sky_private.payload_provenance)<>3 then raise exception 'Payload rollback failed';end if;
end;$$;`,
 "set constraints all deferred;delete from sky_private.payload_provenance where id='tsa-cosmetic-9002';delete from sky_private.identity_provenance where id='tsa-cosmetic-9002';",
 insert({identity_provenance:catalogColumns.identity_provenance},{identity_provenance:f.catalog.identity_provenance.filter(r=>r.id==='tsa-cosmetic-9002')}),
 insert({payload_provenance:catalogColumns.payload_provenance},{payload_provenance:f.catalog.payload_provenance.filter(r=>r.id==='tsa-cosmetic-9002')}),"set constraints all immediate;")
const selectRows=(t,cols,filter='')=>`coalesce((select jsonb_agg(to_jsonb(r)) from(select ${cols.join(',')} from sky_private.${t} ${filter}) r),'[]'::jsonb)`
const group=(columns,filter='')=>`jsonb_build_object(${Object.entries(columns).map(([t,cols])=>`'${t}',${selectRows(t,cols,filter)}`).join(',')})`
parts.push(`select jsonb_build_object('negative_cases',13,'catalog',${group(catalogColumns)},'frame',jsonb_build_object('metadata',${group(syncMetadataColumns)},'graph',${group(graphHistoryColumns,'where acceptance_revision=1')},'projection',${group(projectionColumns,"where catalog_version='fixture-release'")},'manifestOrder',${selectRows('acceptance_manifest_dataset',manifestOrderColumns,'where acceptance_revision=1 order by position desc')})) as rows;`,'rollback;')
if(!process.argv[2]) throw new Error('Provide output outside Git')
writeFileSync(process.argv[2],parts.join('\n'),'utf8')
process.stdout.write(`Payload evidence rehearsal: 13 negatives; ${parts.join('\n').length} bytes\n`)
