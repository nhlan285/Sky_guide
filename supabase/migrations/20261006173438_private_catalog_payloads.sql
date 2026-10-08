-- Current K15 typed payload owners; no JSON/EAV canonical columns or real seed.
create function sky_private.valid_partial_time(present boolean, value text, p_precision text, timezone text, raw_label text)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare parts text[];
begin
  if not present then return num_nonnulls(value,p_precision,timezone,raw_label)=0; end if;
  if value is null or p_precision is null or p_precision not in ('date','instant','unknown') then return false; end if;
  if p_precision='date' then
    parts:=regexp_match(value,'^([0-9]{4})-([0-9]{2})-([0-9]{2})$');
    if parts is null then return false; end if;
    perform make_date(case when parts[1]::integer=0 then -1 else parts[1]::integer end,parts[2]::integer,parts[3]::integer);
  elsif p_precision='instant' then perform sky_private.iso_instant(value);
  end if;
  return true;
end;
$$;

-- Exact arbitrary fractional precision for range comparisons; stored text is
-- unchanged. Do not use rounded PostgreSQL microseconds as a source claim.
create function sky_private.instant_order_key(value text) returns numeric
language sql immutable strict security invoker set search_path = '' as $$
  select extract(epoch from sky_private.iso_instant(regexp_replace(value,'[.,][0-9]+','')))
    + coalesce(('0.' || (regexp_match(value,'[.,]([0-9]+)'))[1])::numeric,0);
$$;
create function sky_private.valid_time_range(start_present boolean,start_value text,start_precision text,end_present boolean,end_value text,end_precision text)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select case when not start_present or not end_present or start_precision<>end_precision then true
    when start_precision='date' then start_value<=end_value
    when start_precision='instant' then sky_private.instant_order_key(start_value)<=sky_private.instant_order_key(end_value)
    else true end;
$$;

create table sky_private.item (
  id text primary key,
  identity_kind text generated always as ('item'::text) stored,
  position integer not null unique check(position>=0),
  record_status text not null check(record_status in ('draft','reviewed','published','retired')),
  name_default text not null,
  slot text not null check(slot in ('mask','hair','cape','top','bottom','accessory','unknown')),
  raw_slot text, accessory_anchor text,
  dye_status text not null check(dye_status in ('known','unknown','unsupported')),
  field_provenance_present boolean not null,
  foreign key(identity_kind,id) references sky_private.domain_identity(kind,id) on update restrict on delete restrict
);
create index item_identity_idx on sky_private.item(identity_kind,id);
create table sky_private.spirit (
  id text primary key,
  identity_kind text generated always as ('spirit'::text) stored,
  position integer not null unique check(position>=0),
  record_status text not null check(record_status in ('draft','reviewed','published','retired')),
  name_default text not null,
  category text not null check(category in ('regular','seasonal','unknown')),
  -- Exact Realm subtype ID; target FK deferred until reviewed Location/Realm module.
  realm_id text check(realm_id is null or length(btrim(realm_id))>0),
  field_provenance_present boolean not null,
  foreign key(identity_kind,id) references sky_private.domain_identity(kind,id) on update restrict on delete restrict
);
create index spirit_identity_idx on sky_private.spirit(identity_kind,id);
create table sky_private.season (
  id text primary key,
  identity_kind text generated always as ('season'::text) stored,
  position integer not null unique check(position>=0),
  record_status text not null check(record_status in ('draft','reviewed','published','retired')),
  name_default text not null,
  -- K15 SeasonEvent discriminator retained; not the R3 Event Engine contract.
  kind text not null check(kind in ('season','event')),
  starts_at_present boolean not null, starts_at_value text, starts_at_precision text, starts_at_timezone text, starts_at_raw_label text,
  ends_at_present boolean not null, ends_at_value text, ends_at_precision text, ends_at_timezone text, ends_at_raw_label text,
  time_status text not null check(time_status in ('confirmed','tentative','unknown')),
  summary text,
  foreign key(identity_kind,id) references sky_private.domain_identity(kind,id) on update restrict on delete restrict,
  check(sky_private.valid_partial_time(starts_at_present,starts_at_value,starts_at_precision,starts_at_timezone,starts_at_raw_label)),
  check(sky_private.valid_partial_time(ends_at_present,ends_at_value,ends_at_precision,ends_at_timezone,ends_at_raw_label)),
  check(sky_private.valid_time_range(starts_at_present,starts_at_value,starts_at_precision,ends_at_present,ends_at_value,ends_at_precision))
);
create index season_identity_idx on sky_private.season(identity_kind,id);

