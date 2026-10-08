-- REVIEW PROPOSAL ONLY. Empty-package rollback; no history/intent deletion.
-- Run in one authorized transaction after checking unchanged installed definition
-- and quiescing consumers. Hold the writer barrier through all checks/drops.
do $$ begin
 perform sky_private.lock_sync_commit_control();
 if exists(select 1 from sky_private.sync_commit_intent) or exists(select 1 from sky_private.sync_commit_applied)
  or exists(select 1 from sky_private.sync_commit_receipt)
  or (select count(*) from sky_private.sync_commit_control)<>1
  or exists(select 1 from sky_private.sync_commit_control where singleton<>1 or active_intent_id is not null) then
  raise exception 'Refuse rollback with pending/forensic history; preserve recovery records' using errcode='23514';end if;
end;$$;
drop trigger sync_commit_generation on sky_private.sync_generation;
drop function sky_private.apply_sync_commit_cas(uuid,text);
drop function sky_private.settle_sync_commit_intent(uuid,text);
drop function sky_private.require_sync_commit_intent(uuid,text);
drop function sky_private.activate_sync_commit_intent(uuid);
drop table sky_private.sync_commit_receipt;
drop table sky_private.sync_commit_applied;
drop table sky_private.sync_commit_control;
drop table sky_private.sync_commit_intent;
drop function sky_private.lock_sync_commit_control();
drop function sky_private.validate_sync_commit_applied();
drop function sky_private.validate_sync_commit_receipt();
drop function sky_private.guard_sync_commit_control();
drop function sky_private.validate_sync_commit_intent_owner();
drop function sky_private.validate_sync_commit_generation();
