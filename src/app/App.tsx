import { lazy, memo, Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Hub } from '../features/hub/Hub'
import { SectionCard } from '../shared/ui/primitives'
import { ConstellationLanding } from '../features/constellation/ConstellationLanding'
import { SkyAtmosphere } from '../features/constellation/SkyAtmosphere'
import { SkyControls } from '../features/constellation/SkyControls'
import { ThemeProvider, useTheme } from '../features/constellation/useTheme.tsx'
import { LocaleProvider, useLocale } from '../shared/i18n/useLocale'
import { SourceCredits } from '../features/items/SourceCredits.tsx'

const WardrobeEditor = lazy(() => import('../features/wardrobe/WardrobeEditor').then(module => ({ default: module.WardrobeEditor })))
const Items = lazy(() => import('../features/items/Items').then(module => ({ default: module.Items })))
const MemoizedSkyAtmosphere = memo(SkyAtmosphere)

function focusLookup() {
  document.getElementById('item-query')?.focus()
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()
  const { t } = useLocale()

  function closeMenu() {
    setMenuOpen(false)
    if (menuOpen) menuButton.current?.focus()
  }

  function jumpToLookup() {
    closeMenu()
    if (pathname === '/hub') focusLookup()
  }

  return (
    <header className="site-header" onKeyDown={event => {
      if (event.key === 'Escape' && menuOpen) {
        closeMenu()
      }
    }}>
      <div className="site-header__inner page-width">
        <Link to="/" className="wordmark" onClick={closeMenu} aria-label={t('landing.title')}>Sky <span>Guide</span></Link>
        <div className="header-controls">
          <SkyControls />
          <Link to="/items" className="button button--quiet header-search" onClick={jumpToLookup}>{t('nav.itemLookup')}</Link>
          <button ref={menuButton} type="button" className="button button--quiet menu-toggle" aria-expanded={menuOpen} aria-controls="main-nav" onClick={() => {
            setMenuOpen(!menuOpen)
            if (menuOpen) menuButton.current?.focus()
          }}>{t(menuOpen ? 'nav.close' : 'nav.menu')}</button>
        </div>
        <nav id="main-nav" className={`main-nav${menuOpen ? ' main-nav--open' : ''}`} aria-label={t('a11y.mainNav')}>
          <NavLink to="/" end onClick={closeMenu}>{t('nav.home')}</NavLink>
          <NavLink to="/hub" onClick={closeMenu}>{t('nav.hub')}</NavLink>
          <NavLink to="/items" onClick={closeMenu}>{t('nav.itemLookup')}</NavLink>
          <NavLink to="/wardrobe" onClick={closeMenu}>{t('nav.wardrobe')}</NavLink>
          <NavLink to="/about" onClick={closeMenu}>{t('nav.about')}</NavLink>
        </nav>
      </div>
    </header>
  )
}

function About() {
  const { t, locale } = useLocale()
  return (
    <div className="information-page">
      <div className="page-intro">
        <h1 id="page-title" tabIndex={-1}>{t('about.title')}</h1>
        <p>{t('about.description')}</p>
      </div>
      <SectionCard id="about-data" title={t('about.data')}>
        <p>{t('about.data.text')}</p>
        <Link className="button" to="/items">{t('nav.itemLookup')}</Link>
        <SourceCredits />
      </SectionCard>
      <SectionCard id="about-rights" title={t('about.rights')}>
        <p>{t('about.rights.text')}</p>
        <p>{t('about.rights.pending')}</p>
      </SectionCard>
      <SectionCard id="about-device" title={t('about.device')}>
        <p>{t('about.device.text')}</p>
        <p>{t('about.device.note')}</p>
      </SectionCard>
      <SectionCard id="about-analytics" title={locale === 'vi' ? 'Thống kê truy cập' : 'Visit statistics'}>
        <p>{locale === 'vi' ? 'Sky Guide dùng Vercel Web Analytics để xem số lượt truy cập các trang công khai. Nội dung outfit, tên outfit đã lưu và dữ liệu trong liên kết chia sẻ không được gửi vào thống kê.' : 'Sky Guide uses Vercel Web Analytics to count visits to public pages. Outfit contents, saved outfit names and share-link data are excluded from analytics.'}</p>
      </SectionCard>
      <Link className="text-link" to="/hub">{t('nav.hub')}</Link>
    </div>
  )
}

function NotFound() {
  const { t } = useLocale()
  return (
    <div className="information-page">
      <div className="page-intro">
        <h1 id="page-title" tabIndex={-1}>{t('notFound.title')}</h1>
        <p>{t('notFound.text')}</p>
      </div>
      <Link className="button" to="/">{t('nav.home')}</Link>
    </div>
  )
}

function Footer() {
  const { t } = useLocale()
  return (
    <footer className="site-footer page-width">
      <div><p className="footer-brand">Sky Guide</p><p>{t('footer.description')}</p></div>
      <nav aria-label={t('footer.nav')}>
        <Link to="/about#about-data">{t('about.data')}</Link>
        <Link to="/about#about-rights">{t('about.rights')}</Link>
        <Link to="/about#about-device">{t('about.device')}</Link>
      </nav>
    </footer>
  )
}

function AppContent() {
  const { pathname, hash } = useLocation()
  const previousLocation = useRef({ pathname, hash })
  const { t } = useLocale()
  const { visual } = useTheme()
  const isLanding = pathname === '/'

  useEffect(() => {
    document.title = pathname === '/' ? t('landing.title') : `${pathname === '/hub' ? t('nav.hub') : pathname.startsWith('/items') ? t('nav.itemLookup') : pathname === '/wardrobe' ? t('nav.wardrobe') : pathname === '/about' ? t('nav.about') : t('notFound.title')} | Sky Guide`
    const changed = previousLocation.current.pathname !== pathname || previousLocation.current.hash !== hash
    previousLocation.current = { pathname, hash }
    if (!hash && !changed) return
    const target = hash ? document.getElementById(hash.slice(1)) : document.getElementById('page-title')
    if (hash) target?.scrollIntoView({ block: 'start' })
    else window.scrollTo({ top: 0 })
    if (hash === '#item-lookup' && pathname === '/hub') focusLookup()
    else target?.focus({ preventScroll: true })
  }, [pathname, hash, t])

  return (
    <div className={`app-shell ${isLanding ? 'app-shell--landing' : 'app-shell--hub'} ${visual.daylightWeight > 0.6 ? 'sky-ui--light' : 'sky-ui--dark'}${visual.sunsetWeight > 0.4 ? ' sky-ui--sunset' : ''}`}>
      <MemoizedSkyAtmosphere />
      <a className="skip-link" href="#main-content">{t('a11y.skipNav')}</a>
      {isLanding ? null : <Header />}
      <main id="main-content" className={isLanding ? 'landing-main' : 'page-width'} tabIndex={-1}>
        <Routes>
          <Route path="/" element={<ConstellationLanding />} />
          <Route path="/hub" element={<Hub />} />
          <Route path="/items" element={<Suspense fallback={<p role="status">{t('state.loading')}</p>}><Items /></Suspense>} />
          <Route path="/items/:id" element={<Suspense fallback={<p role="status">{t('state.loading')}</p>}><Items /></Suspense>} />
          <Route path="/wardrobe" element={<Suspense fallback={<p role="status">{t('state.loading')}</p>}><WardrobeEditor /></Suspense>} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {isLanding ? null : <Footer />}
    </div>
  )
}

export function App() {
  return <LocaleProvider><ThemeProvider><AppContent /></ThemeProvider></LocaleProvider>
}
