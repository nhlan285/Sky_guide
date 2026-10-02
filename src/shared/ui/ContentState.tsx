import { Button, StatusBadge } from './primitives'
import type { StatusTone } from './primitives'
import { useLocale } from '../i18n/useLocale'
import type { TranslationKey } from '../i18n/translations'

export type ContentStateKind = 'loading' | 'empty' | 'error' | 'unavailable' | 'stale' | 'offline'

const states: Record<ContentStateKind, { label: TranslationKey; tone: StatusTone }> = {
  loading: { label: 'state.loading', tone: 'info' },
  empty: { label: 'state.empty', tone: 'neutral' },
  error: { label: 'state.error', tone: 'danger' },
  unavailable: { label: 'status.unavailable', tone: 'neutral' },
  stale: { label: 'state.stale', tone: 'warning' },
  offline: { label: 'state.offline', tone: 'warning' },
}

// Callers supply actual context (including real cache/update metadata) and only
// pass an action when the corresponding operation has been implemented.
export function ContentState({ kind, message, action }: {
  kind: ContentStateKind
  message: string
  action?: { label: string; onClick: () => void }
}) {
  const { label, tone } = states[kind]
  const { t } = useLocale()
  return (
    <div className={`content-state content-state--${kind}`} role={kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined} aria-busy={kind === 'loading' ? true : undefined}>
      <StatusBadge tone={tone}>{t(label)}</StatusBadge>
      <p>{message}</p>
      {action ? <Button onClick={action.onClick}>{action.label}</Button> : null}
    </div>
  )
}
