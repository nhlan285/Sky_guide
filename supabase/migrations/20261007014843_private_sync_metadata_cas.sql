-- Private lifecycle metadata only. Future SyncStore must lock this singleton
-- before canonical writes and rollback the whole transaction on CAS false.
create table sky_private.sync_acceptance (
  revision bigint primary key check(revision between 1 and 9007199254740991),
  source_id text not null references sky_private.source_registry(id) on update restrict on delete restrict,
  catalog_version text not null references sky_private.release_projection(catalog_version) on update restrict on delete restrict,
  content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
  source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'),
  candidate_hash text not null check(candidate_hash ~ '^[a-f0-9]{64}$'),
  normalization_version text not null check(length(btrim(normalization_version))>0),
  base_revision bigint not null check(base_revision=revision-1),
  fetched_at text not null check(sky_private.iso_instant(fetched_at) is not null),
  staged_at text not null check(sky_private.iso_instant(staged_at) is not null),
  reviewer_ref text not null check(length(btrim(reviewer_ref))>0),
  reviewed_at text not null check(sky_private.iso_instant(reviewed_at) is not null),
  promoted_at text not null check(sky_private.iso_instant(promoted_at) is not null),
  valid_until text check(valid_until is null or sky_private.iso_instant(valid_until) is not null),
  check(sky_private.valid_time_range(true,fetched_at,'instant',true,staged_at,'instant')),
  check(sky_private.valid_time_range(true,staged_at,'instant',true,reviewed_at,'instant')),
  check(sky_private.valid_time_range(true,reviewed_at,'instant',true,promoted_at,'instant')),
  check(valid_until is null or sky_private.valid_time_range(true,promoted_at,'instant',true,valid_until,'instant')),
  -- Hash of the exact JSON.stringify tuple used by candidateReviewHash. Fields
  -- are constrained to hex/safe integer/domain ISO spelling; no quote escaping.
  check(candidate_hash=encode(sha256(convert_to('["'||content_hash||'",'||base_revision::text||',"'||fetched_at||'","'||staged_at||'"]','UTF8')),'hex')),
  unique(revision,source_id)
);
create index sync_acceptance_source_idx on sky_private.sync_acceptance(source_id,revision);
create index sync_acceptance_catalog_idx on sky_private.sync_acceptance(catalog_version);
create table sky_private.sync_generation (
  singleton integer primary key check(singleton=1),
  revision bigint not null check(revision between 0 and 9007199254740991),
  current_acceptance_revision bigint references sky_private.sync_acceptance(revision) on update restrict on delete restrict,
  last_promoted_at text check(last_promoted_at is null or sky_private.iso_instant(last_promoted_at) is not null),
  check((current_acceptance_revision is null)=(last_promoted_at is null)),
  check(current_acceptance_revision is null or current_acceptance_revision<=revision)
);
create index sync_generation_acceptance_idx on sky_private.sync_generation(current_acceptance_revision);
create table sky_private.sync_source_state (
  source_id text primary key references sky_private.source_registry(id) on update restrict on delete restrict,
  last_success_revision bigint,
  health text check(health in('healthy','delayed','stale','offline')),
  last_attempt_at text check(last_attempt_at is null or sky_private.iso_instant(last_attempt_at) is not null),
  failures bigint not null check(failures between 0 and 9007199254740991),
  next_retry_at text check(next_retry_at is null or sky_private.iso_instant(next_retry_at) is not null),
  check((last_success_revision is null)=(health is null)),
  check(next_retry_at is null or (last_attempt_at is not null and sky_private.valid_time_range(true,last_attempt_at,'instant',true,next_retry_at,'instant'))),
  foreign key(last_success_revision,source_id) references sky_private.sync_acceptance(revision,source_id) on update restrict on delete restrict
);
create index sync_source_success_idx on sky_private.sync_source_state(last_success_revision,source_id);
create table sky_private.sync_audit (
  revision bigint primary key check(revision between 1 and 9007199254740991),
  source_id text not null references sky_private.source_registry(id) on update restrict on delete restrict,
  outcome text not null check(outcome in('promoted','reconfirmed','failure')),
  attempt_completed_at text not null check(sky_private.iso_instant(attempt_completed_at) is not null),
  acceptance_revision bigint references sky_private.sync_acceptance(revision) on update restrict on delete restrict,
  check((outcome='failure')=(acceptance_revision is null)),
  check(acceptance_revision is null or acceptance_revision=revision),
  unique(revision,source_id)
);
create index sync_audit_source_idx on sky_private.sync_audit(source_id,revision);
create index sync_audit_acceptance_idx on sky_private.sync_audit(acceptance_revision);
-- A staged acceptance cannot be committed orphaned after a losing CAS.
alter table sky_private.sync_acceptance add constraint acceptance_audit_fk
foreign key(revision,source_id) references sky_private.sync_audit(revision,source_id) on update restrict on delete restrict deferrable initially deferred;

