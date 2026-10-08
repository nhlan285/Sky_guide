-- Portable PostgreSQL foundation subset. No public API grants or real-data seed.
-- Public domain timestamp spelling is retained; comparisons use parsed instants.
create schema sky_private;
revoke all on schema sky_private from public;

alter default privileges in schema sky_private revoke all on tables from public;
alter default privileges in schema sky_private revoke execute on functions from public;

create function sky_private.iso_instant(value text) returns timestamptz
language plpgsql immutable strict security invoker set search_path = '' as $$
declare
  parts text[];
  offset_parts text[];
  offset_minutes integer := 0;
  year_value integer;
  instant timestamptz;
begin
  parts := regexp_match(value,
    '^([0-9]{4})-([0-9]{2})-([0-9]{2})[Tt]([0-9]{2}):([0-9]{2})(?::([0-9]{2})(?:[.,]([0-9]+))?)?([Zz]|[+-][0-9]{2}(?::?[0-9]{2})?)$');
  if parts is null or parts[4]::integer > 23 or parts[5]::integer > 59
    or coalesce(parts[6], '0')::integer > 59 then
    raise exception 'Invalid domain instant' using errcode = '22007';
  end if;
  if upper(parts[8]) <> 'Z' then
    offset_parts := regexp_match(parts[8], '^([+-])([0-9]{2})(?::?([0-9]{2}))?$');
    if offset_parts[2]::integer > 23 or coalesce(offset_parts[3], '0')::integer > 59 then
      raise exception 'Invalid domain offset' using errcode = '22007';
    end if;
    offset_minutes := (offset_parts[2]::integer * 60 + coalesce(offset_parts[3], '0')::integer)
      * case when offset_parts[1] = '-' then -1 else 1 end;
  end if;
  -- PostgreSQL represents astronomical year zero as 1 BC.
  year_value := case when parts[1]::integer = 0 then -1 else parts[1]::integer end;
  instant := make_timestamptz(year_value, parts[2]::integer, parts[3]::integer,
    parts[4]::integer, parts[5]::integer,
    (coalesce(parts[6], '0') || '.' || coalesce(parts[7], '0'))::double precision, 'UTC');
  return instant - make_interval(mins => offset_minutes);
end;
$$;

create table sky_private.source_registry (
  id text primary key check (id in (
    'K01','K02','K03','K04','K05','K06','K07','K08','K09','K10','K11','K12','K13','K14','K15'
  ))
);

create table sky_private.provenance (
  id text primary key check (length(btrim(id)) > 0),
  source_id text not null references sky_private.source_registry(id) on update restrict on delete restrict,
  source_url text,
  source_record_key text,
  source_revision text,
  retrieved_at text not null check (sky_private.iso_instant(retrieved_at) is not null),
  observed_at text check (observed_at is null or sky_private.iso_instant(observed_at) is not null),
  attribution text not null,
  license_note text not null,
  transform_note text not null,
  verification_status text not null check (verification_status in ('pending','verified','conflict','stale'))
);
create index provenance_source_id_idx on sky_private.provenance(source_id);

create table sky_private.domain_identity (
  kind text not null check (kind in (
    'item','spirit','season','location','cosmetic','event','eventRule','eventOverride',
    'eventOccurrence','sampleSet','instrument','emote','call','media'
  )),
  id text not null check (length(btrim(id)) > 0),
  revision bigint not null check (revision between 1 and 9007199254740991),
  schema_version integer not null check (schema_version = 1),
  updated_at text not null check (sky_private.iso_instant(updated_at) is not null),
  retired_at text check (retired_at is null or sky_private.iso_instant(retired_at) <= sky_private.iso_instant(updated_at)),
  fixture boolean not null,
  primary key (kind, id)
);

create table sky_private.identity_provenance (
  kind text not null,
  id text not null,
  provenance_id text not null references sky_private.provenance(id) on update restrict on delete restrict,
  position integer not null check (position >= 0),
  primary key (kind, id, provenance_id),
  unique (kind, id, position),
  foreign key (kind, id) references sky_private.domain_identity(kind, id) on update restrict on delete restrict
);
create index identity_provenance_provenance_id_idx on sky_private.identity_provenance(provenance_id);