-- Templates expand into distinct typed owner tables; no generic relation store.
do $$
declare owner_name text;
begin
  foreach owner_name in array array['item','spirit','season'] loop
    execute format('create table sky_private.%1$I (%2$I text not null references sky_private.%3$I(id) on update restrict on delete restrict, locale text not null, text text not null, primary key(%2$I,locale))',owner_name||'_translation',owner_name||'_id',owner_name);
  end loop;
end;
$$;
create table sky_private.item_source_key (
  item_id text not null references sky_private.item(id) on update restrict on delete restrict,
  label text not null, value text not null, primary key(item_id,label)
);
do $$
declare edge record;
begin
  for edge in select * from (values
    ('item','season'),('item','spirit'),('spirit','season'),('season','spirit'),('season','item')
  ) as edges(owner_name,target_name) loop
    execute format('create table sky_private.%1$I (%2$I text not null references sky_private.%3$I(id) on update restrict on delete restrict, %4$I text not null references sky_private.%5$I(id) on update restrict on delete restrict, position integer not null check(position>=0), primary key(%2$I,%4$I),unique(%2$I,position))',edge.owner_name||'_'||edge.target_name,edge.owner_name||'_id',edge.owner_name,edge.target_name||'_id',edge.target_name);
    execute format('create index %1$I on sky_private.%2$I(%3$I)',edge.owner_name||'_'||edge.target_name||'_target_idx',edge.owner_name||'_'||edge.target_name,edge.target_name||'_id');
  end loop;
end;
$$;
-- Target modules remain deferred. Preserve exact ordered domain IDs; do not
-- silently null/drop values or turn these rows into verified published targets.
do $$
declare edge record;
begin
  for edge in select * from (values
    ('item','asset'),('item','rule'),('spirit','tree'),('season','realm'),('season','map'),('season','article')
  ) as edges(owner_name,target_name) loop
    execute format('create table sky_private.%1$I (%2$I text not null references sky_private.%3$I(id) on update restrict on delete restrict, %4$I text not null check(length(btrim(%4$I))>0),position integer not null check(position>=0),primary key(%2$I,%4$I),unique(%2$I,position))',edge.owner_name||'_'||edge.target_name,edge.owner_name||'_id',edge.owner_name,edge.target_name||'_id');
  end loop;
end;
$$;

-- A field row preserves field presence separately from the optional empty map.
-- Each declared field requires nonempty evidence, matching existing validators.
-- This is typed provenance
-- binding metadata only, never a field/value/EAV canonical payload table.
create table sky_private.field_provenance_field (
  kind text not null,id text not null,field text not null,
  primary key(kind,id,field),
  foreign key(kind,id) references sky_private.domain_identity(kind,id) on update restrict on delete restrict,
  check((kind='item' and field in ('id','sourceKeys','name','slot','rawSlot','accessoryAnchor','seasonIds','spiritIds','acquisitionOptions','assetIds','dyeRegions','dyeStatus','ruleIds','compatibility','provenanceIds','updatedAt','recordStatus','fixture','fieldProvenance'))
    or (kind='spirit' and field in ('id','name','category','realmId','seasonIds','treeIds','provenanceIds','updatedAt','recordStatus','fixture','fieldProvenance'))
    or (kind='season' and field in ('id','kind','name','startsAt','endsAt','timeStatus','summary','spiritIds','itemIds','realmIds','mapIds','officialArticleIds','provenanceIds','updatedAt','recordStatus','fixture','fieldProvenance')))
);
create table sky_private.field_provenance (
  kind text not null,id text not null,field text not null,provenance_id text not null references sky_private.provenance(id) on update restrict on delete restrict,
  position integer not null check(position>=0), primary key(kind,id,field,provenance_id),unique(kind,id,field,position),
  foreign key(kind,id,field) references sky_private.field_provenance_field(kind,id,field) on update restrict on delete restrict
);
create index field_provenance_provenance_idx on sky_private.field_provenance(provenance_id);
create function sky_private.validate_field_evidence() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare owner_kind text;owner_id text;owner_field text;idx integer;owner_count integer;
begin
  owner_count:=case when tg_op='UPDATE' then 2 else 1 end;
  for idx in 1..owner_count loop
    if tg_op='DELETE' or idx=2 then owner_kind:=old.kind;owner_id:=old.id;owner_field:=old.field;
    else owner_kind:=new.kind;owner_id:=new.id;owner_field:=new.field;end if;
    perform 1 from sky_private.field_provenance_field where kind=owner_kind and id=owner_id and field=owner_field for update;
    if found and not exists(select 1 from sky_private.field_provenance where kind=owner_kind and id=owner_id and field=owner_field) then
      raise exception 'Declared field requires nonempty provenance' using errcode='23514';
    end if;
  end loop;
  return null;
