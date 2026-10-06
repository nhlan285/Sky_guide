-- Private candidate metadata only, not a publication pointer or historical
-- payload store. Promotion/sealing and immutable projection bytes are next.
create table sky_private.public_release (
  catalog_version text primary key check(length(btrim(catalog_version))>0),
  schema_version integer not null check(schema_version=1),
  generated_at text not null check(sky_private.iso_instant(generated_at) is not null),
  asset_manifest_version text,
  source_present boolean not null, import_report_present boolean not null,
  aliases_path text check(aliases_path is null),aliases_data_version text check(aliases_data_version is null),aliases_sha256 text check(aliases_sha256 is null),
  tombstones_path text check(tombstones_path is null),tombstones_data_version text check(tombstones_data_version is null),tombstones_sha256 text check(tombstones_sha256 is null)
);
create table sky_private.release_dataset (
  catalog_version text not null references sky_private.public_release(catalog_version) on update restrict on delete restrict,
  name text not null check(name in('items','lookup','spirits','seasons','provenance')),
  path text not null check(path ~ '^[a-z][a-z0-9-]*\.json$'),
  data_version text not null check(data_version=catalog_version),
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  schema_version integer not null check(schema_version=1),
  generated_at text not null check(sky_private.iso_instant(generated_at) is not null),
  fixture boolean not null check(fixture=false),
  primary key(catalog_version,name),unique(catalog_version,path)
);
create table sky_private.release_source (
  catalog_version text not null,dataset text not null,
  source_id text not null check(source_id='K15') references sky_private.source_registry(id) on update restrict on delete restrict,
  position integer not null check(position=0),
  primary key(catalog_version,dataset,position),
  foreign key(catalog_version,dataset) references sky_private.release_dataset(catalog_version,name) on update restrict on delete restrict
);
create index release_source_source_id_idx on sky_private.release_source(source_id);
create table sky_private.release_source_snapshot (
  catalog_version text primary key references sky_private.public_release(catalog_version) on update restrict on delete restrict,
  repository text not null check(repository='thatskyapplication/thatskyapplication'),
  revision text not null check(revision ~ '^[a-f0-9]{40}$'),
  normalization_version text not null check(length(btrim(normalization_version))>0),
  transport text not null check(transport='public-repository'),status text not null check(status='pinned-snapshot')
);
create table sky_private.release_source_path (
  catalog_version text not null references sky_private.release_source_snapshot(catalog_version) on update restrict on delete restrict,
  position integer not null check(position>=0),
  path text not null check(path ~ '^packages/utility/[a-zA-Z0-9._/-]+$' and path !~ '(^|/)(\.|\.\.)(/|$)' and path !~ '//|/$'),
  git_blob_sha text not null check(git_blob_sha ~ '^[a-f0-9]{40}$'),
  primary key(catalog_version,position)
);
create table sky_private.release_import_summary (
  catalog_version text primary key references sky_private.public_release(catalog_version) on update restrict on delete restrict,
  accepted bigint not null check(accepted between 0 and 9007199254740991),
  excluded bigint not null check(excluded between 0 and 9007199254740991),
  unknown_category bigint not null check(unknown_category between 0 and 9007199254740991),
  unknown_cost bigint not null check(unknown_cost between 0 and 9007199254740991),
  rejected_empty boolean not null check(rejected_empty=true)
);

-- Explicit subtype membership, independent item and lookup ordering. Revision
-- pins are checked against supplied candidate owners; no FK to a mutable revision
-- is allowed to freeze identity updates or imply a versioned payload history.
create table sky_private.release_item (
  catalog_version text not null,dataset text generated always as('items') stored,
  id text not null references sky_private.item(id) on update restrict on delete restrict,
  position integer not null check(position>=0),owner_revision bigint not null check(owner_revision between 1 and 9007199254740991),
  primary key(catalog_version,id),unique(catalog_version,position),
  foreign key(catalog_version,dataset) references sky_private.release_dataset(catalog_version,name) on update restrict on delete restrict
);
create index release_item_id_idx on sky_private.release_item(id);
create table sky_private.release_lookup (
  catalog_version text not null,dataset text generated always as('lookup') stored,
  id text not null references sky_private.item_k15(id) on update restrict on delete restrict,
  position integer not null check(position>=0),owner_revision bigint not null check(owner_revision between 1 and 9007199254740991),
  primary key(catalog_version,id),unique(catalog_version,position),
  foreign key(catalog_version,dataset) references sky_private.release_dataset(catalog_version,name) on update restrict on delete restrict
);
create index release_lookup_id_idx on sky_private.release_lookup(id);
create table sky_private.release_spirit (
  catalog_version text not null,dataset text generated always as('spirits') stored,
  id text not null references sky_private.spirit(id) on update restrict on delete restrict,
  position integer not null check(position>=0),owner_revision bigint not null check(owner_revision between 1 and 9007199254740991),
  primary key(catalog_version,id),unique(catalog_version,position),
  foreign key(catalog_version,dataset) references sky_private.release_dataset(catalog_version,name) on update restrict on delete restrict
);
create index release_spirit_id_idx on sky_private.release_spirit(id);
create table sky_private.release_season (
  catalog_version text not null,dataset text generated always as('seasons') stored,
  id text not null references sky_private.season(id) on update restrict on delete restrict,
  position integer not null check(position>=0),owner_revision bigint not null check(owner_revision between 1 and 9007199254740991),
  primary key(catalog_version,id),unique(catalog_version,position),
  foreign key(catalog_version,dataset) references sky_private.release_dataset(catalog_version,name) on update restrict on delete restrict
);
create index release_season_id_idx on sky_private.release_season(id);
create table sky_private.release_provenance (
  catalog_version text not null,dataset text generated always as('provenance') stored,
  id text not null references sky_private.provenance(id) on update restrict on delete restrict,
  position integer not null check(position>=0),
  primary key(catalog_version,id),unique(catalog_version,position),
  foreign key(catalog_version,dataset) references sky_private.release_dataset(catalog_version,name) on update restrict on delete restrict
);
create index release_provenance_id_idx on sky_private.release_provenance(id);

