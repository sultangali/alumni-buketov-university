import { useEffect, useRef, type CSSProperties } from 'react'
import { useApp } from '../AppContext'
import { vars } from '../lib/theme'
import { AppBar } from './AppBar'
import { Breadcrumb } from './Breadcrumb'
import { Footer } from './Footer'
import { ScreenRouter } from './ScreenRouter'

export function Frame() {
  const { narrow, theme, motion, route } = useApp()

  // Reset the scroll position to the top whenever the route changes, so every
  // screen starts at the top instead of inheriting the previous screen's scroll.
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0 })
  }, [route])

  const frameStyle: CSSProperties = {
    ...vars(theme, narrow),
    display: 'flex',
    flexDirection: 'column',
    borderRadius: narrow ? 40 : 14,
    overflow: 'hidden',
    background: '#06080E',
    border: narrow ? '12px solid #131722' : '1px solid #2A3242',
    boxShadow: '0 40px 90px -34px rgba(0,0,0,.72)',
    maxWidth: '100%',
  }

  const screenStyle: CSSProperties = {
    width: narrow ? 440 : 'min(1180px, 92vw)',
    height: narrow ? 880 : 760,
    overflow: 'hidden',
    position: 'relative',
    background: 'var(--c-bg)',
    color: 'var(--c-ink)',
    fontFamily: 'var(--font-ui)',
  }

  // Inner layer that actually scrolls; sits above the fixed watermark.
  const scrollStyle: CSSProperties = {
    position: 'relative',
    zIndex: 1,
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  // Large, static brand watermark pinned to the centre of the screen.
  const watermarkStyle: CSSProperties = {
    position: 'absolute',
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
    <div style={frameStyle} data-motion={motion}>
      {/* ---- browser chrome ---- */}
      {!narrow && (
        <div
          style={{
            height: 38,
            flex: '0 0 38px',
            background: 'var(--c-bg2)',
            borderBottom: 'var(--bw) solid var(--c-line)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 14px',
          }}
        >
          <div style={{ display: 'flex', gap: 7 }}>
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#e1604f' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#e9b94d' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#5cb868' }} />
          </div>
          <div
            style={{
              flex: 1,
              maxWidth: 420,
              margin: '0 auto',
              height: 23,
              background: 'var(--c-bg)',
              border: 'var(--bw) solid var(--c-line)',
              borderRadius: 7,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '0 11px',
              color: 'var(--c-ink2)',
              fontSize: 12,
            }}
          >
            <span style={{ opacity: 0.7 }}>🔒</span> alumni.buketov.edu.kz
          </div>
        </div>
      )}

      {/* ---- kiosk top notch ---- */}
      {narrow && (
        <div
          style={{
            height: 30,
            flex: '0 0 30px',
            background: '#131722',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#2A3242' }} />
          <div style={{ width: 46, height: 6, borderRadius: 999, background: '#1C2536' }} />
        </div>
      )}

      {/* ---- the app screen ---- */}
      <div style={screenStyle}>
        <img src="/logo.png" alt="" aria-hidden="true" style={watermarkStyle} />
        <div ref={scrollRef} style={scrollStyle}>
          <AppBar />
          <Breadcrumb />
          <div style={{ flex: 1 }}>
            <ScreenRouter />
          </div>
          <Footer />
        </div>
      </div>

      {/* ---- kiosk bottom bar ---- */}
      {narrow && (
        <div
          style={{
            height: 56,
            flex: '0 0 56px',
            background: 'linear-gradient(#131722, #06080E)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 120, height: 5, borderRadius: 999, background: '#1C2536' }} />
        </div>
      )}
    </div>
  )
}