end;
$$;
create constraint trigger field_state after insert or update on sky_private.field_provenance_field
deferrable initially deferred for each row execute function sky_private.validate_field_evidence();
create constraint trigger field_evidence after insert or update or delete on sky_private.field_provenance
deferrable initially deferred for each row execute function sky_private.validate_field_evidence();
create table sky_private.provenance_order (
  provenance_id text primary key references sky_private.provenance(id) on update restrict on delete restrict,
  position integer not null unique check(position>=0)
);

create table sky_private.acquisition_option (
  item_id text not null references sky_private.item(id) on update restrict on delete restrict,
  option_id text not null check(length(btrim(option_id))>0), position integer not null check(position>=0),
  kind text not null check(kind in ('spirit_tree','iap','other','unknown')),
  cost_status text not null check(cost_status in ('known','unknown','free')),
  -- Exact nullable typed refs; target FKs deferred until Node/IAP modules exist.
  friendship_node_id text check(friendship_node_id is null or length(btrim(friendship_node_id))>0),
  iap_product_id text check(iap_product_id is null or length(btrim(iap_product_id))>0),
  valid_from_present boolean not null,valid_from_value text,valid_from_precision text,valid_from_timezone text,valid_from_raw_label text,
  valid_to_present boolean not null,valid_to_value text,valid_to_precision text,valid_to_timezone text,valid_to_raw_label text,
  primary key(item_id,option_id),unique(item_id,position),
  check(sky_private.valid_partial_time(valid_from_present,valid_from_value,valid_from_precision,valid_from_timezone,valid_from_raw_label)),
  check(sky_private.valid_partial_time(valid_to_present,valid_to_value,valid_to_precision,valid_to_timezone,valid_to_raw_label)),
  check(sky_private.valid_time_range(valid_from_present,valid_from_value,valid_from_precision,valid_to_present,valid_to_value,valid_to_precision))
);
create table sky_private.acquisition_cost (
  item_id text not null,option_id text not null,position integer not null check(position>=0),
  currency text not null check(currency in ('candle','heart','other')),
  source_currency_label text not null,
  amount bigint check(amount between 0 and 9007199254740991),
  primary key(item_id,option_id,position),
  foreign key(item_id,option_id) references sky_private.acquisition_option(item_id,option_id) on update restrict on delete restrict,
  check(currency<>'other' or length(btrim(source_currency_label))>0)
);
create table sky_private.acquisition_provenance (
  item_id text not null,option_id text not null,provenance_id text not null references sky_private.provenance(id) on update restrict on delete restrict,
  position integer not null check(position>=0),primary key(item_id,option_id,provenance_id),unique(item_id,option_id,position),
  foreign key(item_id,option_id) references sky_private.acquisition_option(item_id,option_id) on update restrict on delete restrict
);
create index acquisition_provenance_provenance_idx on sky_private.acquisition_provenance(provenance_id);
create table sky_private.item_k15 (
  id text primary key references sky_private.item(id) on update restrict on delete restrict,
  position integer not null unique check(position>=0),
  upstream_id bigint not null check(upstream_id between 0 and 9007199254740991),
  identifier text not null check(length(btrim(identifier))>0),
  category text not null check(category in ('hair','mask','face-accessory','cape','outfit','shoes','head-accessory','neck-accessory','prop','instrument','music-sheet','expression','other','unknown')),
  category_evidence text,
  image_present boolean not null,images_present boolean not null,
  check(id='tsa-cosmetic-'||upstream_id::text)
);
create table sky_private.acquisition_source_offer (
  item_id text not null references sky_private.item_k15(id) on update restrict on delete restrict,
  option_id text not null,position integer not null check(position>=0),
  acquisition text not null check(acquisition in ('spirit-current','spirit-seasonal','season-items','shop','default','unknown')),
  season_pass boolean not null,bundle boolean not null,
  raw_money double precision check(raw_money>=0 and raw_money<'Infinity'::double precision),
  source_url text not null check(length(btrim(source_url))>0),
  primary key(item_id,option_id),unique(item_id,position),
  foreign key(item_id,option_id) references sky_private.acquisition_option(item_id,option_id) on update restrict on delete restrict
);

