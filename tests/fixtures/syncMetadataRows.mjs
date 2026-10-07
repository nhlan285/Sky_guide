import { createHash } from 'node:crypto'

export function syncMetadataFixture(source='K15') {
  const acceptance=(revision,source_id,letter,minute) => {
    const content_hash=letter.repeat(64),base_revision=revision-1,time=n=>`2026-10-07T00:${String(n).padStart(2,'0')}:00Z`
    const fetched_at=time(minute),staged_at=time(minute+1)
    return {revision,source_id,catalog_version:'fixture-release',content_hash,source_hash:'f'.repeat(64),candidate_hash:createHash('sha256').update(JSON.stringify([content_hash,base_revision,fetched_at,staged_at])).digest('hex'),
      normalization_version:'fixture-v1',base_revision,fetched_at,staged_at,reviewer_ref:'fixture-reviewer',reviewed_at:time(minute+2),promoted_at:time(minute+3),valid_until:null}
  }
  const own=source==='K15'?6:5
  return {sync_generation:[{singleton:1,revision:6,current_acceptance_revision:6,last_promoted_at:'2026-10-07T00:16:00Z'}],
    sync_acceptance:[...(source==='K15'?[]:[acceptance(5,'K01','b',9)]),acceptance(6,'K15','a',13)],
    sync_source_state:[{source_id:source,last_success_revision:own,health:'healthy',last_attempt_at:source==='K15'?'2026-10-07T00:13:00Z':'2026-10-07T00:09:00Z',failures:0,next_retry_at:null}],
    sync_audit:[{revision:6,source_id:'K15',outcome:'promoted',attempt_completed_at:'2026-10-07T00:13:00Z',acceptance_revision:6}]}
}
