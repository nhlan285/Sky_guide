-- REVIEW PROPOSAL ONLY. Not in migrations; NOT APPLIED. Requires v2 journal/Store
-- integration and updated scoped ACL package before any installation or mount.
-- Do not run against production. No role/policy/grant/extension/provider change.
create table sky_private.sync_commit_intent (
 id uuid primary key check(id::text ~ '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'),
 format_version integer not null check(format_version=2),
 source_id text not null check(source_id in('K01','K02','K03','K04','K05','K06','K07','K08','K09','K10','K11','K12','K13','K14','K15')),
 expected_revision bigint not null check(expected_revision between 0 and 9007199254740990),
 target_revision bigint generated always as (expected_revision+1) stored,
 state_digest text not null check(state_digest ~ '^[a-f0-9]{64}$'),
 outcome text not null check(outcome in('promoted','reconfirmed','failure')),
 attempt_completed_at text not null check(sky_private.iso_instant(attempt_completed_at) is not null),
 next_failures bigint not null check(next_failures between 0 and 9007199254740991),
 next_retry_at text check(next_retry_at is null or sky_private.iso_instant(next_retry_at) is not null),
 next_health text check(next_health in('healthy','offline')),
 next_success_at text check(next_success_at is null or sky_private.iso_instant(next_success_at) is not null),
 next_valid_until text check(next_valid_until is null or sky_private.iso_instant(next_valid_until) is not null),
 global_source_id text check(global_source_id in('K01','K02','K03','K04','K05','K06','K07','K08','K09','K10','K11','K12','K13','K14','K15')),
 global_catalog_version text check(global_catalog_version is null or length(btrim(global_catalog_version))>0),
 global_content_hash text check(global_content_hash is null or global_content_hash ~ '^[a-f0-9]{64}$'),
 global_source_hash text check(global_source_hash is null or global_source_hash ~ '^[a-f0-9]{64}$'),
 global_candidate_hash text check(global_candidate_hash is null or global_candidate_hash ~ '^[a-f0-9]{64}$'),
 global_normalization_version text check(global_normalization_version is null or length(btrim(global_normalization_version))>0),
 global_base_revision bigint check(global_base_revision between 0 and 9007199254740990),
 global_fetched_at text check(global_fetched_at is null or sky_private.iso_instant(global_fetched_at) is not null),
 global_staged_at text check(global_staged_at is null or sky_private.iso_instant(global_staged_at) is not null),
 global_reviewer_ref text check(global_reviewer_ref is null or length(btrim(global_reviewer_ref))>0),
 global_reviewed_at text check(global_reviewed_at is null or sky_private.iso_instant(global_reviewed_at) is not null),
 global_promoted_at text check(global_promoted_at is null or sky_private.iso_instant(global_promoted_at) is not null),
 global_valid_until text check(global_valid_until is null or sky_private.iso_instant(global_valid_until) is not null),
 unique(id,target_revision,state_digest),
 check((next_health is null)=(next_success_at is null)),
 check(next_success_at is not null or next_valid_until is null),
 check(next_retry_at is null or next_failures>0 and sky_private.valid_time_range(true,attempt_completed_at,'instant',true,next_retry_at,'instant')),
 check(next_valid_until is null or sky_private.valid_time_range(true,next_success_at,'instant',true,next_valid_until,'instant')),
 check((outcome='failure' and next_failures>0 and (next_health is null or next_health='offline'))
   or (outcome<>'failure' and next_failures=0 and next_retry_at is null and next_health is not null and next_health='healthy')),
 check(num_nonnulls(global_source_id,global_catalog_version,global_content_hash,global_source_hash,global_candidate_hash,global_normalization_version,
   global_base_revision,global_fetched_at,global_staged_at,global_reviewer_ref,global_reviewed_at,global_promoted_at) in(0,12)),
 check(global_source_id is not null or global_valid_until is null),
 check(global_source_id is null or global_base_revision<=expected_revision),
 check(outcome='failure' or global_source_id is not null and global_source_id=source_id and global_base_revision=expected_revision and global_fetched_at=attempt_completed_at
   and global_promoted_at=next_success_at and global_valid_until is not distinct from next_valid_until),
 check(global_source_id is null or sky_private.valid_time_range(true,global_fetched_at,'instant',true,global_staged_at,'instant')),
 check(global_source_id is null or sky_private.valid_time_range(true,global_staged_at,'instant',true,global_reviewed_at,'instant')),
 check(global_source_id is null or sky_private.valid_time_range(true,global_reviewed_at,'instant',true,global_promoted_at,'instant')),
 check(global_valid_until is null or sky_private.valid_time_range(true,global_promoted_at,'instant',true,global_valid_until,'instant')),
 check(global_source_id is null or global_candidate_hash=encode(sha256(convert_to('["'||global_content_hash||'",'||global_base_revision::text||',"'||global_fetched_at||'","'||global_staged_at||'"]','UTF8')),'hex')),
 check(octet_length(row(source_id,state_digest,attempt_completed_at,next_retry_at,next_health,next_success_at,next_valid_until,
   global_source_id,global_catalog_version,global_content_hash,global_source_hash,global_candidate_hash,global_normalization_version,
   global_fetched_at,global_staged_at,global_reviewer_ref,global_reviewed_at,global_promoted_at,global_valid_until)::text)<=32768)
);
-- Source ID is an allowlist, deliberately no FK: a first failed attempt can be
-- durably claimed BEFORE source_registry is inserted by the canonical transaction.
create table sky_private.sync_commit_control (
 singleton integer primary key check(singleton=1),
 active_intent_id uuid references sky_private.sync_commit_intent(id) on update restrict on delete restrict
);
create index sync_commit_control_active_idx on sky_private.sync_commit_control(active_intent_id);
create table sky_private.sync_commit_applied (
 intent_id uuid primary key,
 revision bigint not null unique references sky_private.sync_audit(revision) on update restrict on delete restrict,
 state_digest text not null,
 foreign key(intent_id,revision,state_digest) references sky_private.sync_commit_intent(id,target_revision,state_digest) on update restrict on delete restrict
);
create table sky_private.sync_commit_receipt (
 intent_id uuid primary key references sky_private.sync_commit_intent(id) on update restrict on delete restrict,
 resolution text not null check(resolution in('committed','not_committed','conflict'))
);

