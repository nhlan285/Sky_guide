-- LOCAL PROPOSAL ONLY. Same trigger signature/settings/locks/global invariants.
-- Every deferred row event still validates; no cache, event dedup or session flag.
create or replace function sky_private.validate_release_metadata() returns trigger
language plpgsql security invoker set search_path='' as $$
declare version text;header sky_private.public_release%rowtype;
 incomplete_membership boolean;invalid_order boolean;invalid_owner boolean;
 invalid_publication boolean;invalid_provenance boolean;
begin
 if tg_op='UPDATE' and old.catalog_version<>new.catalog_version then
  raise exception 'Release owner cannot move' using errcode='23514';
 end if;
 version:=case when tg_op='DELETE' then old.catalog_version else new.catalog_version end;
 select * into header from sky_private.public_release where catalog_version=version for update;
 if not found then return null;end if;
 if (select count(*) from sky_private.release_dataset where catalog_version=version)<>5
  or (select count(*) from sky_private.release_source where catalog_version=version)<>5
  or header.source_present<>exists(select 1 from sky_private.release_source_snapshot where catalog_version=version)
  or header.import_report_present<>exists(select 1 from sky_private.release_import_summary where catalog_version=version) then
  raise exception 'Incomplete release metadata' using errcode='23514';
 end if;

 with scope(kind,dataset,id,position,owner_revision) as materialized (
  select 'item'::text,'items'::text,id,position,owner_revision from sky_private.release_item where catalog_version=version
  union all select 'item','lookup',id,position,owner_revision from sky_private.release_lookup where catalog_version=version
  union all select 'spirit','spirits',id,position,owner_revision from sky_private.release_spirit where catalog_version=version
  union all select 'season','seasons',id,position,owner_revision from sky_private.release_season where catalog_version=version
  union all select null::text,'provenance',id,position,null::bigint from sky_private.release_provenance where catalog_version=version
  union all select null::text,'sourcePaths',null::text,position,null::bigint from sky_private.release_source_path where catalog_version=version
 )
 select
  not exists(select 1 from scope where dataset='items')
   or exists(select id from scope where dataset='items' except select id from scope where dataset='lookup')
   or exists(select id from scope where dataset='lookup' except select id from scope where dataset='items'),
  exists(select 1 from (select count(*) n,max(position) p from scope group by dataset) positions where n>0 and p<>n-1),
  exists(select 1 from scope members join sky_private.domain_identity i using(kind,id)
   where i.revision<>members.owner_revision or i.fixture or i.retired_at is not null),
  exists(select 1 from scope r join sky_private.item i using(id) where r.dataset='items' and i.record_status<>'published')
   or exists(select 1 from scope r join sky_private.spirit s using(id) where r.dataset='spirits' and s.record_status<>'published')
   or exists(select 1 from scope r join sky_private.season s using(id) where r.dataset='seasons' and s.record_status<>'published'),
  exists(select 1 from scope r join sky_private.provenance p using(id) where r.dataset='provenance'
   and (p.source_id<>'K15' or p.source_url is null or p.verification_status not in('verified','stale')))
 into incomplete_membership,invalid_order,invalid_owner,invalid_publication,invalid_provenance;
 if incomplete_membership then raise exception 'Incomplete release metadata' using errcode='23514';end if;
 if invalid_order or invalid_owner or invalid_publication or invalid_provenance then
  raise exception 'Invalid release membership/order' using errcode='23514';
 end if;
 return null;
end;
$$;
