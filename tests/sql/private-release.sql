-- Bounded synthetic catalog/release inserted by build-release-rehearsal.mjs.
set constraints all immediate;
do $$
declare case_row record;actual_state text;passed integer:=0;
begin
  if (select count(distinct generated_at) from sky_private.release_dataset)<>5
    or (select id from sky_private.release_item where position=0)=(select id from sky_private.release_lookup where position=0)
    or (select count(*) from sky_private.release_source_path where path='packages/utility/source/fixture-b.ts')<>2 then
    raise exception 'Distinct envelope times/order/repeated source path was lost';
  end if;
  for case_row in select * from (values
    ('unknown dataset',$sql$update sky_private.release_dataset set name='hidden' where name='items'$sql$,'23514'),
    ('mixed dataset version',$sql$update sky_private.release_dataset set data_version='other' where name='items'$sql$,'23514'),
    ('malformed checksum',$sql$update sky_private.release_dataset set sha256='bad' where name='items'$sql$,'23514'),
    ('unsupported schema',$sql$update sky_private.release_dataset set schema_version=2 where name='items'$sql$,'23514'),
    ('fixture envelope',$sql$update sky_private.release_dataset set fixture=true where name='items'$sql$,'23514'),
    ('unsafe dataset path',$sql$update sky_private.release_dataset set path='../private.json' where name='items'$sql$,'23514'),
    ('duplicate dataset path',$sql$update sky_private.release_dataset set path='lookup.json' where name='items'$sql$,'23505'),
    ('invalid envelope instant',$sql$update sky_private.release_dataset set generated_at='invalid' where name='items'$sql$,'22007'),
    ('missing dataset',$sql$delete from sky_private.release_dataset where name='spirits'$sql$,'23503'),
    ('missing source',$sql$delete from sky_private.release_source where dataset='items'$sql$,'23514'),
    ('wrong source',$sql$update sky_private.release_source set source_id='K01' where dataset='items'$sql$,'23514'),
    ('source position',$sql$update sky_private.release_source set position=1 where dataset='items'$sql$,'23514'),
    ('wrong source owner',$sql$insert into sky_private.release_source values('missing','items','K15',0)$sql$,'23503'),
    ('duplicate membership',$sql$insert into sky_private.release_item(catalog_version,id,position,owner_revision) values('fixture-release','tsa-cosmetic-9001',2,1)$sql$,'23505'),
    ('dangling member',$sql$insert into sky_private.release_item(catalog_version,id,position,owner_revision) values('fixture-release','missing',2,1)$sql$,'23503'),
    ('invalid owner revision',$sql$update sky_private.release_item set owner_revision=0$sql$,'23514'),
    ('stale owner revision',$sql$update sky_private.release_lookup set owner_revision=2$sql$,'23514'),
    ('unsafe owner revision',$sql$update sky_private.release_item set owner_revision=9007199254740992$sql$,'23514'),
    ('membership gap',$sql$update sky_private.release_lookup set position=2 where position=1$sql$,'23514'),
    ('membership mismatch',$sql$delete from sky_private.release_item where position=1$sql$,'23514'),
    ('member owner move',$sql$update sky_private.release_lookup set catalog_version='other' where position=0$sql$,'23503'),
    ('missing snapshot',$sql$delete from sky_private.release_source_path;delete from sky_private.release_source_snapshot$sql$,'23514'),
    ('unsupported repository',$sql$update sky_private.release_source_snapshot set repository='unreviewed'$sql$,'23514'),
    ('invalid Git revision',$sql$update sky_private.release_source_snapshot set revision='bad'$sql$,'23514'),
    ('invalid Git blob',$sql$update sky_private.release_source_path set git_blob_sha='bad'$sql$,'23514'),
    ('path traversal',$sql$update sky_private.release_source_path set path='packages/utility/../private'$sql$,'23514'),
    ('empty path segment',$sql$update sky_private.release_source_path set path='packages/utility//source/a.ts'$sql$,'23514'),
    ('source path gap',$sql$delete from sky_private.release_source_path where position=0$sql$,'23514'),
    ('missing import summary',$sql$delete from sky_private.release_import_summary$sql$,'23514'),
    ('negative import count',$sql$update sky_private.release_import_summary set excluded=-1$sql$,'23514'),
    ('unsafe import count',$sql$update sky_private.release_import_summary set accepted=9007199254740992$sql$,'23514'),
    ('private rejection report',$sql$update sky_private.release_import_summary set rejected_empty=false$sql$,'23514'),
    ('release identity rewrite',$sql$update sky_private.public_release set generated_at='2026-10-08T00:00:00Z'$sql$,'23514'),
    ('release reservation delete',$sql$delete from sky_private.public_release$sql$,'23514'),
    ('release truncate',$sql$truncate sky_private.public_release cascade$sql$,'23514'),
    ('membership truncate',$sql$truncate sky_private.release_item$sql$,'23514'),
    ('source truncate',$sql$truncate sky_private.release_source$sql$,'23514'),
    ('summary truncate',$sql$truncate sky_private.release_import_summary$sql$,'23514')
  ) cases(label,query,expected_state) loop
    actual_state:=null;
    begin
      execute case_row.query;
    exception when others then get stacked diagnostics actual_state=returned_sqlstate;
    end;
    if actual_state is distinct from case_row.expected_state then
      raise exception 'Release case % expected %, got %',case_row.label,case_row.expected_state,coalesce(actual_state,'SUCCESS');
    end if;
    passed:=passed+1;
  end loop;
  if passed<>38 then raise exception 'Incomplete release assertions: %',passed;end if;
end;
$$;
