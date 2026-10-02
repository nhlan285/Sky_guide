import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Hub } from '../features/hub/Hub'
import { SectionCard, StatusBadge } from '../shared/ui/primitives'

function focusLookup() {
  document.getElementById('item-query')?.focus()
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()

  function closeMenu() {
    setMenuOpen(false)
    if (menuOpen) menuButton.current?.focus()
  }

  function jumpToLookup() {
    closeMenu()
    if (pathname === '/') focusLookup()
  }

  return (
    <header className="site-header" onKeyDown={event => {
      if (event.key === 'Escape' && menuOpen) {
        closeMenu()
      }
    }}>
      <div className="site-header__inner page-width">
        <Link to="/" className="wordmark" onClick={closeMenu} aria-label="Sky Guide, trang chủ">Sky <span>Guide</span></Link>
        <div className="header-controls">
          <Link to="/#item-lookup" className="button button--quiet header-search" onClick={jumpToLookup}>Tìm kiếm</Link>
          <button ref={menuButton} type="button" className="button button--quiet menu-toggle" aria-expanded={menuOpen} aria-controls="main-nav" onClick={() => {
            setMenuOpen(!menuOpen)
            if (menuOpen) menuButton.current?.focus()
          }}>{menuOpen ? 'Đóng menu' : 'Menu'}</button>
        </div>
        <nav id="main-nav" className={`main-nav${menuOpen ? ' main-nav--open' : ''}`} aria-label="Điều hướng chính">
          <NavLink to="/" end onClick={closeMenu}>Trang chủ</NavLink>
          <Link to="/#item-lookup" onClick={jumpToLookup}>Tra cứu item</Link>
          <Link to="/#wardrobe" onClick={closeMenu}>Wardrobe <span className="nav-note">Chưa triển khai</span></Link>
          <NavLink to="/about" onClick={closeMenu}>Giới thiệu</NavLink>
        </nav>
      </div>
    </header>
  )
}

function About() {
  return (
    <div className="information-page">
      <div className="page-intro">
        <h1 id="page-title" tabIndex={-1}>Giới thiệu Sky Guide</h1>
        <p>Cẩm nang cộng đồng đang được xây dựng, ưu tiên thông tin có nguồn và trạng thái rõ ràng.</p>
      </div>
      <SectionCard id="about-data" title="Nguồn và ghi công">
        <p>Danh mục item, lịch Traveling Spirit, mùa và tin chính thức chưa được kết nối. Khi có dữ liệu đã kiểm chứng, từng nội dung sẽ kèm nguồn và thông tin cập nhật.</p>
        <StatusBadge>Chưa có dữ liệu</StatusBadge>
      </SectionCard>
      <SectionCard id="about-rights" title="Pháp lý và tài nguyên">
        <p>Sky Guide là dự án cộng đồng độc lập. Giao diện hiện chưa sử dụng artwork hoặc tài nguyên game.</p>
        <p>Quyền sử dụng bộ tài nguyên game đầy đủ vẫn đang chờ xác nhận pháp lý (pending legal confirmation).</p>
      </SectionCard>
      <SectionCard id="about-device" title="Thiết lập trên thiết bị">
        <p>Lưu outfit, thiết lập cá nhân và nhắc nhở chưa được triển khai.</p>
        <p>Khi có tính năng nhắc, bạn sẽ chủ động bật; nhắc chỉ hoạt động khi ứng dụng đang mở.</p>
      </SectionCard>
      <Link className="text-link" to="/">Về trang chủ</Link>
    </div>
  )
}

function NotFound() {
  return (
    <div className="information-page">
      <div className="page-intro">
        <h1 id="page-title" tabIndex={-1}>Không tìm thấy trang</h1>
        <p>Đường dẫn này không có trong Sky Guide.</p>
      </div>
      <Link className="button" to="/">Về trang chủ</Link>
    </div>
  )
}

function Footer() {
  return (
    <footer className="site-footer page-width">
      <div><p className="footer-brand">Sky Guide</p><p>Cẩm nang cộng đồng đang được xây dựng.</p></div>
      <nav aria-label="Thông tin và thiết lập">
        <Link to="/about#about-data">Nguồn / ghi công</Link>
        <Link to="/about#about-rights">Pháp lý</Link>
        <Link to="/about#about-device">Thiết lập trên thiết bị</Link>
      </nav>
    </footer>
  )
}

export function App() {
  const { pathname, hash } = useLocation()
  const previousLocation = useRef({ pathname, hash })

  useEffect(() => {
    document.title = pathname === '/' ? 'Sky Guide | Trang chủ' : pathname === '/about' ? 'Giới thiệu | Sky Guide' : 'Không tìm thấy trang | Sky Guide'
    const changed = previousLocation.current.pathname !== pathname || previousLocation.current.hash !== hash
    previousLocation.current = { pathname, hash }
    if (!hash && !changed) return
    const target = hash ? document.getElementById(hash.slice(1)) : document.getElementById('page-title')
    if (hash) target?.scrollIntoView({ block: 'start' })
    else window.scrollTo({ top: 0 })
    if (hash === '#item-lookup' && pathname === '/') focusLookup()
    else target?.focus({ preventScroll: true })
  }, [pathname, hash])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng, tới nội dung</a>
      <Header />
      <main id="main-content" className="page-width" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Hub />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
