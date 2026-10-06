-- Run only against an isolated development/rehearsal DB as the migration owner.
-- Entirely synthetic; K15/K01 below are registry-scoping fixtures, not source facts.
-- The final ROLLBACK leaves no fixture data or helper functions behind.
begin;
set local statement_timeout = '30s';

insert into sky_private.source_registry(id) values ('K15'), ('K01') on conflict do nothing;
insert into sky_private.provenance values
  ('sql-fixture-proof','K15',null,'fixture-key',null,'2026-10-07t07:00:00,123+07',null,
   'Synthetic fixture','No artwork','Test only','pending');
insert into sky_private.domain_identity values
  ('item','sql-fixture-item',1,1,'2026-10-07T00:00:00Z',null,true),
  ('spirit','sql-fixture-item',1,1,'2026-10-07T00:00:00Z',null,true),
  ('item','sql-fixture-real-shaped',1,1,'2026-10-07T00:00:00Z',null,false),
  ('item','sql-fixture-retired',1,1,'2026-10-07T00:00:00Z','2026-10-07T00:00:00Z',true);
insert into sky_private.identity_provenance values ('item','sql-fixture-real-shaped','sql-fixture-proof',0);
insert into sky_private.source_crosswalk values
  ('K15','item','1','sql-fixture-item'), ('K01','item','1','sql-fixture-real-shaped'),
  ('K15','spirit','1','sql-fixture-item');
-- Keep this first-slice rehearsal reusable after the retirement slice is applied.
do $$
begin
  if to_regclass('sky_private.tombstone') is not null then
    execute $sql$insert into sky_private.tombstone values
      ('item','sql-fixture-retired','2026-10-07T00:00:00Z',null)$sql$;
  end if;
end;
$$;
set constraints all immediate;

do $$
declare
  case_row record;
  actual_state text;
  passed integer := 0;
  role_name text;
