import { Link } from 'react-router-dom'
import { ContentState } from '../../shared/ui/ContentState'
import { Button, SectionCard, StatusBadge, TextInput } from '../../shared/ui/primitives'

export function Hub() {

  return (
    <>
      <div className="page-intro sky-card">
        <Link to="/" className="hub-back-link">
          ← Về Constellation
        </Link>
        <p className="eyebrow">Cẩm nang dành cho người chơi</p>
        <h1 id="page-title" tabIndex={-1}>Khám phá cùng Sky Guide</h1>
        <p>Lịch sự kiện, tra cứu item và không gian chuẩn bị outfit của bạn.</p>
      </div>

      <aside className="source-strip sky-card" aria-label="Trạng thái nguồn dữ liệu" style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <StatusBadge tone="info">Đang xây dựng</StatusBadge>
        <p>Dữ liệu chưa được kết nối. Các mục sẽ được bật khi có nguồn đã kiểm chứng.</p>
      </aside>

      <div className="hub-grid">
        <div className="sky-card" style={{ padding: 0 }}>
          <SectionCard id="season-event" title="Season / Event" className="section-card--featured">
            <p className="section-description">Mùa và sự kiện, cùng các mốc thời gian đã xác nhận.</p>
            <ContentState kind="unavailable" message="Nguồn mùa và sự kiện chưa được xác minh. Chưa có lịch để hiển thị." />
          </SectionCard>
        </div>

        <div className="sky-card" style={{ padding: 0 }}>
          <SectionCard id="traveling-spirit" title="Traveling Spirit">
            <p className="section-description">Theo dõi các lần ghé và lịch sử có nguồn.</p>
            <ContentState kind="unavailable" message="Chưa kết nối dữ liệu các lần ghé đã kiểm chứng." />
            <p className="section-note">Dự đoán chưa được bật và sẽ tách riêng khỏi lịch sử.</p>
          </SectionCard>
        </div>

        <div className="sky-card hub-grid__wide" style={{ padding: 0 }}>
          <SectionCard id="official-news" title="Tin chính thức" className="section-card--news">
            <ContentState kind="unavailable" message="Chưa kết nối nguồn tin chính thức đã xác minh. Bài viết sẽ kèm liên kết nguồn khi sẵn sàng." />
          </SectionCard>
        </div>

        <div className="sky-card" style={{ padding: 0 }}>
          <SectionCard id="item-lookup" title="Tra cứu item">
            <p className="section-description">Tìm theo tên và slot khi danh mục được kết nối.</p>
            <div className="lookup-controls" role="group" aria-label="Tra cứu item chưa sẵn sàng" aria-describedby="lookup-reason">
              <TextInput id="item-query" label="Tên item" type="search" placeholder="Danh mục chưa sẵn sàng" readOnly aria-describedby="lookup-reason" />
              <div className="lookup-controls__row">
                <div className="input-field">
                  <label htmlFor="item-slot">Slot</label>
                  <select id="item-slot" disabled aria-describedby="lookup-reason">
                    <option>Tất cả slot</option>
                  </select>
                </div>
                <Button disabled aria-describedby="lookup-reason">Tìm item</Button>
              </div>
            </div>
            <div id="lookup-reason">
              <ContentState kind="unavailable" message="Chưa có danh mục item đã kiểm chứng. Tìm kiếm và bộ lọc hiện chưa hoạt động." />
            </div>
          </SectionCard>
        </div>

        <div className="sky-card" style={{ padding: 0 }}>
          <SectionCard id="wardrobe" title="Wardrobe" className="section-card--wardrobe" badge={<StatusBadge>Demo chưa sẵn sàng</StatusBadge>}>
            <p className="wardrobe-heading">Một không gian cho outfit của bạn.</p>
            <p className="section-description">Phối đồ, lưu và chia sẻ outfit khi editor được triển khai.</p>
            <ContentState kind="unavailable" message="Editor chưa được triển khai. Chưa có demo thử đồ hoặc tài nguyên game để sử dụng." />
          </SectionCard>
        </div>

        <div className="sky-card hub-grid__wide" style={{ padding: 0 }}>
          <SectionCard id="maps-routes" title="Bản đồ / hướng dẫn" className="section-card--compact" badge={<StatusBadge>Chưa triển khai</StatusBadge>}>
            <p>Chưa có bản đồ và hướng dẫn với nguồn đã kiểm chứng.</p>
          </SectionCard>
        </div>

        <div className="sky-card hub-grid__wide">
          <details className="community-panel">
            <summary>
              <span className="community-panel__title">Tin cộng đồng <span>Chưa xác nhận</span></span>
              <StatusBadge>Chưa có nguồn đã duyệt</StatusBadge>
            </summary>
            <div className="community-panel__body">
              <ContentState kind="unavailable" message="Khu vực này chưa triển khai. Nội dung cộng đồng sẽ có cảnh báo spoiler và được giữ riêng với tin chính thức." />
            </div>
          </details>
        </div>
      </div>
    </>
  )
}