create function sky_private.validate_acquisition_state() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare owner_item text;owner_option text;state text;owner_count integer;idx integer;
begin
  owner_count:=case when tg_op='UPDATE' then 2 else 1 end;
  for idx in 1..owner_count loop
    if tg_op='DELETE' or idx=2 then owner_item:=old.item_id;owner_option:=old.option_id;
    else owner_item:=new.item_id;owner_option:=new.option_id;end if;
    select cost_status into state from sky_private.acquisition_option
      where item_id=owner_item and option_id=owner_option for update;
    if found then
      if not exists(select 1 from sky_private.acquisition_provenance where item_id=owner_item and option_id=owner_option)
        or (state='known' and (not exists(select 1 from sky_private.acquisition_cost where item_id=owner_item and option_id=owner_option)
          or exists(select 1 from sky_private.acquisition_cost where item_id=owner_item and option_id=owner_option and amount is null)))
        or (state='free' and exists(select 1 from sky_private.acquisition_cost where item_id=owner_item and option_id=owner_option and (amount is null or amount<>0))) then
        raise exception 'Acquisition evidence/cost status inconsistent' using errcode='23514';
      end if;
    end if;
  end loop;
  return null;
end;
$$;
create constraint trigger option_state after insert or update on sky_private.acquisition_option
deferrable initially deferred for each row execute function sky_private.validate_acquisition_state();
create constraint trigger cost_state after insert or update or delete on sky_private.acquisition_cost
deferrable initially deferred for each row execute function sky_private.validate_acquisition_state();
create constraint trigger acquisition_evidence_state after insert or update or delete on sky_private.acquisition_provenance
deferrable initially deferred for each row execute function sky_private.validate_acquisition_state();

-- Prevent statement-level bypass of acquisition constraints and deletion/reuse
-- of entity payloads. Child replacement still belongs to a revision/CAS transaction.
do $$
declare table_name text;
begin
  foreach table_name in array array['item','spirit','season'] loop
    execute format('create trigger payload_history before delete on sky_private.%I for each row execute function sky_private.guard_identity_history()',table_name);
    execute format('create trigger payload_reservations before truncate on sky_private.%I for each statement execute function sky_private.guard_identity_history()',table_name);
  end loop;
  foreach table_name in array array['acquisition_option','acquisition_cost','acquisition_provenance','field_provenance'] loop
    execute format('create trigger acquisition_reservations before truncate on sky_private.%I for each statement execute function sky_private.guard_evidence_truncate()',table_name);
  end loop;
  foreach table_name in array array[
    'item','spirit','season','item_translation','spirit_translation','season_translation','item_source_key',
    'item_season','item_spirit','spirit_season','season_spirit','season_item','item_asset','item_rule','spirit_tree','season_realm','season_map','season_article',
    'field_provenance_field','field_provenance','provenance_order','acquisition_option','acquisition_cost','acquisition_provenance','item_k15','acquisition_source_offer'
  ] loop execute format('alter table sky_private.%I enable row level security',table_name);end loop;
end;
$$;
revoke all on all tables in schema sky_private from public;
revoke all on all functions in schema sky_private from public;
