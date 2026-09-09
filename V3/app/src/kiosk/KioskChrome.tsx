import { useEffect, useRef, type ReactNode } from 'react'
import { useOptionalKeyboard } from './keyboard'
import { useApp } from '../AppContext'
import { Icon } from '../components/icons'

export function KioskChrome({ children, onLogoHold, onSlideshow, onSearch, onCloseSearch, searchOpen }: { children: ReactNode; onLogoHold: () => void; onSlideshow: () => void; onSearch: () => void; onCloseSearch: () => void; searchOpen: boolean }) {
  const kb = useOptionalKeyboard()
  const { staff, logout, ui, lang, setLang, theme, setTheme, go, goHome, showCrumb, back, setPreview, route } = useApp()

  const holdTimer = useRef<ReturnType<typeof setTimeout>>()
  const startHold = () => {
    holdTimer.current = setTimeout(onLogoHold, 2500)
  }
  const cancelHold = () => { if (holdTimer.current) clearTimeout(holdTimer.current) }

  // every screen starts at the top when the route changes
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [route])


  return (
    <>
      <div className="kiosk-topbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px var(--pad)',
          borderBottom: 'var(--bw) solid var(--c-line)',
        }}
      >
        <img
          src="/logo.png"
          alt="Karaganda Buketov University"
          width={48}
          height={48}
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          style={{ display: 'block', objectFit: 'contain', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* light / dark theme toggle */}
          <div style={{ display: 'flex', border: 'var(--bw) solid var(--c-line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            {([['light', 'sun'], ['dark', 'moon']] as const).map(([t, icon]) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                aria-label={t === 'light' ? ui.themeLight : ui.themeDark}
                title={t === 'light' ? ui.themeLight : ui.themeDark}
                style={{ minWidth: 46, minHeight: 48, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme === t ? 'var(--c-primary)' : 'transparent', color: theme === t ? '#fff' : 'var(--c-ink2)', cursor: 'pointer' }}
              >
                <Icon name={icon} size={20} />
              </button>
            ))}
          </div>
          {staff && <button style={{ minHeight: 48 }} onClick={logout}>{ui.logoutBtn}</button>}
          {/* slideshow */}
          <button
            onClick={onSlideshow}
            aria-label={ui.kioskSlideshow}
            title={ui.kioskSlideshow}
            style={{ minWidth: 48, minHeight: 48, border: 'var(--bw) solid var(--c-line)', borderRadius: 'var(--r)', background: 'transparent', color: 'var(--c-ink2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="slideshow" size={22} />
          </button>
          {/* languages — connected segmented group */}
          <div style={{ display: 'flex', border: 'var(--bw) solid var(--c-line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            {(['ru', 'kz', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  minWidth: 48,
                  minHeight: 48,
                  border: 'none',
                  background: lang === l ? 'var(--c-primary)' : 'transparent',
                  color: lang === l ? '#fff' : 'var(--c-ink2)',
                  fontWeight: 700,
                  fontFamily: 'var(--font-ui, "Inter", sans-serif)',
                  cursor: 'pointer',
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          {/* prototype-only exit to website */}
          <button
            onClick={() => setPreview('browser')}
            title="exit kiosk"
            style={{ minWidth: 48, minHeight: 48, border: 'var(--bw) solid var(--c-line)', borderRadius: 'var(--r)', background: 'transparent', color: 'var(--c-ink2)', cursor: 'pointer' }}
          >
            ⇱
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="kiosk-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>{children}</div>

      <nav className="kiosk-bottom-nav" aria-label={lang === 'ru' ? 'Навигация киоска' : lang === 'kz' ? 'Киоск навигациясы' : 'Kiosk navigation'} data-keyboard={kb?.active ? 'open' : undefined}>
        <button disabled={!showCrumb && !searchOpen} onClick={() => { kb?.blur(); searchOpen ? onCloseSearch() : back() }} aria-label={ui.kioskBack}>
          <Icon name="chevronLeft" size={18}/><span>{ui.kioskBack}</span>
        </button>
        <button onClick={() => { kb?.blur(); goHome() }} aria-current={route.name === 'home' && !searchOpen ? 'page' : undefined} aria-label={ui.kioskHome}>
          <Icon name="home" size={18}/><span>{ui.kioskHome}</span>
        </button>
        <button onClick={onSearch} aria-pressed={searchOpen} aria-label={ui.kioskSearchBtn}>
          <Icon name="search" size={18}/><span>{lang === 'ru' ? 'Поиск' : lang === 'kz' ? 'Іздеу' : 'Search'}</span>
        </button>
        <button onClick={() => { kb?.blur(); go({ name: 'apply' }) }} aria-current={route.name === 'apply' && !searchOpen ? 'page' : undefined} aria-label={ui.kioskApply}>
          <Icon name="plus" size={18}/><span>{lang === 'ru' ? 'Заявка' : lang === 'kz' ? 'Өтінім' : 'Apply'}</span>
        </button>
      </nav>
    </>
  )
}
