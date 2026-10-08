-- TRUNCATE skips row constraint triggers; block this bypass separately.
create function sky_private.guard_evidence_truncate() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Identity provenance cannot be truncated' using errcode = '23514';
end;
$$;
create trigger evidence_reservations before truncate on sky_private.identity_provenance
for each statement execute function sky_private.guard_evidence_truncate();
revoke all on function sky_private.guard_evidence_truncate() from public;
