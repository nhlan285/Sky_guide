set constraints all immediate;
create function pg_temp.prepare_sync_acceptance(rev bigint,src text,content_letter text,fetched text,staged text,reviewed text,promoted text,expiry text default null)
returns void language plpgsql security invoker set search_path='' as $$
declare content_hash text:=repeat(content_letter,64);base bigint:=rev-1;candidate_hash text;
begin
  candidate_hash:=encode(sha256(convert_to('["'||content_hash||'",'||base::text||',"'||fetched||'","'||staged||'"]','UTF8')),'hex');
  insert into sky_private.sync_acceptance values(rev,src,'fixture-release',content_hash,repeat('f',64),candidate_hash,'fixture-v1',base,fetched,staged,'fixture-reviewer',reviewed,promoted,expiry);
end;
$$;
-- Acceptance staging and CAS belong to one transaction. Deferred consistency
-- prevents committing an orphan acceptance after a lost CAS.
set constraints all deferred;
select pg_temp.prepare_sync_acceptance(1,'K15','a','2026-10-07T00:00:00Z','2026-10-07T00:01:00Z','2026-10-07T00:02:00Z','2026-10-07T00:03:00Z');
do $$ begin
  if not sky_private.apply_sync_metadata_cas('K15',0,'promoted',1,'2026-10-07T00:00:00Z',null) then raise exception 'Initial acceptance failed';end if;
end;$$;
set constraints all immediate;
set constraints all deferred;
do $$
declare first_result boolean;second_result boolean;stale_result boolean;
begin
  first_result:=sky_private.apply_sync_metadata_cas('K15',1,'failure',null,'2026-10-07T00:04:00Z','2026-10-07T00:06:00Z');
  second_result:=sky_private.apply_sync_metadata_cas('K01',2,'failure',null,'2026-10-07T00:04:30Z',null);
  stale_result:=sky_private.apply_sync_metadata_cas('K01',2,'failure',null,'2026-10-07T00:05:00Z',null);
  if not first_result or not second_result or stale_result
    or (select revision from sky_private.sync_generation)<>3
    or (select current_acceptance_revision from sky_private.sync_generation)<>1
    or (select count(*) from sky_private.sync_audit)<>3
    or (select failures from sky_private.sync_source_state where source_id='K15')<>1
    or (select health from sky_private.sync_source_state where source_id='K01') is not null then
    raise exception 'Global CAS conflict/LKG/source isolation failed';end if;
end;$$;
set constraints all immediate;
set constraints all deferred;
select pg_temp.prepare_sync_acceptance(4,'K01','b','2026-10-07T00:05:00Z','2026-10-07T00:06:00Z','2026-10-07T00:07:00Z','2026-10-07T00:08:00Z');
select sky_private.apply_sync_metadata_cas('K01',3,'promoted',4,'2026-10-07T00:05:00Z',null);
set constraints all immediate;
set constraints all deferred;
select pg_temp.prepare_sync_acceptance(5,'K01','b','2026-10-07T00:09:00Z','2026-10-07T00:10:00Z','2026-10-07T00:11:00Z','2026-10-07T00:12:00Z');
select sky_private.apply_sync_metadata_cas('K01',4,'reconfirmed',5,'2026-10-07T00:09:00Z',null);
set constraints all immediate;
do $$ begin
  if (select failures from sky_private.sync_source_state where source_id='K15')<>1
    or (select health from sky_private.sync_source_state where source_id='K15')<>'offline'
    or (select last_success_revision from sky_private.sync_source_state where source_id='K15')<>1
    or (select last_success_revision from sky_private.sync_source_state where source_id='K01')<>5 then
    raise exception 'Second source acceptance rewrote first source state';end if;