create table sky_private.source_crosswalk (
  source_id text not null references sky_private.source_registry(id) on update restrict on delete restrict,
  kind text not null,
  source_key text not null check (length(btrim(source_key)) > 0),
  target_id text not null,
  primary key (source_id, kind, source_key),
  foreign key (kind, target_id) references sky_private.domain_identity(kind, id) on update restrict on delete restrict
);
create index source_crosswalk_target_idx on sky_private.source_crosswalk(kind, target_id);

create function sky_private.guard_identity_history() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op in ('DELETE', 'TRUNCATE') then
    raise exception 'Identity reservations cannot be deleted' using errcode = '23514';
  end if;
  if new.kind <> old.kind or new.id <> old.id or new.revision < old.revision
    or sky_private.iso_instant(new.updated_at) < sky_private.iso_instant(old.updated_at)
    or (old.retired_at is not null and new.retired_at is distinct from old.retired_at)
    or (new is distinct from old and new.revision <= old.revision) then
    raise exception 'Identity history cannot regress, be reused or change without revision' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger identity_history before update or delete on sky_private.domain_identity
for each row execute function sky_private.guard_identity_history();
create trigger identity_reservations before truncate on sky_private.domain_identity
for each statement execute function sky_private.guard_identity_history();

create function sky_private.guard_crosswalk_history() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op in ('DELETE', 'TRUNCATE') then
    raise exception 'Source crosswalks cannot be discarded or remapped' using errcode = '23514';
  end if;
  if new is distinct from old then
    raise exception 'Source crosswalks cannot be discarded or remapped' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger crosswalk_history before update or delete on sky_private.source_crosswalk
for each row execute function sky_private.guard_crosswalk_history();
create trigger crosswalk_reservations before truncate on sky_private.source_crosswalk
for each statement execute function sky_private.guard_crosswalk_history();

-- Deferred so a transaction can insert an identity and its evidence in any order
-- supported by the FKs. Lock the owner to serialize concurrent evidence removal.
create function sky_private.require_identity_evidence() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  owner_kind text;
  owner_id text;
  is_fixture boolean;
begin
  if tg_op = 'DELETE' then owner_kind := old.kind; owner_id := old.id;
  else owner_kind := new.kind; owner_id := new.id;
  end if;
  select fixture into is_fixture from sky_private.domain_identity
    where kind = owner_kind and id = owner_id for update;
  if is_fixture = false and not exists (
    select 1 from sky_private.identity_provenance where kind = owner_kind and id = owner_id
  ) then
    raise exception 'Nonfixture identity requires provenance' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and (old.kind, old.id) is distinct from (new.kind, new.id) then
    select fixture into is_fixture from sky_private.domain_identity
      where kind = old.kind and id = old.id for update;
    if is_fixture = false and not exists (
      select 1 from sky_private.identity_provenance where kind = old.kind and id = old.id
    ) then
      raise exception 'Previous nonfixture owner requires provenance' using errcode = '23514';
    end if;
  end if;
  return null;
end;
$$;
create constraint trigger identity_evidence after insert or update on sky_private.domain_identity
deferrable initially deferred for each row execute function sky_private.require_identity_evidence();
create constraint trigger provenance_evidence after insert or update or delete on sky_private.identity_provenance
deferrable initially deferred for each row execute function sky_private.require_identity_evidence();

alter table sky_private.source_registry enable row level security;
alter table sky_private.provenance enable row level security;
alter table sky_private.domain_identity enable row level security;
alter table sky_private.identity_provenance enable row level security;
alter table sky_private.source_crosswalk enable row level security;
revoke all on all tables in schema sky_private from public;
revoke all on all functions in schema sky_private from public;

-- Supabase-specific access hardening; skipped on plain PostgreSQL without these
-- platform roles. No provider-specific columns, functions or domain semantics.
do $$
declare role_name text;
begin
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      execute format('revoke all on schema sky_private from %I', role_name);
      execute format('revoke all on all tables in schema sky_private from %I', role_name);
      execute format('revoke all on all functions in schema sky_private from %I', role_name);
      execute format('alter default privileges in schema sky_private revoke all on tables from %I', role_name);
      execute format('alter default privileges in schema sky_private revoke execute on functions from %I', role_name);
    end if;
  end loop;
end;
$$;