begin
  for case_row in select * from (values
    ('duplicate identity', $sql$insert into sky_private.domain_identity values ('item','sql-fixture-item',1,1,'2026-10-07T00:00:00Z',null,true)$sql$, '23505'),
    ('missing source', $sql$insert into sky_private.provenance values ('sql-fixture-missing','K14',null,null,null,'2026-10-07T00:00:00Z',null,'','','','pending')$sql$, '23503'),
    ('unknown registry ID', $sql$insert into sky_private.source_registry values ('K99')$sql$, '23514'),
    ('dangling crosswalk', $sql$insert into sky_private.source_crosswalk values ('K15','item','missing','sql-fixture-missing')$sql$, '23503'),
    ('ambiguous source key', $sql$insert into sky_private.source_crosswalk values ('K15','item','1','sql-fixture-real-shaped')$sql$, '23505'),
    ('crosswalk remap', $sql$update sky_private.source_crosswalk set target_id='sql-fixture-real-shaped' where source_id='K15' and kind='item'$sql$, '23514'),
    ('crosswalk removal', $sql$delete from sky_private.source_crosswalk where source_id='K15' and kind='item'$sql$, '23514'),
    ('crosswalk truncate', $sql$truncate sky_private.source_crosswalk$sql$, '23514'),
    ('identity removal', $sql$delete from sky_private.domain_identity where kind='item' and id='sql-fixture-retired'$sql$, '23514'),
    ('identity truncate', $sql$truncate sky_private.domain_identity cascade$sql$, '23514'),
    ('changed identity without revision', $sql$update sky_private.domain_identity set updated_at='2026-10-07T01:00:00Z' where kind='item' and id='sql-fixture-item'$sql$, '23514'),
    ('revision regression', $sql$update sky_private.domain_identity set revision=0 where kind='item' and id='sql-fixture-item'$sql$, '23514'),
    ('clock regression', $sql$update sky_private.domain_identity set revision=2,updated_at='2026-10-06T00:00:00Z' where kind='item' and id='sql-fixture-item'$sql$, '23514'),
    ('retired resurrection', $sql$update sky_private.domain_identity set revision=2,retired_at=null where kind='item' and id='sql-fixture-retired'$sql$, '23514'),
    ('changed identity key', $sql$update sky_private.domain_identity set revision=2,id='sql-fixture-reused' where kind='item' and id='sql-fixture-retired'$sql$, '23514'),
    ('evidence missing', $sql$insert into sky_private.domain_identity values ('item','sql-fixture-no-proof',1,1,'2026-10-07T00:00:00Z',null,false)$sql$, '23514'),
    ('evidence removal', $sql$delete from sky_private.identity_provenance where id='sql-fixture-real-shaped'$sql$, '23514'),
    ('evidence truncate', $sql$truncate sky_private.identity_provenance$sql$, '23514'),
    ('evidence moved away', $sql$update sky_private.identity_provenance set id='sql-fixture-item' where id='sql-fixture-real-shaped'$sql$, '23514'),
    ('dangling provenance', $sql$insert into sky_private.identity_provenance values ('item','sql-fixture-item','sql-fixture-missing',0)$sql$, '23503'),
    ('duplicate provenance', $sql$insert into sky_private.identity_provenance values ('item','sql-fixture-real-shaped','sql-fixture-proof',1)$sql$, '23505'),
    ('invalid month', $sql$select sky_private.iso_instant('2026-13-01T00:00:00Z')$sql$, '22008'),
    ('invalid clock', $sql$select sky_private.iso_instant('2026-10-07T24:00:00Z')$sql$, '22007'),
    ('invalid offset', $sql$select sky_private.iso_instant('2026-10-07T00:00:00+24')$sql$, '22007')
  ) as cases(label, statement, expected_state) loop
    actual_state := null;
    begin
      execute case_row.statement;
    exception when others then
      get stacked diagnostics actual_state = returned_sqlstate;
    end;
    if actual_state is distinct from case_row.expected_state then
      raise exception 'Case % expected SQLSTATE %, got %', case_row.label, case_row.expected_state, actual_state;
    end if;
    passed := passed + 1;
  end loop;
  if passed <> 24 then raise exception 'Unexpected case count'; end if;

  update sky_private.domain_identity set revision=2,updated_at='2026-10-07T01:00:00Z'
    where kind='item' and id='sql-fixture-item';
  if (select revision from sky_private.domain_identity where kind='item' and id='sql-fixture-item') <> 2 then
    raise exception 'Forward revision did not persist';
  end if;
  if (select retrieved_at from sky_private.provenance where id='sql-fixture-proof') <> '2026-10-07t07:00:00,123+07' then
    raise exception 'Original timestamp spelling changed';
  end if;
  if sky_private.iso_instant('2026-10-07t07:00:00,123+07') <> sky_private.iso_instant('2026-10-07T00:00:00.123Z')
    or sky_private.iso_instant('2026-10-07T23:00+23') <> sky_private.iso_instant('2026-10-07T00:00Z')
    or sky_private.iso_instant('0000-02-29T00:00Z') is null then
    raise exception 'Valid domain instant comparison failed';
  end if;

  -- Deferred enforcement permits insert identity then evidence within one TX.
  set constraints all deferred;
  insert into sky_private.domain_identity values ('item','sql-fixture-deferred',1,1,'2026-10-07T00:00:00Z',null,false);
  insert into sky_private.identity_provenance values ('item','sql-fixture-deferred','sql-fixture-proof',0);
  set constraints all immediate;

  foreach role_name in array array['anon','authenticated','service_role'] loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      actual_state := null;
      begin
        execute format('set local role %I', role_name);
        perform 1 from sky_private.domain_identity;
      exception when others then
        get stacked diagnostics actual_state = returned_sqlstate;
      end;
      reset role;
      if actual_state is distinct from '42501' then
        raise exception 'Role % expected access denial, got %', role_name, actual_state;
      end if;
    end if;
  end loop;
end;
$$;

select 'private identity rehearsal: 24 negative cases + positive/deferred cases + role access denial PASS' as result;
rollback;
