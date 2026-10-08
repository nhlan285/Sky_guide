import { Component } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './primitives'

export class RouteLoadBoundary extends Component<{ children: ReactNode; vi: boolean }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    const vi = this.props.vi
    return <div className="information-page" role="alert">
      <div className="page-intro"><h1 id="page-title" tabIndex={-1}>{vi ? 'Chưa mở được trang này' : 'This page could not open'}</h1>
        <p>{vi ? 'Phiên bản trang có thể vừa được cập nhật hoặc kết nối bị gián đoạn. Các outfit đã lưu vẫn ở máy bạn.' : 'The page may have just updated, or the connection was interrupted. Saved outfits remain on your device.'}</p>
      </div>
      <Button onClick={() => window.location.reload()}>{vi ? 'Tải lại trang' : 'Reload page'}</Button>{' '}
      <Link className="text-link" to="/hub">{vi ? 'Về Khám phá' : 'Back to Explore'}</Link>
    </div>
  }
}
