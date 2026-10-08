import assert from 'node:assert/strict'
import test from 'node:test'
import { stageManualEvents, retainEventDraft, MAX_MANUAL_EVENT_BYTES } from '../../src/data/catalog/manualEventInput.ts'

const date = value => ({ value, precision:'date', timezone:null, rawLabel:value })
const event = () => ({id:'fixture-event',kind:'event',name:{default:'Synthetic review test',translations:{}},startsAt:date('2026-03-08'),endsAt:null,timeStatus:'tentative',summary:null,spiritIds:[],itemIds:[],realmIds:[],mapIds:[],officialArticleIds:[],provenanceIds:['fixture-source'],fieldProvenance:{startsAt:['fixture-source'],endsAt:['fixture-source']},updatedAt:'2026-10-08T00:00:00Z',recordStatus:'draft',fixture:true})
const fields = value => { const copy={...value}; delete copy.updatedAt; delete copy.recordStatus; return copy }
const source = () => ({id:'fixture-source',sourceId:'K06',sourceUrl:'https://thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/faq/1467-hotfix/',sourceRecordKey:'synthetic',sourceRevision:null,retrievedAt:'2026-10-08T00:00:00Z',observedAt:null,attribution:'Synthetic only',licenseNote:'Test fixture, no article copied',transformNote:'Synthetic event, not actual source facts',verificationStatus:'verified'})
const context = (value=event()) => ({catalog:Object.fromEntries(['provenanceIds','itemIds','spiritIds','treeIds','nodeIds','seasonIds','realmIds','mapIds','articleIds','assetIds','ruleIds','iapProductIds','visitIds'].map(key=>[key,new Set(key==='provenanceIds'?['fixture-source']:[])])),eventIds:new Set(['fixture-event','fixture-second']),sourceRegistry:new Set(['K06']),sources:new Map([['fixture-source',source()]]),reviews:new Map([['fixture-review',{sourceType:'community',fields:fields(value),sourcePins:{'fixture-source':{sourceId:'K06',sourceUrl:source().sourceUrl,sourceRevision:null,retrievedAt:source().retrievedAt}}}]])})
const stage = (entries=[{event:event(),reviewId:'fixture-review'}],ctx=context()) => stageManualEvents(JSON.stringify({schemaVersion:1,events:entries}),ctx)

test('manual reviewed draft preserves date-only/null end and source type, projects private fields',()=>{
  const value={...event(),privateNote:'secret-sentinel'},ctx=context()
  const result=stage([{event:value,reviewId:'fixture-review',sourceType:'official',credentials:'secret-sentinel'}],ctx)
  assert.equal(result.status,'staged',JSON.stringify(result.reports)); assert.equal(result.candidates[0].sourceType,'community')
  assert.deepEqual(result.candidates[0].event.startsAt,date('2026-03-08'))
  assert.equal(result.candidates[0].event.endsAt,null); assert.equal(result.candidates[0].event.recordStatus,'draft')
  assert.equal(JSON.stringify(result).includes('secret-sentinel'),false)
  assert.deepEqual(value.privateNote,'secret-sentinel'); assert.equal(result.candidates[0].event.fixture,true)
})
test('input cannot mint review, mutate a reviewed date/name/FK or promote precision/status',()=>{
  for(const change of [{fixture:false},{id:'unknown'},{name:{default:'Different event',translations:{}}},{recordStatus:'published'},{timeStatus:'confirmed'},{itemIds:['unknown-item']},{startsAt:{value:'2026-03-08T00:00:00Z',precision:'instant',timezone:'UTC',rawLabel:null}},{endsAt:date('2026-03-07')}]) {
    assert.equal(stage([{event:{...event(),...change},reviewId:'fixture-review'}]).status,'quarantined')
  }
  const ctx=context();ctx.reviews.clear()
  assert.equal(stage([{event:event(),reviewId:'fixture-review',reviews:[{approved:true}]}],ctx).status,'quarantined')
})
test('source drift/pending/conflict/unknown registry or credential-bearing URL rejects despite saved review',()=>{
  for(const change of [{id:'wrong-id'},{sourceRevision:'changed'},{sourceUrl:'https://example.com/new-source'},{verificationStatus:'pending'},{verificationStatus:'conflict'},{sourceId:'K15'},{sourceUrl:'https://example.com/?token=secret'},{licenseNote:''},{attribution:''}]) {
    const ctx=context();ctx.sources.set('fixture-source',{...source(),...change});assert.equal(stage(undefined,ctx).status,'quarantined')
  }
})
test('whole batch rejects duplicates and retains accepted draft by identity without partial replacement',()=>{
  const good=stage(),previous=good.candidates
  const bad=stage([{event:event(),reviewId:'fixture-review'},{event:{...event(),id:'fixture-second'},reviewId:'fixture-review'}])
  assert.equal(bad.status,'quarantined');assert.equal(bad.candidates,null)
  assert.equal(retainEventDraft(previous,bad),previous);assert.equal(retainEventDraft([],good),good.candidates)
  assert.equal(stage([{event:event(),reviewId:'fixture-review'},{event:event(),reviewId:'fixture-review'}]).reports.some(r=>r.code==='duplicate_id'),true)
})
test('explicit reviewed LA instants survive spring/fall DST without fixed-offset/date inference',()=>{
  for(const [start,end] of [['2026-03-08T01:30:00-08:00','2026-03-08T03:30:00-07:00'],['2026-11-01T01:30:00-07:00','2026-11-01T01:30:00-08:00']]) {
    const value={...event(),startsAt:{value:start,precision:'instant',timezone:'America/Los_Angeles',rawLabel:null},endsAt:{value:end,precision:'instant',timezone:'America/Los_Angeles',rawLabel:null},timeStatus:'confirmed'}
    const result=stage([{event:value,reviewId:'fixture-review'}],context(value));assert.equal(result.status,'staged')
    assert.deepEqual(result.candidates[0].event.startsAt,value.startsAt);assert.deepEqual(result.candidates[0].event.endsAt,value.endsAt)
  }
})
test('bounded malformed/unknown-context input discloses only sanitized paths and no raw data',()=>{
  for(const text of ['secret-sentinel',JSON.stringify({schemaVersion:2,events:[]}),JSON.stringify({schemaVersion:1,events:[]}),JSON.stringify({schemaVersion:1,events:Array.from({length:51},()=>({event:event(),reviewId:'fixture-review'}))}),'x'.repeat(MAX_MANUAL_EVENT_BYTES+1),'😀'.repeat(MAX_MANUAL_EVENT_BYTES/3)]) {
    const result=stageManualEvents(text,context());assert.equal(result.status,'quarantined');assert.equal(JSON.stringify(result).includes('secret-sentinel'),false)
    for(const report of result.reports) assert.deepEqual(Object.keys(report).sort(),['code','path'])
  }
  assert.equal(stageManualEvents('{}',{}).status,'quarantined')
  assert.equal(stageManualEvents('{}',{...context(),catalog:{}}).status,'quarantined')
})


