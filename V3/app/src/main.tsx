import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { ResilienceBoundary } from './components/ResilienceBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ResilienceBoundary><App /></ResilienceBoundary>
  </StrictMode>,
)
