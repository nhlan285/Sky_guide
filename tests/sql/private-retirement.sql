-- Isolated dev only; synthetic retirement graph. No persistent seed/helper.
begin;
set local statement_timeout = '30s';
insert into sky_private.domain_identity values
  ('item','retire-fixture-a',1,1,'2026-10-07T00:00:00Z',null,true),
  ('item','retire-fixture-b',1,1,'2026-10-07T00:00:00Z',null,true),
  ('spirit','retire-fixture-spirit',1,1,'2026-10-07T00:00:00Z',null,true),
  ('item','retire-fixture-old',1,1,'2026-10-07T00:00:00Z','2026-10-07T00:00:00Z',true);
insert into sky_private.tombstone values ('item','retire-fixture-old','2026-10-07T00:00:00Z','retire-fixture-a');
insert into sky_private.alias(kind,from_id,target_identity_id,target_alias_id) values
  ('item','retire-fixture-old',null,'retire-fixture-chain'),
  ('item','retire-fixture-chain','retire-fixture-a',null);
set constraints all immediate;

do $$
declare
  case_row record;
  actual_state text;
  passed integer := 0;
begin
  for case_row in select * from (values
    ('active alias source', $sql$insert into sky_private.alias(kind,from_id,target_identity_id) values ('item','retire-fixture-b','retire-fixture-a')$sql$, '23514'),
    ('alias cycles', $sql$insert into sky_private.alias(kind,from_id,target_alias_id) values ('item','retire-fixture-cycle-a','retire-fixture-cycle-b'),('item','retire-fixture-cycle-b','retire-fixture-cycle-a')$sql$, '23514'),
    ('alias self cycle', $sql$insert into sky_private.alias(kind,from_id,target_alias_id) values ('item','retire-fixture-cycle','retire-fixture-cycle')$sql$, '23514'),
    ('alias wrong target kind', $sql$insert into sky_private.alias(kind,from_id,target_identity_id) values ('item','retire-fixture-wrong-kind','retire-fixture-spirit')$sql$, '23503'),
    ('dangling target', $sql$insert into sky_private.alias(kind,from_id,target_identity_id) values ('item','retire-fixture-dangling','retire-fixture-missing')$sql$, '23503'),
    ('alias without target', $sql$insert into sky_private.alias(kind,from_id) values ('item','retire-fixture-no-target')$sql$, '23514'),
    ('alias with two targets', $sql$insert into sky_private.alias(kind,from_id,target_identity_id,target_alias_id) values ('item','retire-fixture-two','retire-fixture-a','retire-fixture-chain')$sql$, '23514'),
    ('retirement without tombstone', $sql$update sky_private.domain_identity set revision=2,retired_at=updated_at where kind='item' and id='retire-fixture-b'$sql$, '23514'),
    ('tombstone on active identity', $sql$insert into sky_private.tombstone values ('item','retire-fixture-b','2026-10-07T00:00:00Z',null)$sql$, '23514'),
    ('tombstone without identity', $sql$insert into sky_private.tombstone values ('item','retire-fixture-missing','2026-10-07T00:00:00Z',null)$sql$, '23503'),
    ('tombstone remap', $sql$update sky_private.tombstone set replacement_id='retire-fixture-b' where id='retire-fixture-old'$sql$, '23514'),
    ('tombstone removal', $sql$delete from sky_private.tombstone where id='retire-fixture-old'$sql$, '23514'),
    ('tombstone truncate', $sql$truncate sky_private.tombstone$sql$, '23514'),
    ('alias remap', $sql$update sky_private.alias set target_identity_id='retire-fixture-b' where from_id='retire-fixture-chain'$sql$, '23514'),
    ('alias removal', $sql$delete from sky_private.alias where from_id='retire-fixture-old'$sql$, '23514'),
    ('alias truncate', $sql$truncate sky_private.alias cascade$sql$, '23514'),
    ('alias source reused as active identity', $sql$insert into sky_private.domain_identity values ('item','retire-fixture-chain',1,1,'2026-10-07T00:00:00Z',null,true)$sql$, '23514'),
    ('retirement timestamp mismatch', $sql$with owner as (insert into sky_private.domain_identity values ('item','retire-fixture-time-mismatch',1,1,'2026-10-07T00:00:00Z','2026-10-07T00:00:00Z',true) returning kind,id) insert into sky_private.tombstone select kind,id,'2026-10-07T01:00:00Z',null from owner$sql$, '23514'),
    ('retired replacement', $sql$with owner as (insert into sky_private.domain_identity values ('item','retire-fixture-bad-replacement',1,1,'2026-10-07T00:00:00Z','2026-10-07T00:00:00Z',true) returning kind,id,retired_at) insert into sky_private.tombstone select kind,id,retired_at,'retire-fixture-old' from owner$sql$, '23514'),
    ('alias replacement disagreement', $sql$with owner as (insert into sky_private.domain_identity values ('item','retire-fixture-disagreement',1,1,'2026-10-07T00:00:00Z','2026-10-07T00:00:00Z',true) returning kind,id,retired_at), stone as (insert into sky_private.tombstone select kind,id,retired_at,'retire-fixture-a' from owner returning kind,id) insert into sky_private.alias(kind,from_id,target_identity_id) select kind,id,'retire-fixture-b' from stone$sql$, '23514'),
    ('duplicate alias', $sql$insert into sky_private.alias(kind,from_id,target_identity_id) values ('item','retire-fixture-chain','retire-fixture-b')$sql$, '23505')
  ) as cases(label,statement,expected_state) loop
    actual_state := null;
    begin
      set constraints all deferred;
      execute case_row.statement;
      set constraints all immediate;
    exception when others then
      get stacked diagnostics actual_state = returned_sqlstate;
    end;
    if actual_state is distinct from case_row.expected_state then
      raise exception 'Case % expected SQLSTATE %, got %', case_row.label, case_row.expected_state, actual_state;
    end if;
    passed := passed + 1;
  end loop;
  if passed <> 21 then raise exception 'Unexpected case count'; end if;
  -- No-op updates remain legal; generated alias target is not a remap.
  update sky_private.alias set target_identity_id=target_identity_id where from_id='retire-fixture-chain';
  update sky_private.tombstone set replacement_id=replacement_id where id='retire-fixture-old';
  if (select to_id from sky_private.alias where from_id='retire-fixture-old') <> 'retire-fixture-chain' then
    raise exception 'Original intermediate alias target lost';
  end if;

  set constraints all deferred;
  update sky_private.domain_identity set revision=2,retired_at=updated_at where kind='item' and id='retire-fixture-b';
  insert into sky_private.tombstone values ('item','retire-fixture-b','2026-10-07T00:00:00Z',null);
  set constraints all immediate;
  -- A retired identity with no alias must not be accepted as the final target.
  actual_state := null;
  begin
    insert into sky_private.alias(kind,from_id,target_identity_id) values ('item','retire-fixture-final-retired','retire-fixture-b');
  exception when others then
    get stacked diagnostics actual_state = returned_sqlstate;
  end;
  if actual_state is distinct from '23514' then raise exception 'Retired final target was accepted'; end if;
end;
$$;
select 'retirement graph: 22 negative cases + chain/unknown source/no-op/atomic retirement PASS' as result;
rollback;
