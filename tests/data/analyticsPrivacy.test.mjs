import assert from 'node:assert/strict'
import test from 'node:test'
import { analyticsRoute, isLocalAnalyticsHost, sanitizePageview } from '../../src/shared/analytics/privacy.ts'

const origin = 'https://sky-guide-six.vercel.app'
test('pageviews retain useful public pages but remove search, credentials and outfit fragments', () => {
  for (const path of ['/', '/hub', '/items', '/items/tsa-cosmetic-101', '/wardrobe', '/spirits', '/events', '/music']) {
    const result = sanitizePageview({ type: 'pageview', url: origin + path + '?token=private&q=name#outfit=v1.secret' }, origin)
    assert.deepEqual(result, { type: 'pageview', url: origin + path })
  }
  assert.equal(analyticsRoute('/items/tsa-cosmetic-101'), '/items/:id')
  for (const path of ['/account/private-id', '/items/private-token', '/items/tsa-cosmetic-1/secret', '/wardrobe/private']) {
    assert.equal(sanitizePageview({ type: 'pageview', url: origin + path }, origin), null)
  }
  assert.equal(sanitizePageview({ type: 'event', url: origin + '/wardrobe' }, origin), null)
  assert.equal(sanitizePageview({ type: 'pageview', url: 'https://other.example/items' }, origin), null)
  assert.equal(sanitizePageview({ type: 'pageview', url: 'https://name:password@sky-guide-six.vercel.app/items' }, origin), null)
})
test('external sensitive referrers fail closed because SDK cannot rewrite that field', () => {
  const event = { type: 'pageview', url: origin + '/hub' }
  for (const from of ['https://external.example/?token=private', 'https://external.example/#private', 'https://name:pass@external.example/', 'invalid']) {
    assert.equal(sanitizePageview(event, origin, from), null)
  }
  assert.ok(sanitizePageview(event, origin, 'https://external.example/public'))
  assert.ok(sanitizePageview(event, origin, origin + '/wardrobe#outfit=private'), 'same-origin referrer is omitted by SDK')
})
test('development and local network hosts cannot collect production analytics', () => {
  for (const host of ['localhost', 'app.localhost', 'app.local', '127.0.0.1', '192.168.1.1', '0.0.0.0', '::1', '[::1]']) assert.equal(isLocalAnalyticsHost(host), true)
  assert.equal(isLocalAnalyticsHost('sky-guide-six.vercel.app'), false)
})
