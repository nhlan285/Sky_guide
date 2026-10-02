import { Button, StatusBadge } from './primitives'
import type { StatusTone } from './primitives'

export type ContentStateKind = 'loading' | 'empty' | 'error' | 'unavailable' | 'stale' | 'offline'

const states: Record<ContentStateKind, { label: string; tone: StatusTone }> = {
  loading: { label: 'Đang tải thông tin', tone: 'info' },
  empty: { label: 'Danh sách trống', tone: 'neutral' },
  error: { label: 'Không tải được thông tin', tone: 'danger' },
  unavailable: { label: 'Chưa có dữ liệu', tone: 'neutral' },
  stale: { label: 'Dữ liệu cần cập nhật', tone: 'warning' },
  offline: { label: 'Đang ngoại tuyến', tone: 'warning' },
}

// Callers supply actual context (including real cache/update metadata) and only
// pass an action when the corresponding operation has been implemented.
export function ContentState({ kind, message, action }: {
  kind: ContentStateKind
  message: string
  action?: { label: string; onClick: () => void }
}) {
  const { label, tone } = states[kind]
  return (
    <div className={`content-state content-state--${kind}`} role={kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined} aria-busy={kind === 'loading' ? true : undefined}>
      <StatusBadge tone={tone}>{label}</StatusBadge>
      <p>{message}</p>
      {action ? <Button onClick={action.onClick}>{action.label}</Button> : null}
    </div>
  )
}
