-- REVIEW ONLY / NOT APPLIED. Full native ACL/schema check is mandatory immediately before this transaction.
do $release_scan_guard$ declare t text;n bigint;begin
 if current_setting('session_replication_role')<>'origin' then raise exception 'Origin enforcement required';end if;
 if current_user<>'postgres' then raise exception 'Approved development actor required';end if;
 perform singleton from sky_private.sync_generation where singleton=1 for update;
 if not found or exists(select 1 from sky_private.sync_generation where singleton<>1 or revision<>0 or current_acceptance_revision is not null or last_promoted_at is not null) then raise exception 'Nonempty global baseline';end if;
 perform singleton from sky_private.sync_commit_control where singleton=1 for update;
 if not found or exists(select 1 from sky_private.sync_commit_control where singleton<>1 or active_intent_id is not null) then raise exception 'Nonempty journal control';end if;
 foreach t in array array['acceptance_graph','acceptance_manifest_dataset','acquisition_cost','acquisition_option','acquisition_provenance','acquisition_source_offer','alias','domain_identity','field_provenance','field_provenance_field','graph_alias','graph_call_item','graph_call_media','graph_cosmetic_item','graph_crosswalk','graph_emote_item','graph_emote_media','graph_event_location','graph_identity','graph_identity_provenance','graph_instrument_item','graph_instrument_samples','graph_item_media','graph_item_season','graph_item_spirit','graph_occurrence_event','graph_occurrence_override','graph_occurrence_rule','graph_override_event','graph_override_rule','graph_provenance','graph_rule_event','graph_sample_media','graph_spirit_location','graph_spirit_season','graph_tombstone','identity_provenance','item','item_asset','item_k15','item_rule','item_season','item_source_key','item_spirit','item_translation','payload_provenance','provenance','provenance_order','public_release','release_dataset','release_import_summary','release_item','release_lookup','release_projection','release_projection_file','release_provenance','release_season','release_source','release_source_path','release_source_snapshot','release_spirit','season','season_article','season_item','season_map','season_realm','season_spirit','season_translation','source_crosswalk','source_registry','spirit','spirit_season','spirit_translation','spirit_tree','sync_acceptance','sync_audit','sync_generation','sync_source_state','tombstone','sync_commit_intent','sync_commit_control','sync_commit_applied','sync_commit_receipt'] loop
  execute format('select count(*) from sky_private.%I',t) into n;
  if n<>(case when t in('sync_generation','sync_commit_control') then 1 else 0 end) then raise exception 'Nonempty private owner %',t;end if;
 end loop;
 if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang join pg_roles r on r.oid=p.proowner
  where n.nspname='sky_private' and p.proname='validate_release_metadata' and pg_get_function_identity_arguments(p.oid)='' and pg_get_function_result(p.oid)='trigger'
  and md5(p.prosrc)='b2ecccd2deae57f41a2debe3cf806529' and not p.prosecdef and r.rolname='postgres' and l.lanname='plpgsql' and p.proconfig=array['search_path=""']
  and p.provolatile='v' and not p.proisstrict and p.proparallel='u' and p.prokind='f' and not p.proleakproof) then raise exception 'Release validator definition/settings drift';end if;
 if (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='sky_private' and t.tgname='release_metadata_state' and not t.tgisinternal and t.tgenabled='O' and t.tgdeferrable and t.tginitdeferred)<>11 then raise exception 'Deferred release event coverage drift';end if;
end;$release_scan_guard$;
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