create function sky_private.guard_sync_history() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  raise exception 'Private sync history is immutable' using errcode='23514';
end;
$$;
create function sky_private.guard_sync_generation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op<>'UPDATE' then raise exception 'Sync control reservations are permanent' using errcode='23514';end if;
  if new.singleton<>old.singleton or new.revision<>old.revision+1
    or (old.last_promoted_at is not null and (new.last_promoted_at is null or not sky_private.valid_time_range(true,old.last_promoted_at,'instant',true,new.last_promoted_at,'instant'))) then
    raise exception 'Global sync generation/clock cannot regress or skip' using errcode='23514';
  end if;
  return new;
end;
$$;
create function sky_private.validate_sync_generation() returns trigger
language plpgsql security invoker set search_path='' as $$
declare head sky_private.sync_generation%rowtype;event sky_private.sync_audit%rowtype;accepted sky_private.sync_acceptance%rowtype;
begin
  select * into head from sky_private.sync_generation where singleton=1 for update;
  if head.revision=0 then
    if exists(select 1 from sky_private.sync_audit) or exists(select 1 from sky_private.sync_acceptance) or exists(select 1 from sky_private.sync_source_state) then
      raise exception 'Uncommitted initial sync state' using errcode='23514';end if;
    return null;
  end if;
  select * into event from sky_private.sync_audit where revision=head.revision;
  if not found or (select count(*) from sky_private.sync_audit)<>head.revision
    or (select max(revision) from sky_private.sync_audit)<>head.revision
    or head.current_acceptance_revision is distinct from (select max(revision) from sky_private.sync_acceptance) then
    raise exception 'Global sync audit continuity missing' using errcode='23514';end if;
  if head.current_acceptance_revision is not null then
    select * into accepted from sky_private.sync_acceptance where revision=head.current_acceptance_revision;
    if not found or head.last_promoted_at<>accepted.promoted_at then
      raise exception 'Global sync pointer/clock differs from acceptance' using errcode='23514';end if;
  end if;
  if exists(select 1 from sky_private.sync_acceptance a join sky_private.sync_audit e using(revision)
    where e.outcome='failure' or e.acceptance_revision<>a.revision or e.source_id<>a.source_id or e.attempt_completed_at<>a.fetched_at)
    or exists(select 1 from sky_private.sync_source_state s left join sky_private.sync_acceptance a on a.revision=s.last_success_revision
      where s.last_success_revision is not null and (a.source_id<>s.source_id or not sky_private.valid_time_range(true,a.fetched_at,'instant',true,s.last_attempt_at,'instant')))
    or not exists(select 1 from sky_private.sync_source_state where source_id=event.source_id and last_attempt_at=event.attempt_completed_at) then
    raise exception 'Sync source/private audit inconsistent' using errcode='23514';end if;
  if event.outcome<>'failure' and head.current_acceptance_revision<>event.acceptance_revision then
    raise exception 'Accepted audit does not own the current pointer' using errcode='23514';end if;
  if exists(select 1 from sky_private.sync_audit e where not exists(select 1 from sky_private.sync_source_state where source_id=e.source_id))
    or exists(select 1 from sky_private.sync_source_state s where
      s.last_attempt_at is distinct from (select attempt_completed_at from sky_private.sync_audit where source_id=s.source_id order by revision desc limit 1)
      or s.last_success_revision is distinct from (select max(revision) from sky_private.sync_acceptance where source_id=s.source_id)
      or s.failures<>(select count(*) from sky_private.sync_audit where source_id=s.source_id and outcome='failure' and revision>coalesce(s.last_success_revision,0))
      or (s.last_success_revision is not null and s.health is distinct from case when s.failures>0 then 'offline' else 'healthy' end)
      or (s.failures=0 and s.next_retry_at is not null)) then
    raise exception 'Source counters/health do not match private audit' using errcode='23514';end if;
  return null;
end;
$$;

