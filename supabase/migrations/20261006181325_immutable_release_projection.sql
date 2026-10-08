-- Immutable DERIVED public projection bytes. No arbitrary canonical JSON owner,
-- public pointer, runtime role or reviewed promotion is introduced here.
create table sky_private.release_projection (
  catalog_version text primary key references sky_private.public_release(catalog_version) on update restrict on delete restrict,
  manifest_text text not null check(octet_length(convert_to(manifest_text,'UTF8'))>0),
  manifest_sha256 text not null check(manifest_sha256=encode(sha256(convert_to(manifest_text,'UTF8')),'hex')),
  materialized_at text not null check(sky_private.iso_instant(materialized_at) is not null)
);
create table sky_private.release_projection_file (
  catalog_version text not null,dataset text not null,
  path text not null,sha256 text not null,
  content text not null check(octet_length(convert_to(content,'UTF8'))>0),
  primary key(catalog_version,dataset),unique(catalog_version,path),
  check(sha256=encode(sha256(convert_to(content,'UTF8')),'hex')),
  foreign key(catalog_version,dataset) references sky_private.release_dataset(catalog_version,name) on update restrict on delete restrict,
  foreign key(catalog_version) references sky_private.release_projection(catalog_version) on update restrict on delete restrict deferrable initially deferred
);

create function sky_private.guard_sealed_metadata() returns trigger
language plpgsql security invoker set search_path='' as $$
declare version text;
begin
  version:=case when tg_op='DELETE' then old.catalog_version else new.catalog_version end;
  -- Shared root lock serializes candidate metadata and projection materialization.
  -- Actual transactional adapter isolation/two-session proof remains a next gate.
  perform 1 from sky_private.public_release where catalog_version=version for update;
  if exists(select 1 from sky_private.release_projection where catalog_version=version)
    or (tg_op='UPDATE' and exists(select 1 from sky_private.release_projection where catalog_version=old.catalog_version)) then
    raise exception 'Materialized release metadata is sealed' using errcode='23514';
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

create function sky_private.guard_projection_history() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op<>'INSERT' then
    raise exception 'Projection bytes are immutable' using errcode='23514';
  end if;
  perform 1 from sky_private.public_release where catalog_version=new.catalog_version for update;
  if tg_table_name='release_projection_file' and exists(select 1 from sky_private.release_projection where catalog_version=new.catalog_version) then
    raise exception 'Materialized projection is complete' using errcode='23514';
  end if;
  return new;
end;
$$;

create function sky_private.validate_projection_files() returns trigger
language plpgsql security invoker set search_path='' as $$
declare version text;
begin
  version:=new.catalog_version;
  perform 1 from sky_private.public_release where catalog_version=version for update;
  if (select count(*) from sky_private.release_projection_file where catalog_version=version)<>5
    or exists(select 1 from sky_private.release_projection_file f join sky_private.release_dataset d
      on (d.catalog_version,d.name)=(f.catalog_version,f.dataset)
      where f.catalog_version=version and (f.path<>d.path or f.sha256<>d.sha256)) then
    raise exception 'Incomplete or mismatched public projection files' using errcode='23514';
  end if;
  return null;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['release_dataset','release_source','release_source_snapshot','release_source_path','release_import_summary',
    'release_item','release_lookup','release_spirit','release_season','release_provenance'] loop
    execute format('create trigger sealed_release_metadata before insert or update or delete on sky_private.%I for each row execute function sky_private.guard_sealed_metadata()',table_name);
  end loop;
  foreach table_name in array array['release_projection','release_projection_file'] loop
    execute format('alter table sky_private.%I enable row level security',table_name);
    execute format('create trigger immutable_projection before insert or update or delete on sky_private.%I for each row execute function sky_private.guard_projection_history()',table_name);
    execute format('create trigger immutable_projection_truncate before truncate on sky_private.%I for each statement execute function sky_private.guard_evidence_truncate()',table_name);
    execute format('create constraint trigger complete_projection after insert on sky_private.%I deferrable initially deferred for each row execute function sky_private.validate_projection_files()',table_name);
  end loop;
end;
$$;
revoke all on all tables in schema sky_private from public;
revoke all on all functions in schema sky_private from public;
