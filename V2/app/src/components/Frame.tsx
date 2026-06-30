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

  const watermarkStyle: CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: narrow ? 360 : 620,
    height: narrow ? 360 : 620,
    maxWidth: '88%',
    opacity: 0.05,
    zIndex: 0,
    pointerEvents: 'none',
    userSelect: 'none',
  }

  return (
    <div style={rootStyle} data-motion={motion}>
      <img src="/logo.png" alt="" aria-hidden="true" style={watermarkStyle} />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar />
        <Breadcrumb />
        <div style={{ flex: 1 }}>
          <ScreenRouter />
        </div>
        <Footer />
      </div>
    </div>
  )
}
