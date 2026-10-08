import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App'
import { WebAnalytics } from './shared/analytics/WebAnalytics'
import './app/styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing app root')

createRoot(root).render(
  <BrowserRouter>
    <StrictMode>
      <App />
    </StrictMode>
    {/* One analytics instance outside StrictMode's development effect replay. */}
    <WebAnalytics />
  </BrowserRouter>,
)