create function sky_private.validate_release_metadata() returns trigger
language plpgsql security invoker set search_path='' as $$
declare version text;header sky_private.public_release%rowtype;invalid_order boolean;invalid_owner boolean;
begin
  -- Moving a child between versions is disallowed. Replacement of a candidate
  -- belongs to a trusted transaction; sealing is deferred to the promotion owner.
  if tg_op='UPDATE' and old.catalog_version<>new.catalog_version then
    raise exception 'Release owner cannot move' using errcode='23514';
  end if;
  version:=case when tg_op='DELETE' then old.catalog_version else new.catalog_version end;
  select * into header from sky_private.public_release where catalog_version=version for update;
  if not found then return null;end if;
  if (select count(*) from sky_private.release_dataset where catalog_version=version)<>5
    or (select count(*) from sky_private.release_source where catalog_version=version)<>5
    or header.source_present<>exists(select 1 from sky_private.release_source_snapshot where catalog_version=version)
    or header.import_report_present<>exists(select 1 from sky_private.release_import_summary where catalog_version=version)
    or not exists(select 1 from sky_private.release_item where catalog_version=version)
    or exists(select id from sky_private.release_item where catalog_version=version except select id from sky_private.release_lookup where catalog_version=version)
    or exists(select id from sky_private.release_lookup where catalog_version=version except select id from sky_private.release_item where catalog_version=version) then
    raise exception 'Incomplete release metadata' using errcode='23514';
  end if;
  select exists(select 1 from (
    select count(*) n,max(position) p from sky_private.release_item where catalog_version=version
    union all select count(*),max(position) from sky_private.release_lookup where catalog_version=version
    union all select count(*),max(position) from sky_private.release_spirit where catalog_version=version
    union all select count(*),max(position) from sky_private.release_season where catalog_version=version
    union all select count(*),max(position) from sky_private.release_provenance where catalog_version=version
    union all select count(*),max(position) from sky_private.release_source_path where catalog_version=version
  ) positions where n>0 and p<>n-1) into invalid_order;
  select exists(select 1 from (
    select 'item' kind,id,owner_revision from sky_private.release_item where catalog_version=version
    union all select 'item',id,owner_revision from sky_private.release_lookup where catalog_version=version
    union all select 'spirit',id,owner_revision from sky_private.release_spirit where catalog_version=version
    union all select 'season',id,owner_revision from sky_private.release_season where catalog_version=version
  ) members join sky_private.domain_identity i using(kind,id)
    where i.revision<>members.owner_revision or i.fixture or i.retired_at is not null) into invalid_owner;
  if invalid_order or invalid_owner
    or exists(select 1 from sky_private.release_item r join sky_private.item i using(id) where r.catalog_version=version and i.record_status<>'published')
    or exists(select 1 from sky_private.release_spirit r join sky_private.spirit s using(id) where r.catalog_version=version and s.record_status<>'published')
    or exists(select 1 from sky_private.release_season r join sky_private.season s using(id) where r.catalog_version=version and s.record_status<>'published')
    or exists(select 1 from sky_private.release_provenance r join sky_private.provenance p using(id) where r.catalog_version=version and (p.source_id<>'K15' or p.source_url is null or p.verification_status not in('verified','stale'))) then
    raise exception 'Invalid release membership/order' using errcode='23514';
  end if;
  return null;
end;
$$;
do $$
declare table_name text;
begin
  foreach table_name in array array['public_release','release_dataset','release_source','release_source_snapshot','release_source_path','release_import_summary',
    'release_item','release_lookup','release_spirit','release_season','release_provenance'] loop
    execute format('alter table sky_private.%I enable row level security',table_name);
    execute format('create constraint trigger release_metadata_state after insert or update or delete on sky_private.%I deferrable initially deferred for each row execute function sky_private.validate_release_metadata()',table_name);
    execute format('create trigger release_metadata_truncate before truncate on sky_private.%I for each statement execute function sky_private.guard_evidence_truncate()',table_name);
  end loop;
end;
$$;
create function sky_private.guard_release_reservation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  raise exception 'Release version reservations are permanent' using errcode='23514';
end;
$$;
create trigger release_identity_history before update or delete on sky_private.public_release
for each row execute function sky_private.guard_release_reservation();
-- Cover the explicit dataset FK, including its generated subtype discriminator.
create index release_item_dataset_idx on sky_private.release_item(catalog_version,dataset);
create index release_lookup_dataset_idx on sky_private.release_lookup(catalog_version,dataset);
create index release_spirit_dataset_idx on sky_private.release_spirit(catalog_version,dataset);
create index release_season_dataset_idx on sky_private.release_season(catalog_version,dataset);
create index release_provenance_dataset_idx on sky_private.release_provenance(catalog_version,dataset);
revoke all on all tables in schema sky_private from public;
revoke all on all functions in schema sky_private from public;
