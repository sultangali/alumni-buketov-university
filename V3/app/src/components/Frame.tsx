import { useEffect, type CSSProperties } from 'react'
import { useApp } from '../AppContext'
import { vars } from '../lib/theme'
import { AppBar } from './AppBar'
import { Breadcrumb } from './Breadcrumb'
import { Footer } from './Footer'
import { ScreenRouter } from './ScreenRouter'

export function Frame() {
  const { narrow, theme, motion, route } = useApp()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [route])

  const rootStyle: CSSProperties = {
    ...vars(theme, narrow),
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    background: 'var(--c-bg)',
    color: 'var(--c-ink)',
    fontFamily: 'var(--font-ui)',
  }


  return (
    <div style={rootStyle} data-motion={motion}>
      
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar />
        <Breadcrumb />
        <div className="web-content" style={{ flex: 1 }}>
          <ScreenRouter />
        </div>
        <Footer />
      </div>
    </div>
  )
}
