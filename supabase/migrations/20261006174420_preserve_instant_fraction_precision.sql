-- Correct an observed float-underflow rejection of valid source text. Because
-- immutable functions are used by CHECKs, recreate/revalidate every dependent
-- CHECK inside this migration transaction (PostgreSQL constraint guidance).
create temporary table sky_time_checks on commit drop as
select rel.relname as table_name,c.conname as constraint_name,pg_get_constraintdef(c.oid) as definition
from pg_constraint c join pg_class rel on rel.oid=c.conrelid join pg_namespace n on n.oid=c.connamespace
where n.nspname='sky_private' and c.contype='c' and exists (
  select 1 from pg_depend d join pg_proc p on p.oid=d.refobjid join pg_namespace pn on pn.oid=p.pronamespace
  where d.classid='pg_constraint'::regclass and d.objid=c.oid and d.refclassid='pg_proc'::regclass
    and pn.nspname='sky_private' and p.proname in ('iso_instant','valid_partial_time','valid_time_range','instant_order_key')
);
do $$
declare row_record record;
begin
  if (select count(*) from sky_time_checks)<>11 then raise exception 'Unexpected time CHECK inventory';end if;
  for row_record in select * from sky_time_checks loop
    execute format('alter table sky_private.%I drop constraint %I',row_record.table_name,row_record.constraint_name);
  end loop;
end;
$$;

create or replace function sky_private.iso_instant(value text) returns timestamptz
language plpgsql immutable strict security invoker set search_path = '' as $$
declare parts text[];offset_parts text[];offset_minutes integer:=0;year_value integer;fraction double precision;
begin
  parts:=regexp_match(value,'^([0-9]{4})-([0-9]{2})-([0-9]{2})[Tt]([0-9]{2}):([0-9]{2})(?::([0-9]{2})(?:[.,]([0-9]+))?)?([Zz]|[+-][0-9]{2}(?::?[0-9]{2})?)$');
  if parts is null or parts[4]::integer>23 or parts[5]::integer>59 or coalesce(parts[6],'0')::integer>59 then
    raise exception 'Invalid domain instant' using errcode='22007';
  end if;
  if upper(parts[8])<>'Z' then
    offset_parts:=regexp_match(parts[8],'^([+-])([0-9]{2})(?::?([0-9]{2}))?$');
    if offset_parts[2]::integer>23 or coalesce(offset_parts[3],'0')::integer>59 then
      raise exception 'Invalid domain offset' using errcode='22007';
    end if;
    offset_minutes:=(offset_parts[2]::integer*60+coalesce(offset_parts[3],'0')::integer)*case when offset_parts[1]='-' then -1 else 1 end;
  end if;
  year_value:=case when parts[1]::integer=0 then -1 else parts[1]::integer end;
  -- Bound ONLY the computational microsecond representation. The original text
  -- column retains every digit. Tiny fractions cannot underflow this conversion.
  fraction:=round(('0.'||left(coalesce(parts[7],'0'),7))::numeric,6)::double precision;
  return make_timestamptz(year_value,parts[2]::integer,parts[3]::integer,parts[4]::integer,parts[5]::integer,
    coalesce(parts[6],'0')::integer+fraction,'UTC')-make_interval(mins=>offset_minutes);
end;
$$;

create or replace function sky_private.valid_time_range(start_present boolean,start_value text,start_precision text,end_present boolean,end_value text,end_precision text)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare start_second timestamptz;end_second timestamptz;start_fraction text;end_fraction text;digits integer;
begin
  if not start_present or not end_present or start_precision<>end_precision then return true;end if;
  if start_precision='date' then return start_value<=end_value;end if;
  if start_precision<>'instant' then return true;end if;
  start_second:=sky_private.iso_instant(regexp_replace(start_value,'[.,][0-9]+',''));
  end_second:=sky_private.iso_instant(regexp_replace(end_value,'[.,][0-9]+',''));
  if start_second<end_second then return true;elsif start_second>end_second then return false;end if;
  start_fraction:=coalesce((regexp_match(start_value,'[.,]([0-9]+)'))[1],'');
  end_fraction:=coalesce((regexp_match(end_value,'[.,]([0-9]+)'))[1],'');
  digits:=greatest(length(start_fraction),length(end_fraction));
  return rpad(start_fraction,digits,'0') collate pg_catalog."C" <= rpad(end_fraction,digits,'0') collate pg_catalog."C";
end;
$$;
comment on function sky_private.instant_order_key(text) is
  'Legacy bounded numeric key; not used by canonical CHECKs. valid_time_range preserves arbitrary fractional text precision.';

do $$
declare row_record record;
begin
  for row_record in select * from sky_time_checks loop
    execute format('alter table sky_private.%I add constraint %I %s',row_record.table_name,row_record.constraint_name,row_record.definition);
  end loop;
end;
$$;
revoke all on all functions in schema sky_private from public;
