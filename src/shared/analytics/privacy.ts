import type { BeforeSendEvent } from '@vercel/analytics'

const publicPages = new Set(['/', '/hub', '/items', '/wardrobe', '/about', '/spirits', '/traveling-spirits', '/events', '/news', '/music', '/media'])

export function analyticsRoute(pathname: string): string | null {
  if (publicPages.has(pathname)) return pathname
  // Only the public K15 catalogue ID shape is permitted; arbitrary private paths
  // and unknown routes never reach the provider.
  return /^\/items\/tsa-cosmetic-(?:0|[1-9]\d*)$/.test(pathname) ? '/items/:id' : null
}

export function isLocalAnalyticsHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')
    || hostname === '[::1]' || hostname === '::1' || /^\d+(\.\d+){3}$/.test(hostname)
}

export function sanitizePageview(event: BeforeSendEvent, origin: string, referrer = ''): BeforeSendEvent | null {
  if (event.type !== 'pageview') return null // Hobby: no custom events or properties.
  try {
    const url = new URL(event.url, origin)
    if (url.origin !== origin || url.username || url.password || !analyticsRoute(url.pathname)) return null
    // The provider's callback can sanitize the page URL, but cannot rewrite its
    // external referrer field. Fail closed for this document if that field could
    // contain query/fragment secrets. No referrer is copied into our own payload.
    if (referrer) {
      const from = new URL(referrer)
      if (from.origin !== origin && (from.search || from.hash || from.username || from.password)) return null
    }
    return { type: 'pageview', url: `${url.origin}${url.pathname}` }
  } catch { return null }
}
