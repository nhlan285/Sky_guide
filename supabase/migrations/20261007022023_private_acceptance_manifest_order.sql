-- Public manifest bytes sort keys, reviewed SourceSync content retains Record
-- dataset key order. Preserve both existing contracts using typed review metadata.
create table sky_private.acceptance_manifest_dataset (
 acceptance_revision bigint not null references sky_private.sync_acceptance(revision) on update restrict on delete restrict,
 dataset text not null check(dataset in('items','lookup','spirits','seasons')),
 position integer not null check(position between 0 and 3),
 primary key(acceptance_revision,dataset),unique(acceptance_revision,position)
);
create function sky_private.guard_manifest_order() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op<>'INSERT' then raise exception 'Acceptance dataset order is immutable' using errcode='23514';end if;
 perform 1 from sky_private.sync_acceptance where revision=new.acceptance_revision for update;
 if not found then raise exception 'Acceptance dataset order parent is missing' using errcode='23503';end if;
 return new;
end;
$$;
create function sky_private.validate_manifest_order() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if (select count(*) from sky_private.acceptance_manifest_dataset where acceptance_revision=new.acceptance_revision)<>4 then
  raise exception 'Acceptance requires all four ordered datasets' using errcode='23514';end if;
 return null;
end;
$$;
create trigger immutable_manifest_order before insert or update or delete on sky_private.acceptance_manifest_dataset
for each row execute function sky_private.guard_manifest_order();
create trigger immutable_manifest_order_truncate before truncate on sky_private.acceptance_manifest_dataset
for each statement execute function sky_private.guard_evidence_truncate();
create constraint trigger complete_manifest_order after insert on sky_private.acceptance_manifest_dataset
deferrable initially deferred for each row execute function sky_private.validate_manifest_order();
alter table sky_private.acceptance_manifest_dataset enable row level security;
revoke all on all tables in schema sky_private from public;
revoke all on all functions in schema sky_private from public;