end;$$;
set constraints all deferred;
select pg_temp.prepare_sync_acceptance(6,'K15','a','2026-10-07T00:13:00Z','2026-10-07T00:14:00Z','2026-10-07T00:15:00Z','2026-10-07T00:16:00Z');
select sky_private.apply_sync_metadata_cas('K15',5,'promoted',6,'2026-10-07T00:13:00Z',null);
set constraints all immediate;
do $$
declare case_row record;actual_state text;passed integer:=0;
begin
  for case_row in select * from(values
    ('negative generation',$sql$select sky_private.apply_sync_metadata_cas('K15',-1,'failure',null,'2026-10-07T00:20:00Z',null)$sql$,'23514'),
    ('unknown source',$sql$select sky_private.apply_sync_metadata_cas('K99',6,'failure',null,'2026-10-07T00:20:00Z',null)$sql$,'23514'),
    ('unknown operation',$sql$select sky_private.apply_sync_metadata_cas('K15',6,'other',null,'2026-10-07T00:20:00Z',null)$sql$,'23514'),
    ('duplicate failure completion',$sql$select sky_private.apply_sync_metadata_cas('K15',6,'failure',null,'2026-10-07T00:13:00Z',null)$sql$,'23514'),
    ('older source attempt',$sql$select sky_private.apply_sync_metadata_cas('K15',6,'failure',null,'2026-10-07T00:12:00Z',null)$sql$,'23514'),
    ('failure before success acceptance',$sql$select sky_private.apply_sync_metadata_cas('K15',6,'failure',null,'2026-10-07T00:14:00Z',null)$sql$,'23514'),
    ('retry before completion',$sql$select sky_private.apply_sync_metadata_cas('K15',6,'failure',null,'2026-10-07T00:20:00Z','2026-10-07T00:19:00Z')$sql$,'23514'),
    ('failure replacing LKG',$sql$select sky_private.apply_sync_metadata_cas('K15',6,'failure',6,'2026-10-07T00:20:00Z',null)$sql$,'23514'),
    ('missing acceptance',$sql$select sky_private.apply_sync_metadata_cas('K15',6,'promoted',7,'2026-10-07T00:20:00Z',null)$sql$,'23514'),
    ('wrong acceptance source',$sql$set constraints all deferred;select pg_temp.prepare_sync_acceptance(7,'K15','c','2026-10-07T00:17:00Z','2026-10-07T00:18:00Z','2026-10-07T00:19:00Z','2026-10-07T00:20:00Z');select sky_private.apply_sync_metadata_cas('K01',6,'promoted',7,'2026-10-07T00:17:00Z',null)$sql$,'23514'),
    ('reversed stage',$sql$set constraints all deferred;select pg_temp.prepare_sync_acceptance(7,'K15','c','2026-10-07T00:18:00Z','2026-10-07T00:17:00Z','2026-10-07T00:19:00Z','2026-10-07T00:20:00Z')$sql$,'23514'),
    ('review before stage',$sql$set constraints all deferred;select pg_temp.prepare_sync_acceptance(7,'K15','c','2026-10-07T00:17:00Z','2026-10-07T00:19:00Z','2026-10-07T00:18:00Z','2026-10-07T00:20:00Z')$sql$,'23514'),
    ('promotion before review',$sql$set constraints all deferred;select pg_temp.prepare_sync_acceptance(7,'K15','c','2026-10-07T00:17:00Z','2026-10-07T00:18:00Z','2026-10-07T00:20:00Z','2026-10-07T00:19:00Z')$sql$,'23514'),
    ('expiry before acceptance',$sql$set constraints all deferred;select pg_temp.prepare_sync_acceptance(7,'K15','c','2026-10-07T00:17:00Z','2026-10-07T00:18:00Z','2026-10-07T00:19:00Z','2026-10-07T00:20:00Z','2026-10-07T00:19:00Z')$sql$,'23514'),
    ('global acceptance clock regression',$sql$set constraints all deferred;select pg_temp.prepare_sync_acceptance(7,'K01','c','2026-10-07T00:13:00Z','2026-10-07T00:14:00Z','2026-10-07T00:14:30Z','2026-10-07T00:15:00Z');select sky_private.apply_sync_metadata_cas('K01',6,'promoted',7,'2026-10-07T00:13:00Z',null)$sql$,'23514'),
    ('wrong reconfirmation outcome',$sql$set constraints all deferred;select pg_temp.prepare_sync_acceptance(7,'K15','c','2026-10-07T00:17:00Z','2026-10-07T00:18:00Z','2026-10-07T00:19:00Z','2026-10-07T00:20:00Z');select sky_private.apply_sync_metadata_cas('K15',6,'reconfirmed',7,'2026-10-07T00:17:00Z',null)$sql$,'23514'),
    ('same content incorrectly promoted',$sql$set constraints all deferred;select pg_temp.prepare_sync_acceptance(7,'K15','a','2026-10-07T00:17:00Z','2026-10-07T00:18:00Z','2026-10-07T00:19:00Z','2026-10-07T00:20:00Z');select sky_private.apply_sync_metadata_cas('K15',6,'promoted',7,'2026-10-07T00:17:00Z',null)$sql$,'23514'),
    ('lost CAS cannot commit staged acceptance',$sql$set constraints all deferred;select pg_temp.prepare_sync_acceptance(7,'K15','c','2026-10-07T00:17:00Z','2026-10-07T00:18:00Z','2026-10-07T00:19:00Z','2026-10-07T00:20:00Z');select sky_private.apply_sync_metadata_cas('K15',5,'promoted',7,'2026-10-07T00:17:00Z',null);set constraints all immediate$sql$,'23503'),
    ('tampered review hash',$sql$set constraints all deferred;insert into sky_private.sync_acceptance select 7,source_id,catalog_version,content_hash,source_hash,repeat('0',64),normalization_version,6,fetched_at,staged_at,reviewer_ref,reviewed_at,promoted_at,valid_until from sky_private.sync_acceptance where revision=6$sql$,'23514'),
    ('generation skip',$sql$update sky_private.sync_generation set revision=8$sql$,'23514'),
    ('generation regression',$sql$update sky_private.sync_generation set revision=5$sql$,'23514'),
    ('source fake failure count',$sql$update sky_private.sync_source_state set failures=1 where source_id='K15'$sql$,'23514'),
    ('source fake offline health',$sql$update sky_private.sync_source_state set health='offline' where source_id='K15'$sql$,'23514'),
    ('source fake last attempt',$sql$update sky_private.sync_source_state set last_attempt_at='2026-10-07T00:12:00Z' where source_id='K15'$sql$,'23514'),
    ('retry without failure',$sql$update sky_private.sync_source_state set next_retry_at='2026-10-07T00:25:00Z' where source_id='K15'$sql$,'23514'),
    ('private acceptance rewrite',$sql$update sky_private.sync_acceptance set reviewer_ref='changed'$sql$,'23514'),
    ('private acceptance delete',$sql$delete from sky_private.sync_acceptance$sql$,'23514'),
    ('private audit rewrite',$sql$update sky_private.sync_audit set outcome='failure'$sql$,'23514'),
    ('private audit delete',$sql$delete from sky_private.sync_audit$sql$,'23514'),
    ('source reservation delete',$sql$delete from sky_private.sync_source_state$sql$,'23514'),
    ('global control delete',$sql$delete from sky_private.sync_generation$sql$,'23514'),
    ('private history truncate',$sql$truncate sky_private.sync_acceptance cascade$sql$,'23514'),
    ('source state truncate',$sql$truncate sky_private.sync_source_state$sql$,'23514'),
    ('global control truncate',$sql$truncate sky_private.sync_generation$sql$,'23514')
  ) cases(label,query,expected_state) loop
    actual_state:=null;
    begin execute case_row.query;
    exception when others then get stacked diagnostics actual_state=returned_sqlstate;end;
    if actual_state is distinct from case_row.expected_state then
      raise exception 'Sync case % expected %, got %',case_row.label,case_row.expected_state,coalesce(actual_state,'SUCCESS');end if;
    passed:=passed+1;
  end loop;
  if passed<>34 then raise exception 'Incomplete sync assertions: %',passed;end if;
  if (select revision from sky_private.sync_generation)<>6 or (select current_acceptance_revision from sky_private.sync_generation)<>6
    or (select failures from sky_private.sync_source_state where source_id='K15')<>0
    or (select next_retry_at from sky_private.sync_source_state where source_id='K15') is not null
    or (select last_success_revision from sky_private.sync_source_state where source_id='K01')<>5 then
    raise exception 'Rollback/health recovery/source isolation failed';end if;
end;$$;
