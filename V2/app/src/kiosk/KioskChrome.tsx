import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { useApp } from '../AppContext'
import { Icon } from '../components/icons'

export function KioskChrome({ children, onLogoHold, onSlideshow }: { children: ReactNode; onLogoHold: () => void; onSlideshow: () => void }) {
  const { ui, lang, setLang, theme, setTheme, go, goHome, showCrumb, back, setPreview, route } = useApp()

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

  const navBtn: CSSProperties = {
    flex: 1,
    minHeight: 'var(--touch)',
    border: 'var(--bw) solid var(--c-line)',
    borderRadius: 'var(--r)',
    background: 'transparent',
    color: 'var(--c-ink)',
    fontFamily: 'var(--font-ui, "Inter", sans-serif)',
    fontWeight: 600,
    fontSize: 'var(--t-sm)',
    cursor: 'pointer',
  }

  return (
    <>
      <div
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

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>{children}</div>

      <div style={{ display: 'flex', gap: 10, padding: '12px var(--pad)', borderTop: 'var(--bw) solid var(--c-line)' }}>
        {showCrumb && (
          <button style={navBtn} onClick={back}>
            ‹ {ui.kioskBack}
          </button>
        )}
        <button style={{ ...navBtn, background: 'var(--c-primary)', color: '#fff', borderColor: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={goHome}>
          <Icon name="home" size={18} /> {ui.kioskHome}
        </button>
        <button style={{ ...navBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => go({ name: 'apply' })}>
          <Icon name="plus" size={18} /> {ui.kioskApply}
        </button>
      </div>
    </>
  )
}
