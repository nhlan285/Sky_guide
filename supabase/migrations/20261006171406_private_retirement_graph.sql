-- Retained history and typed same-kind alias chains; no fabricated identities.
create table sky_private.alias (
  kind text not null,
  from_id text not null check (length(btrim(from_id)) > 0),
  target_identity_id text,
  target_alias_id text,
  to_id text generated always as (coalesce(target_identity_id, target_alias_id)) stored,
  primary key (kind, from_id),
  check (num_nonnulls(target_identity_id, target_alias_id) = 1),
  foreign key (kind, target_identity_id) references sky_private.domain_identity(kind,id)
    on update restrict on delete restrict deferrable initially deferred,
  foreign key (kind, target_alias_id) references sky_private.alias(kind,from_id)
    on update restrict on delete restrict deferrable initially deferred
);
create index alias_identity_target_idx on sky_private.alias(kind,target_identity_id);
create index alias_alias_target_idx on sky_private.alias(kind,target_alias_id);

create table sky_private.tombstone (
  kind text not null,
  id text not null,
  retired_at text not null check (sky_private.iso_instant(retired_at) is not null),
  replacement_id text,
  primary key (kind,id),
  foreign key (kind,id) references sky_private.domain_identity(kind,id)
    on update restrict on delete restrict,
  foreign key (kind,replacement_id) references sky_private.domain_identity(kind,id)
    on update restrict on delete restrict
);
create index tombstone_replacement_idx on sky_private.tombstone(kind,replacement_id);

create function sky_private.guard_retirement_history() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op in ('DELETE','TRUNCATE') then
    raise exception 'Retirement history cannot be discarded' using errcode = '23514';
  end if;
  -- Generated to_id is computed after BEFORE triggers, so compare writable
  -- alias columns rather than comparing its temporarily unset generated value.
  if tg_table_name = 'alias' then
    if (new.kind,new.from_id,new.target_identity_id,new.target_alias_id) is distinct from
      (old.kind,old.from_id,old.target_identity_id,old.target_alias_id) then
      raise exception 'Retirement history cannot be remapped' using errcode = '23514';
    end if;
  else
    if new is distinct from old then
      raise exception 'Retirement history cannot be remapped' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger alias_history before update or delete on sky_private.alias
for each row execute function sky_private.guard_retirement_history();
create trigger alias_reservations before truncate on sky_private.alias
for each statement execute function sky_private.guard_retirement_history();
create trigger tombstone_history before update or delete on sky_private.tombstone
for each row execute function sky_private.guard_retirement_history();
create trigger tombstone_reservations before truncate on sky_private.tombstone
for each statement execute function sky_private.guard_retirement_history();

create function sky_private.validate_retirement_graph() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  entry record;
  target text;
  next_target text;
  visited text[];
  replacement text;
begin
  -- One reserved lock namespace for this private graph; no session locks/state.
  -- All modifying transactions validate at commit after acquiring this lock.
  perform pg_advisory_xact_lock(1397442884,1);
  if exists (
    select 1 from sky_private.domain_identity i left join sky_private.tombstone t
      on (t.kind,t.id)=(i.kind,i.id)
    where (i.retired_at is not null) <> (t.id is not null)
      or (t.id is not null and t.retired_at is distinct from i.retired_at)
  ) or exists (
    select 1 from sky_private.tombstone t join sky_private.domain_identity i
      on (i.kind,i.id)=(t.kind,t.replacement_id) where i.retired_at is not null
  ) then
    raise exception 'Tombstone must match retirement and active same-kind replacement' using errcode = '23514';
  end if;
  for entry in select kind,from_id,to_id from sky_private.alias loop
    if exists (select 1 from sky_private.domain_identity i
      where (i.kind,i.id)=(entry.kind,entry.from_id) and i.retired_at is null) then
      raise exception 'Alias cannot reuse an active identity' using errcode = '23514';
    end if;
    visited := array[entry.from_id];
    target := entry.to_id;
    loop
      if target = any(visited) then
        raise exception 'Alias cycle' using errcode = '23514';
      end if;
      visited := array_append(visited,target);
      select a.to_id into next_target from sky_private.alias a
        where a.kind=entry.kind and a.from_id=target;
      if found then target := next_target;
      else exit;
      end if;
    end loop;
    if not exists (select 1 from sky_private.domain_identity i
      where (i.kind,i.id)=(entry.kind,target) and i.retired_at is null) then
      raise exception 'Alias final target must be active and same kind' using errcode = '23514';
    end if;
    select t.replacement_id into replacement from sky_private.tombstone t
      where (t.kind,t.id)=(entry.kind,entry.from_id);
    if replacement is not null and replacement <> target then
      raise exception 'Alias and tombstone replacement disagree' using errcode = '23514';
    end if;
  end loop;
  return null;
end;
$$;
create constraint trigger identity_retirement_graph after insert or update on sky_private.domain_identity
deferrable initially deferred for each row execute function sky_private.validate_retirement_graph();
create constraint trigger alias_retirement_graph after insert or update on sky_private.alias
deferrable initially deferred for each row execute function sky_private.validate_retirement_graph();
create constraint trigger tombstone_retirement_graph after insert or update on sky_private.tombstone
deferrable initially deferred for each row execute function sky_private.validate_retirement_graph();

alter table sky_private.alias enable row level security;
alter table sky_private.tombstone enable row level security;
revoke all on sky_private.alias,sky_private.tombstone from public;
revoke all on function sky_private.guard_retirement_history(),sky_private.validate_retirement_graph() from public;
