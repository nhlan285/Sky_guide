import { Analytics } from '@vercel/analytics/react'
import { useLocation } from 'react-router-dom'
import { analyticsRoute, isLocalAnalyticsHost, sanitizePageview } from './privacy'

const beforeSend = (event: Parameters<typeof sanitizePageview>[0]) => sanitizePageview(event, window.location.origin, document.referrer)

export function WebAnalytics() {
  const { pathname } = useLocation()
  if (!import.meta.env.PROD || isLocalAnalyticsHost(window.location.hostname)) return null
  // Explicit path/route disable the SDK's automatic listener. Query changes and
  // outfit fragments do not change these props, so they do not emit pageviews.
  return <Analytics mode="production" debug={false} route={analyticsRoute(pathname)} path={pathname} beforeSend={beforeSend} />
}
