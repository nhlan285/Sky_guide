import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_MANUAL_NEWS_BYTES, stageManualOfficialNews } from '../../src/data/catalog/officialNewsInput.ts'
const source = () => ({id:'fixture-source',sourceId:'K06',sourceUrl:'https://thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/faq/1-synthetic-note/',sourceRecordKey:'faq:1',sourceRevision:null,retrievedAt:'2026-10-05T17:00:00Z',observedAt:null,attribution:'Synthetic source for fixture test',licenseNote:'Fixture only; no rights claim',transformNote:'Original fixture summary; source date is date-only',verificationStatus:'verified'})
const date = () => ({value:'2026-08-10',precision:'date',timezone:null,rawLabel:'August 10, 2026'})
const article = () => ({id:'fixture-article',revision:'fixture-r1',category:'official',title:'Synthetic official note',summary:'Original fixture summary.',sourceProvenanceIds:['fixture-source'],officialEvidenceIds:['fixture-evidence'],factualStatus:'official',spoiler:false,publishedAt:null,updatedAt:'2026-10-06T00:00:00Z',recordStatus:'draft',fixture:true})
const context = () => ({articleIds:new Set(['fixture-article','fixture-second']),sourceRegistry:new Set(['K06','K15']),sources:new Map([['fixture-source',source()]]),officialEvidence:new Map([['fixture-evidence',{provenanceId:'fixture-source',publicationTime:date()}]])})
const stage = (articles,ctx=context(),extras={}) => stageManualOfficialNews(JSON.stringify({schemaVersion:1,articles,...extras}),ctx)

test('manual draft projects declared fields only and preserves date-only/null revision without inventing an instant', () => {
  const input = {...article(),privateTicket:'private-sentinel'},ctx=context()
  ctx.sources.get('fixture-source').privateNotes = 'private-source-sentinel'
  const before = globalThis.structuredClone(input),result = stage([input],ctx,{credentials:'private-envelope-sentinel'})
  assert.equal(result.status,'staged'); assert.equal(result.candidateArticles[0].publishedAt,null)
  assert.equal(result.provenance[0].sourceRevision,null); assert.equal(result.candidateArticles[0].recordStatus,'draft')
  assert.equal(JSON.stringify(result).includes('sentinel'),false); assert.deepEqual(input,before)
  assert.deepEqual(result.candidateArticles[0].officialEvidenceIds,['fixture-evidence'])
  assert.deepEqual(result.candidateArticles[0].sourceProvenanceIds,['fixture-source'])
})

test('one invalid record quarantines whole batch; unknown/duplicate IDs and leak or published input cannot bypass review', () => {
  for (const change of [{id:'unknown'},{category:'leak'},{recordStatus:'published'},{factualStatus:'unconfirmed'},{title:''},{sourceProvenanceIds:[]},{officialEvidenceIds:['fixture-source']}]) {
    const result = stage([article(),{...article(),id:'fixture-second',...change}])
    assert.equal(result.status,'quarantined'); assert.equal(result.candidateArticles,null)
    assert.ok(result.reports.some(report=>report.path[0]==='articles'&&report.path[1]===1))
  }
  assert.equal(stage([article(),article()]).reports.some(report=>report.code==='duplicate_id'),true)
})

test('official input requires registered verified K06 source and same-source evidence, not an official-looking file claim', () => {
  for (const change of [{sourceId:'K15'},{verificationStatus:'pending'},{sourceUrl:'https://example.com/official'},{sourceUrl:source().sourceUrl+'?token=private'},{licenseNote:''},{sourceRevision:''},{id:'different'}]) {
    const ctx=context(); ctx.sources.set('fixture-source',{...source(),...change})
    assert.equal(stage([article()],ctx).status,'quarantined')
  }
  const ctx=context(); ctx.officialEvidence.set('fixture-evidence',{provenanceId:'unrelated',publicationTime:null})
  assert.equal(stage([article()],ctx).status,'quarantined')
  const claimed = {...article(),sourceRecords:[source()],approval:'approved'}
  ctx.sources.clear(); assert.equal(stage([claimed],ctx).status,'quarantined')
})

test('publication instant requires explicit evidence; date-only midnight inference and conflicting instants reject', () => {
  const instant='2026-08-10T00:00:00Z',input={...article(),publishedAt:instant}
  assert.equal(stage([input]).status,'quarantined')
  const ctx=context(); ctx.officialEvidence.set('fixture-evidence',{provenanceId:'fixture-source',publicationTime:{value:instant,precision:'instant',timezone:'UTC',rawLabel:'Synthetic explicit instant'}})
  assert.equal(stage([input],ctx).status,'staged')
  assert.equal(stage([{...input,publishedAt:'2026-08-10T01:00:00Z'}],ctx).status,'quarantined')
  ctx.officialEvidence.set('fixture-conflict',{provenanceId:'fixture-source',publicationTime:{value:'2026-08-10T01:00:00Z',precision:'instant',timezone:'UTC',rawLabel:'Synthetic conflict'}})
  assert.equal(stage([{...input,officialEvidenceIds:['fixture-evidence','fixture-conflict']}],ctx).status,'quarantined')
  ctx.officialEvidence.set('fixture-evidence',{provenanceId:'fixture-source',publicationTime:{value:'2026-12-01T00:00:00Z',precision:'instant',timezone:'UTC',rawLabel:'Future of retrieval'}})
  assert.equal(stage([article()],ctx).status,'quarantined')
})

test('official evidence compares supported instant precision without NaN or millisecond collapse',()=>{
 const ctx=context(),proof=value=>({provenanceId:'fixture-source',publicationTime:{value,precision:'instant',timezone:null,rawLabel:null}})
 ctx.officialEvidence.set('fixture-evidence',proof('2099-10-04T00:00:00,1Z'))
 assert.equal(stage([article()],ctx).status,'quarantined')
 ctx.officialEvidence.set('fixture-evidence',proof('2026-08-10T00:00:00,0001Z'))
 assert.equal(stage([{...article(),publishedAt:'2026-08-10T00:00:00.000Z'}],ctx).status,'quarantined')
 assert.equal(stage([{...article(),publishedAt:'2026-08-10T01:00:00.0001+01'}],ctx).status,'staged')
 ctx.officialEvidence.set('fixture-conflict',proof('2026-08-10T00:00:00.0002Z'))
 assert.equal(stage([{...article(),officialEvidenceIds:['fixture-evidence','fixture-conflict']}],ctx).status,'quarantined')
})

test('malformed/unsupported/empty/bounded file failures disclose only sanitized code and path', () => {
  for(const text of ['private-sentinel()',JSON.stringify({schemaVersion:2,articles:[article()]}),JSON.stringify({schemaVersion:1,articles:[]}),JSON.stringify({schemaVersion:1,articles:Array.from({length:51},article)}),'x'.repeat(MAX_MANUAL_NEWS_BYTES+1),'😀'.repeat(MAX_MANUAL_NEWS_BYTES/3)]) {
    const result=stageManualOfficialNews(text,context()); assert.equal(result.status,'quarantined'); assert.equal(result.candidateArticles,null)
    assert.equal(JSON.stringify(result).includes('private-sentinel'),false)
    for(const report of result.reports) assert.deepEqual(Object.keys(report).sort(),['code','path'])
  }
  assert.equal(stageManualOfficialNews('{}',{}).status,'quarantined')
})