create function sky_private.lock_sync_commit_control() returns void
language plpgsql security invoker set search_path='' as $$
begin
 if current_setting('transaction_isolation')<>'read committed' or current_setting('transaction_read_only')<>'off' then
  raise exception 'Commit journal requires READ COMMITTED/read-write' using errcode='23514';end if;
 perform singleton from sky_private.sync_generation where singleton=1 for update;
 if not found then raise exception 'Missing global head' using errcode='23514';end if;
 perform singleton from sky_private.sync_commit_control where singleton=1 for update;
 if not found then raise exception 'Missing journal control' using errcode='23514';end if;
end;$$;

create function sky_private.activate_sync_commit_intent(p_id uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare i sky_private.sync_commit_intent%rowtype;active uuid;revision bigint;
begin
 perform sky_private.lock_sync_commit_control();
 select active_intent_id into active from sky_private.sync_commit_control where singleton=1;
 select * into i from sky_private.sync_commit_intent where id=p_id;
 if not found then raise exception 'Missing typed intent' using errcode='23514';end if;
 select h.revision into revision from sky_private.sync_generation h where singleton=1;
 if active is not null or revision<>i.expected_revision or exists(select 1 from sky_private.sync_commit_receipt where intent_id=p_id) then return false;end if;
 update sky_private.sync_commit_control set active_intent_id=p_id where singleton=1;
 return true;
end;$$;

create function sky_private.require_sync_commit_intent(p_id uuid,p_digest text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare i sky_private.sync_commit_intent%rowtype;active uuid;revision bigint;
begin
 perform sky_private.lock_sync_commit_control();
 select active_intent_id into active from sky_private.sync_commit_control where singleton=1;
 select * into i from sky_private.sync_commit_intent where id=p_id;
 select h.revision into revision from sky_private.sync_generation h where singleton=1;
 if active is distinct from p_id or p_id is null or i.id is null or p_digest is distinct from i.state_digest
  or revision<>i.expected_revision or exists(select 1 from sky_private.sync_commit_receipt where intent_id=p_id)
  or exists(select 1 from sky_private.sync_commit_applied where intent_id=p_id) then
  raise exception 'Stale or mismatched execution token' using errcode='23514';end if;
 -- Original driver MUST call this after global lock and BEFORE canonical DML.
 return true;
end;$$;

create function sky_private.validate_sync_commit_applied() returns trigger
language plpgsql security invoker set search_path='' as $$
declare i sky_private.sync_commit_intent%rowtype;h sky_private.sync_generation%rowtype;s sky_private.sync_source_state%rowtype;
 a sky_private.sync_acceptance%rowtype;own_success sky_private.sync_acceptance%rowtype;e sky_private.sync_audit%rowtype;active uuid;
begin
 perform sky_private.lock_sync_commit_control();
 select active_intent_id into active from sky_private.sync_commit_control where singleton=1;
 select * into i from sky_private.sync_commit_intent where id=new.intent_id;
 select * into h from sky_private.sync_generation where singleton=1;
 select * into s from sky_private.sync_source_state where source_id=i.source_id;
 select * into e from sky_private.sync_audit where revision=new.revision;
 select * into a from sky_private.sync_acceptance where revision=h.current_acceptance_revision;
 select * into own_success from sky_private.sync_acceptance where revision=s.last_success_revision;
 if i.id is null or active is distinct from i.id or h.revision<>i.target_revision or new.revision<>i.target_revision
  or new.state_digest is distinct from i.state_digest or exists(select 1 from sky_private.sync_commit_receipt where intent_id=i.id)
  or e.source_id is distinct from i.source_id or e.outcome is distinct from i.outcome or e.attempt_completed_at is distinct from i.attempt_completed_at
  or e.acceptance_revision is distinct from (case when i.outcome='failure' then null else i.target_revision end)
  or s.source_id is null or s.last_attempt_at is distinct from i.attempt_completed_at or s.failures is distinct from i.next_failures
  or s.next_retry_at is distinct from i.next_retry_at or s.health is distinct from i.next_health
  or own_success.promoted_at is distinct from i.next_success_at or own_success.valid_until is distinct from i.next_valid_until
  or h.last_promoted_at is distinct from i.global_promoted_at
  or row(a.source_id,a.catalog_version,a.content_hash,a.source_hash,a.candidate_hash,a.normalization_version,a.base_revision,a.fetched_at,a.staged_at,a.reviewer_ref,a.reviewed_at,a.promoted_at,a.valid_until)
   is distinct from row(i.global_source_id,i.global_catalog_version,i.global_content_hash,i.global_source_hash,i.global_candidate_hash,i.global_normalization_version,i.global_base_revision,i.global_fetched_at,i.global_staged_at,i.global_reviewer_ref,i.global_reviewed_at,i.global_promoted_at,i.global_valid_until) then
  raise exception 'Applied witness differs from complete typed intent/state' using errcode='23514';end if;
 return new;
end;$$;
create trigger sync_commit_applied_validate before insert on sky_private.sync_commit_applied
for each row execute function sky_private.validate_sync_commit_applied();

create function sky_private.apply_sync_commit_cas(p_id uuid,p_digest text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare i sky_private.sync_commit_intent%rowtype;applied boolean;
begin
 perform sky_private.require_sync_commit_intent(p_id,p_digest);
 select * into i from sky_private.sync_commit_intent where id=p_id;
 applied:=sky_private.apply_sync_metadata_cas(i.source_id,i.expected_revision,i.outcome,
  case when i.outcome='failure' then null else i.target_revision end,i.attempt_completed_at,i.next_retry_at);
 if not applied then raise exception 'Late metadata CAS conflict' using errcode='23514';end if;
 insert into sky_private.sync_commit_applied(intent_id,revision,state_digest) values(i.id,i.target_revision,i.state_digest);
 return true;
end;$$;

create function sky_private.validate_sync_commit_receipt() returns trigger
language plpgsql security invoker set search_path='' as $$
declare i sky_private.sync_commit_intent%rowtype;revision bigint;active uuid;
begin
 perform sky_private.lock_sync_commit_control();
 select active_intent_id into active from sky_private.sync_commit_control where singleton=1;
 select h.revision into revision from sky_private.sync_generation h where singleton=1;
 select * into i from sky_private.sync_commit_intent where id=new.intent_id;
 if i.id is null or active is distinct from i.id then raise exception 'Receipt does not own active intent' using errcode='23514';end if;
 if new.resolution='committed' then
  if not exists(select 1 from sky_private.sync_commit_applied p where p.intent_id=i.id and p.state_digest=i.state_digest and p.revision=i.target_revision) then
   raise exception 'Committed receipt lacks exact applied witness' using errcode='23514';end if;
 elsif new.resolution='not_committed' then
  if revision<>i.expected_revision or exists(select 1 from sky_private.sync_commit_applied where intent_id=i.id)
   or exists(select 1 from sky_private.sync_audit a where a.revision=i.target_revision) or exists(select 1 from sky_private.sync_acceptance a where a.revision=i.target_revision) then
   raise exception 'Absence settlement lacks head barrier' using errcode='23514';end if;
 elsif new.resolution='conflict' then
  if revision<i.target_revision or not exists(select 1 from sky_private.sync_audit a where a.revision=i.target_revision)
   or exists(select 1 from sky_private.sync_commit_applied where intent_id=i.id) then
   raise exception 'Conflict receipt lacks occupied target' using errcode='23514';end if;
 else raise exception 'Unknown receipt resolution' using errcode='23514';end if;
 return new;
end;$$;
create trigger sync_commit_receipt_validate before insert on sky_private.sync_commit_receipt
for each row execute function sky_private.validate_sync_commit_receipt();

create function sky_private.settle_sync_commit_intent(p_id uuid,p_resolution text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare old_resolution text;
begin
 perform sky_private.lock_sync_commit_control();
 select resolution into old_resolution from sky_private.sync_commit_receipt where intent_id=p_id;
 if found then
  if old_resolution is distinct from p_resolution then raise exception 'Terminal receipt cannot change' using errcode='23514';end if;
  return true;
 end if;
 insert into sky_private.sync_commit_receipt(intent_id,resolution) values(p_id,p_resolution);
 update sky_private.sync_commit_control set active_intent_id=null where singleton=1;
 return true;
end;$$;

create function sky_private.guard_sync_commit_control() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op<>'UPDATE' or new.singleton<>old.singleton then raise exception 'Journal singleton permanent' using errcode='23514';end if;
 if old.active_intent_id is null then
  if new.active_intent_id is null or exists(select 1 from sky_private.sync_commit_receipt where intent_id=new.active_intent_id)
   or not exists(select 1 from sky_private.sync_commit_intent i join sky_private.sync_generation h on h.singleton=1
      where i.id=new.active_intent_id and i.expected_revision=h.revision) then raise exception 'Invalid new active intent' using errcode='23514';end if;
 elsif new.active_intent_id is not null or not exists(select 1 from sky_private.sync_commit_receipt where intent_id=old.active_intent_id) then
  raise exception 'Active token requires terminal receipt before clear' using errcode='23514';end if;
 return new;
end;$$;
create trigger sync_commit_control_permanent before update or delete on sky_private.sync_commit_control
for each row execute function sky_private.guard_sync_commit_control();

create function sky_private.validate_sync_commit_intent_owner() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from sky_private.sync_commit_control where active_intent_id=new.id)
  and not exists(select 1 from sky_private.sync_commit_receipt where intent_id=new.id) then
  raise exception 'Intent has no durable active/terminal owner' using errcode='23514';end if;
 return null;
end;$$;
create constraint trigger sync_commit_intent_owner after insert on sky_private.sync_commit_intent
deferrable initially deferred for each row execute function sky_private.validate_sync_commit_intent_owner();

create function sky_private.validate_sync_commit_generation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from sky_private.sync_commit_applied where revision=new.revision) then
  raise exception 'Generation lacks durable applied witness' using errcode='23514';end if;
 return null;
end;$$;
create constraint trigger sync_commit_generation after update on sky_private.sync_generation
deferrable initially deferred for each row execute function sky_private.validate_sync_commit_generation();

do $$ declare t text;begin
 foreach t in array array['sync_commit_intent','sync_commit_control','sync_commit_applied','sync_commit_receipt'] loop
  execute format('alter table sky_private.%I enable row level security',t);
  execute format('create trigger commit_no_truncate before truncate on sky_private.%I for each statement execute function sky_private.guard_sync_history()',t);
 end loop;
 foreach t in array array['sync_commit_intent','sync_commit_applied','sync_commit_receipt'] loop
  execute format('create trigger commit_immutable before update or delete on sky_private.%I for each row execute function sky_private.guard_sync_history()',t);
 end loop;
end;$$;
insert into sky_private.sync_commit_control(singleton,active_intent_id) values(1,null);
revoke all on sky_private.sync_commit_intent,sky_private.sync_commit_control,sky_private.sync_commit_applied,sky_private.sync_commit_receipt from public;
revoke all on function sky_private.lock_sync_commit_control(),sky_private.activate_sync_commit_intent(uuid),sky_private.require_sync_commit_intent(uuid,text),
 sky_private.validate_sync_commit_applied(),sky_private.apply_sync_commit_cas(uuid,text),sky_private.validate_sync_commit_receipt(),sky_private.settle_sync_commit_intent(uuid,text),
 sky_private.guard_sync_commit_control(),sky_private.validate_sync_commit_intent_owner(),sky_private.validate_sync_commit_generation() from public;
