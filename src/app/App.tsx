import { NavLink, Route, Routes } from 'react-router-dom'

export function App() {
  return (
    <div className="app-shell">
      <header>
        <nav aria-label="Điều hướng chính">
          <NavLink to="/" end>Trang chủ</NavLink>
          <NavLink to="/about">Giới thiệu</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<h1>Sky Guide</h1>} />
          <Route path="/about" element={<><h1>Giới thiệu</h1><p>Sky Guide</p></>} />
          <Route path="*" element={<><h1>Không tìm thấy trang</h1><NavLink to="/">Về trang chủ</NavLink></>} />
        </Routes>
      </main>
    </div>
  )
}
