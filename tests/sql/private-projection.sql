set constraints all immediate;
do $$
declare case_row record;actual_state text;passed integer:=0;old_content text;
begin
  for case_row in select * from(values
    ('header rewrite',$sql$update sky_private.release_projection set materialized_at='2026-10-08T00:00:00Z'$sql$,'23514'),
    ('header delete',$sql$delete from sky_private.release_projection$sql$,'23514'),
    ('file rewrite',$sql$update sky_private.release_projection_file set content='changed'$sql$,'23514'),
    ('file delete',$sql$delete from sky_private.release_projection_file$sql$,'23514'),
    ('late file insertion',$sql$insert into sky_private.release_projection_file select * from sky_private.release_projection_file limit 1$sql$,'23514'),
    ('header truncate',$sql$truncate sky_private.release_projection cascade$sql$,'23514'),
    ('file truncate',$sql$truncate sky_private.release_projection_file$sql$,'23514'),
    ('sealed dataset edit',$sql$update sky_private.release_dataset set generated_at='2026-10-08T00:00:00Z' where name='items'$sql$,'23514'),
    ('sealed member delete',$sql$delete from sky_private.release_lookup where position=0$sql$,'23514'),
    ('sealed member insert',$sql$insert into sky_private.release_item(catalog_version,id,position,owner_revision) values('fixture-release','tsa-cosmetic-9001',2,1)$sql$,'23514'),
    ('sealed source delete',$sql$delete from sky_private.release_source where dataset='items'$sql$,'23514'),
    ('sealed source snapshot edit',$sql$update sky_private.release_source_snapshot set normalization_version='changed'$sql$,'23514'),
    ('sealed source path insert',$sql$insert into sky_private.release_source_path values('fixture-release',3,'packages/utility/source/new.ts',repeat('a',40))$sql$,'23514'),
    ('sealed import summary edit',$sql$update sky_private.release_import_summary set accepted=3$sql$,'23514'),
    ('sealed metadata truncate',$sql$truncate sky_private.release_source_path$sql$,'23514'),
    ('wrong UTF8 checksum',$sql$select pg_temp.prepare_projection_candidate('bad-hash');insert into sky_private.release_projection_file(catalog_version,dataset,path,sha256,content) values('bad-hash','items','items.json',repeat('0',64),'Ánh sáng 🌌')$sql$,'23514'),
    ('empty projection bytes',$sql$select pg_temp.prepare_projection_candidate('empty-file');insert into sky_private.release_projection_file values('empty-file','items','items.json',encode(sha256(convert_to('','UTF8')),'hex'),'')$sql$,'23514'),
    ('wrong manifest checksum',$sql$select pg_temp.prepare_projection_candidate('bad-manifest');insert into sky_private.release_projection values('bad-manifest','{}',repeat('0',64),'2026-10-07T00:30:00Z')$sql$,'23514'),
    ('invalid materialization instant',$sql$select pg_temp.prepare_projection_candidate('bad-time');insert into sky_private.release_projection values('bad-time','{}',encode(sha256(convert_to('{}','UTF8')),'hex'),'invalid')$sql$,'22007'),
    ('header without files',$sql$select pg_temp.prepare_projection_candidate('no-files');insert into sky_private.release_projection select 'no-files',manifest_text,manifest_sha256,materialized_at from sky_private.release_projection where catalog_version='fixture-release'$sql$,'23514'),
    ('only four files',$sql$select pg_temp.prepare_projection_candidate('four-files');set constraints all deferred;insert into sky_private.release_projection_file select 'four-files',dataset,path,sha256,content from sky_private.release_projection_file where catalog_version='fixture-release' and dataset<>'seasons';insert into sky_private.release_projection select 'four-files',manifest_text,manifest_sha256,materialized_at from sky_private.release_projection where catalog_version='fixture-release';set constraints all immediate$sql$,'23514'),
    ('path differs from dataset',$sql$select pg_temp.prepare_projection_candidate('bad-path');set constraints all deferred;insert into sky_private.release_projection_file select 'bad-path',dataset,case when dataset='items' then 'mismatch.json' else path end,sha256,content from sky_private.release_projection_file where catalog_version='fixture-release';insert into sky_private.release_projection select 'bad-path',manifest_text,manifest_sha256,materialized_at from sky_private.release_projection where catalog_version='fixture-release';set constraints all immediate$sql$,'23514'),
    ('hash differs from dataset',$sql$select pg_temp.prepare_projection_candidate('hash-drift');set constraints all deferred;insert into sky_private.release_projection_file select 'hash-drift',dataset,path,case when dataset='items' then encode(sha256(convert_to(content||' ','UTF8')),'hex') else sha256 end,case when dataset='items' then content||' ' else content end from sky_private.release_projection_file where catalog_version='fixture-release';insert into sky_private.release_projection select 'hash-drift',manifest_text,manifest_sha256,materialized_at from sky_private.release_projection where catalog_version='fixture-release';set constraints all immediate$sql$,'23514'),
    ('orphan file header',$sql$select pg_temp.prepare_projection_candidate('orphan-files');set constraints all deferred;insert into sky_private.release_projection_file select 'orphan-files',dataset,path,sha256,content from sky_private.release_projection_file where catalog_version='fixture-release';set constraints all immediate$sql$,'23503')
  ) cases(label,query,expected_state) loop
    actual_state:=null;
    begin execute case_row.query;
    exception when others then get stacked diagnostics actual_state=returned_sqlstate;end;
    if actual_state is distinct from case_row.expected_state then
      raise exception 'Projection case % expected %, got %',case_row.label,case_row.expected_state,coalesce(actual_state,'SUCCESS');
    end if;
    passed:=passed+1;
  end loop;
  if passed<>24 then raise exception 'Incomplete projection assertions: %',passed;end if;
  select content into old_content from sky_private.release_projection_file where catalog_version='fixture-release' and dataset='items';
  -- Current canonical payload may legitimately advance while old release bytes,
  -- owner pins and source evidence remain sealed. No historical latest-row read.
  update sky_private.domain_identity set revision=2,updated_at='2026-10-07T00:45:00Z' where kind='item' and id='tsa-cosmetic-9002';
  update sky_private.item set name_default='Changed current canonical payload' where id='tsa-cosmetic-9002';
  if (select content from sky_private.release_projection_file where catalog_version='fixture-release' and dataset='items')<>old_content
    or (select owner_revision from sky_private.release_item where catalog_version='fixture-release' and id='tsa-cosmetic-9002')<>1 then
    raise exception 'Historical projection drifted with mutable canonical payload';
  end if;
end;
$$;
