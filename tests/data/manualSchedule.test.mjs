import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { manualSchedule, formatScheduleTime, eventDisplayZones } from '../../src/data/events/manualSchedule.ts'

const evidence=JSON.parse(readFileSync(new URL('../../knowledge/evidence/k06-monthly-schedule-2026-10-09.json',import.meta.url),'utf8'))
test('manual schedule projection exactly matches reviewed official facts with unresolved canonical relations',()=>{
  const projection=JSON.parse(readFileSync(new URL('../../src/data/events/reviewed-schedule.json',import.meta.url),'utf8'))
  assert.deepEqual(manualSchedule.records,evidence.records)
  assert.equal(projection.sourceHash,evidence.transport.sha256)
  assert.deepEqual(manualSchedule.source,evidence.source);assert.equal(manualSchedule.source.sourceRevision,null)
  assert.equal(manualSchedule.records.length,5);assert.equal(new Set(manualSchedule.records.map(r=>r.id)).size,5)
  for(const record of manualSchedule.records) {
    assert.equal(record.fixture,false);assert.equal(record.recordStatus,'draft')
    assert.deepEqual(record.spiritIds,[]);assert.deepEqual(record.itemIds,[]);assert.deepEqual(record.officialArticleIds,[])
  }
  assert.equal(manualSchedule.publicationDate,'2026-10-02');assert.equal(evidence.publicationInstant,null)
})
test('date-only ranges never become instants or shift calendar date across display zones',()=>{
  for(const record of manualSchedule.records.filter(r=>r.startsAt.precision==='date')) {
    for(const zone of eventDisplayZones) {
      assert.equal(formatScheduleTime(record.startsAt,zone,'en'),record.startsAt.value)
      assert.equal(formatScheduleTime(record.endsAt,zone,'vi'),record.endsAt.value)
    }
    assert.equal(record.startsAt.timezone,'America/Los_Angeles')
    assert.equal(record.endsAt.precision,'date')
  }
  assert.equal(formatScheduleTime(null,'UTC','en'),null)
})
test('explicit interview starts match source wall times and IANA offsets on each side of fall DST',()=>{
  for(const proof of evidence.explicitInstantChecks) {
    const record=manualSchedule.records.find(r=>r.id===proof.id),instant=record.startsAt.value
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant)).map(p=>[p.type,p.value]))
    const wall=`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
    assert.equal(wall,proof.sourceWallTime)
    assert.equal((Date.parse(wall+'Z')-Date.parse(instant))/60_000,proof.sourceOffsetMinutes)
    assert.equal(record.endsAt,null,'no inferred duration or recurring rule')
  }
  const starts=manualSchedule.records.filter(r=>r.startsAt.precision==='instant')
  assert.match(formatScheduleTime(starts[0].startsAt,'Asia/Ho_Chi_Minh','en'),/7:30 AM/)
  assert.match(formatScheduleTime(starts[1].startsAt,'Asia/Ho_Chi_Minh','en'),/8:30 AM/)
})
