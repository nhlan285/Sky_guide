-- Record evidence is an ordered subset of canonical identity evidence. Preserve
-- both lists; never enlarge a reviewed/public record by copying private evidence.
create table sky_private.payload_provenance (
 kind text not null check(kind in('item','spirit','season')),id text not null,provenance_id text not null,
 position integer not null check(position>=0),
 primary key(kind,id,provenance_id),unique(kind,id,position),
 foreign key(kind,id) references sky_private.domain_identity(kind,id) on update restrict on delete restrict,
 foreign key(kind,id,provenance_id) references sky_private.identity_provenance(kind,id,provenance_id) on update restrict on delete restrict
);
create function sky_private.validate_payload_evidence() returns trigger
language plpgsql security invoker set search_path='' as $$
declare owner_kind text;owner_id text;is_fixture boolean;payload_exists boolean;idx integer;owner_count integer;n bigint;p integer;
begin
 owner_count:=case when tg_op='UPDATE' then 2 else 1 end;
 for idx in 1..owner_count loop
  if tg_op='DELETE' or idx=2 then
   if tg_table_name='payload_provenance' then owner_kind:=old.kind;else owner_kind:=tg_argv[0];end if;owner_id:=old.id;
  else
   if tg_table_name='payload_provenance' then owner_kind:=new.kind;else owner_kind:=tg_argv[0];end if;owner_id:=new.id;
  end if;
  select fixture into is_fixture from sky_private.domain_identity where (kind,id)=(owner_kind,owner_id) for update;
  payload_exists:=case owner_kind when 'item' then exists(select 1 from sky_private.item where id=owner_id)
    when 'spirit' then exists(select 1 from sky_private.spirit where id=owner_id)
    when 'season' then exists(select 1 from sky_private.season where id=owner_id) else false end;
  select count(*),max(position) into n,p from sky_private.payload_provenance where (kind,id)=(owner_kind,owner_id);
  if not payload_exists and n>0 or payload_exists and (is_fixture=false and n=0 or n>0 and p<>n-1) then
   raise exception 'Payload evidence owner/nonfixture/order differs' using errcode='23514';end if;
 end loop;
 return null;
end;
$$;
create constraint trigger payload_evidence after insert or update or delete on sky_private.payload_provenance
deferrable initially deferred for each row execute function sky_private.validate_payload_evidence();
do $$ declare owner_name text;begin
 foreach owner_name in array array['item','spirit','season'] loop
  execute format('create constraint trigger payload_owner_evidence after insert or update on sky_private.%I deferrable initially deferred for each row execute function sky_private.validate_payload_evidence(%L)',owner_name,owner_name);
 end loop;
end;$$;
create trigger payload_evidence_truncate before truncate on sky_private.payload_provenance
for each statement execute function sky_private.guard_evidence_truncate();
alter table sky_private.payload_provenance enable row level security;
-- FK prefix index is covered by the PK. Old codec rows used equal canonical and
-- record evidence. Backfill only actual payload owners, preserving spelling/order;
-- new deferred trigger validates every copied group before this migration commits.
insert into sky_private.payload_provenance(kind,id,provenance_id,position)
select p.kind,p.id,p.provenance_id,p.position from sky_private.identity_provenance p
where p.kind='item' and exists(select 1 from sky_private.item n where n.id=p.id)
 or p.kind='spirit' and exists(select 1 from sky_private.spirit n where n.id=p.id)
 or p.kind='season' and exists(select 1 from sky_private.season n where n.id=p.id);
revoke all on all tables in schema sky_private from public;
revoke all on all functions in schema sky_private from public;
