import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { reviewedNews, filterReviewedNews } from '../../src/data/news/reviewedNews.ts'

const cached = JSON.parse(readFileSync(new URL('../../knowledge/evidence/k06-official-note-2026-10-06.json', import.meta.url), 'utf8'))
test('historical hotfix source/title/version/platforms/summary match reviewed K06 without current-release inference', () => {
  const hotfix = reviewedNews.find(entry => entry.kind === 'patch-note')
  assert.equal(hotfix.title, cached.sample.title)
  assert.equal(hotfix.version, cached.sample.versionNormalized)
  assert.deepEqual(hotfix.platforms, cached.sample.platforms)
  assert.equal(hotfix.summaryOwnWords, cached.sample.summaryOwnWords)
  assert.equal(hotfix.source.sourceUrl, cached.articleUrl)
  assert.equal(hotfix.source.retrievedAt, cached.observedAt)
  assert.equal(hotfix.source.attribution, cached.publisher)
  assert.equal(hotfix.source.licenseNote, cached.rights)
  assert.deepEqual(hotfix.date, cached.sample.releaseDate)
})
test('heading release date never becomes publication instant; unknown update/revision/canonical ID remain unknown', () => {
  for (const entry of reviewedNews) {
    assert.equal(entry.date.precision, 'date')
    assert.equal(entry.publicationInstant, null)
    assert.equal(entry.updatedInstant, null)
    assert.equal(entry.canonicalArticleId, null)
    assert.equal(entry.source.sourceRevision, null)
    assert.equal(entry.source.sourceId, 'K06')
    assert.equal(entry.source.verificationStatus, 'verified')
  }
  assert.equal(reviewedNews[0].dateMeaning, 'publication')
  assert.equal(reviewedNews[1].dateMeaning, 'release')
})
test('title/version/platform filters compose with kind; no match is empty and filtering retains original data', () => {
  const before = JSON.stringify(reviewedNews)
  assert.equal(filterReviewedNews(' IOS ', 'patch-note').length, 1)
  assert.equal(filterReviewedNews('34.4', 'announcement').length, 0)
  assert.equal(filterReviewedNews('October', 'all')[0].kind, 'announcement')
  assert.equal(filterReviewedNews('unknown-qa', 'all').length, 0)
  assert.equal(filterReviewedNews('', 'all').length, 2)
  assert.equal(JSON.stringify(reviewedNews), before)
})
