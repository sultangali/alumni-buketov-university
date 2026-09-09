import { useState, useEffect, type CSSProperties } from 'react'
import { useApp } from '../AppContext'
import { vars } from '../lib/theme'
import { ScreenRouter } from '../components/ScreenRouter'
import { KioskChrome } from './KioskChrome'
import { KioskHome } from './KioskHome'
import { useIdle } from './useIdle'
import { AttractOverlay } from './AttractOverlay'
import { KeyboardProvider, useKeyboard } from './keyboard'
import { KioskSearch } from './KioskSearch'
import { OnScreenKeyboard } from './OnScreenKeyboard'
import { StaffPinOverlay } from './StaffPinOverlay'

function DismissKeyboardOnRoute() {
  const kb = useKeyboard()
  const { route } = useApp()
  // blur the on-screen keyboard whenever the route changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { kb.blur() }, [route])
  return null
}

export function KioskApp() {
  const { theme, motion, route, goHome, setListQuery, setListYear, logout } = useApp()
  const [attract, setAttract] = useState(false)
  const [search, setSearch] = useState(false)
  const [pin, setPin] = useState(false)
  useEffect(() => { setSearch(false); setPin(false) }, [route])
  useIdle(60000, () => {
    logout()
    setPin(false)
    setSearch(false)
    setListQuery('')
    setListYear('all')
    goHome()
    setAttract(true)
  })

  const stage: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: '#05070b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  const screen: CSSProperties = {
    ...vars(theme, true, true),
    position: 'relative',
    height: '100dvh',
    aspectRatio: '9 / 16',
    maxWidth: '100vw',
    background: 'var(--c-bg)',
    color: 'var(--c-ink)',
    fontFamily: 'var(--font-ui, "Inter", system-ui, sans-serif)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }
  // One persistent watermark changes pose beneath the routed content.
  const contentLayer: CSSProperties = {
    position: 'relative',
    zIndex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <div style={stage}>
      <div style={screen} data-kiosk="1" data-motion={motion}>
        <div className="kiosk-brand-background" aria-hidden="true" data-page={search ? 'search' : route.name} data-theme={theme}>
          <img src="/logo.png" alt=""/>
        </div>

        <div style={contentLayer}>
          <KeyboardProvider>
            <DismissKeyboardOnRoute />
            <KioskChrome onCloseSearch={() => setSearch(false)} searchOpen={search} onSearch={() => setSearch(true)} onLogoHold={() => setPin(true)} onSlideshow={() => setAttract(true)}>
              {search ? <KioskSearch onClose={() => setSearch(false)} /> : route.name === 'home' ? <KioskHome onSearch={() => setSearch(true)} /> : <ScreenRouter key={JSON.stringify(route)} />}
            </KioskChrome>
            {attract && <AttractOverlay onDismiss={() => setAttract(false)} />}
            {pin && <StaffPinOverlay onClose={() => setPin(false)} />}
            <OnScreenKeyboard />
          </KeyboardProvider>
        </div>
      </div>
    </div>
  )
}