create function sky_private.apply_sync_metadata_cas(p_source text,p_expected bigint,p_outcome text,p_acceptance bigint,p_completed_at text,p_next_retry_at text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare head sky_private.sync_generation%rowtype;source sky_private.sync_source_state%rowtype;accepted sky_private.sync_acceptance%rowtype;previous_success sky_private.sync_acceptance%rowtype;new_revision bigint;new_failures bigint;
begin
  select * into head from sky_private.sync_generation where singleton=1 for update;
  if not found then raise exception 'Missing global sync control' using errcode='23514';end if;
  if p_expected is null or p_expected<0 or p_expected>9007199254740991 then raise exception 'Invalid expected generation' using errcode='23514';end if;
  if head.revision<>p_expected then return false;end if;
  if head.revision=9007199254740991 then raise exception 'Global generation exhausted' using errcode='23514';end if;
  if p_outcome is null or p_outcome not in('promoted','reconfirmed','failure') or p_completed_at is null or not exists(select 1 from sky_private.source_registry where id=p_source) then
    raise exception 'Unknown sync operation/source' using errcode='23514';end if;
  perform sky_private.iso_instant(p_completed_at);
  select * into source from sky_private.sync_source_state where source_id=p_source for update;
  new_revision:=head.revision+1;
  if source.last_success_revision is not null then
    select * into previous_success from sky_private.sync_acceptance where revision=source.last_success_revision;
  end if;
  if source.last_attempt_at is not null and not sky_private.valid_time_range(true,source.last_attempt_at,'instant',true,p_completed_at,'instant') then
    raise exception 'Source attempt clock cannot regress' using errcode='23514';end if;
  if p_outcome='failure' then
    if p_acceptance is not null or (source.last_attempt_at is not null and sky_private.valid_time_range(true,p_completed_at,'instant',true,source.last_attempt_at,'instant'))
      or (previous_success.promoted_at is not null and not sky_private.valid_time_range(true,previous_success.promoted_at,'instant',true,p_completed_at,'instant')) then
      raise exception 'Failure cannot replay/regress or replace acceptance' using errcode='23514';end if;
    new_failures:=coalesce(source.failures,0)+1;
    insert into sky_private.sync_source_state(source_id,last_success_revision,health,last_attempt_at,failures,next_retry_at)
      values(p_source,source.last_success_revision,case when source.last_success_revision is null then null else 'offline' end,p_completed_at,new_failures,p_next_retry_at)
      on conflict(source_id) do update set health=excluded.health,last_attempt_at=excluded.last_attempt_at,failures=excluded.failures,next_retry_at=excluded.next_retry_at;
  else
    if p_next_retry_at is not null or p_acceptance is distinct from new_revision then raise exception 'Acceptance revision/retry inconsistent' using errcode='23514';end if;
    select * into accepted from sky_private.sync_acceptance where revision=p_acceptance;
    if not found or accepted.source_id<>p_source or accepted.base_revision<>p_expected or accepted.fetched_at<>p_completed_at
      or (head.last_promoted_at is not null and not sky_private.valid_time_range(true,head.last_promoted_at,'instant',true,accepted.promoted_at,'instant'))
      or (previous_success.promoted_at is not null and not sky_private.valid_time_range(true,previous_success.promoted_at,'instant',true,accepted.promoted_at,'instant')) then
      raise exception 'Acceptance source/review/global clock inconsistent' using errcode='23514';end if;
    if (p_outcome='reconfirmed') is distinct from (head.current_acceptance_revision is not null and
      exists(select 1 from sky_private.sync_acceptance where revision=head.current_acceptance_revision and content_hash=accepted.content_hash)) then
      raise exception 'Acceptance outcome differs from reviewed content' using errcode='23514';end if;
    insert into sky_private.sync_source_state(source_id,last_success_revision,health,last_attempt_at,failures,next_retry_at)
      values(p_source,accepted.revision,'healthy',p_completed_at,0,null)
      on conflict(source_id) do update set last_success_revision=excluded.last_success_revision,health=excluded.health,last_attempt_at=excluded.last_attempt_at,failures=0,next_retry_at=null;
  end if;
  insert into sky_private.sync_audit(revision,source_id,outcome,attempt_completed_at,acceptance_revision) values(new_revision,p_source,p_outcome,p_completed_at,p_acceptance);
  update sky_private.sync_generation set revision=new_revision,
    current_acceptance_revision=case when p_outcome='failure' then head.current_acceptance_revision else p_acceptance end,
    last_promoted_at=case when p_outcome='failure' then head.last_promoted_at else accepted.promoted_at end where singleton=1;
  return true;
end;
$$;
do $$
declare table_name text;
begin
  foreach table_name in array array['sync_acceptance','sync_audit','sync_source_state','sync_generation'] loop
    execute format('alter table sky_private.%I enable row level security',table_name);
    execute format('create constraint trigger sync_consistency after insert or update or delete on sky_private.%I deferrable initially deferred for each row execute function sky_private.validate_sync_generation()',table_name);
    execute format('create trigger sync_no_truncate before truncate on sky_private.%I for each statement execute function sky_private.guard_sync_history()',table_name);
  end loop;
  foreach table_name in array array['sync_acceptance','sync_audit'] loop
    execute format('create trigger sync_immutable before update or delete on sky_private.%I for each row execute function sky_private.guard_sync_history()',table_name);
  end loop;
end;
$$;
create trigger sync_global_history before update or delete on sky_private.sync_generation for each row execute function sky_private.guard_sync_generation();
create trigger sync_source_reservations before delete on sky_private.sync_source_state for each row execute function sky_private.guard_sync_history();
insert into sky_private.sync_generation(singleton,revision,current_acceptance_revision,last_promoted_at) values(1,0,null,null);
revoke all on all tables in schema sky_private from public;
revoke all on all functions in schema sky_private from public;
