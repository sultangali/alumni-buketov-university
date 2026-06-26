import type { CSSProperties } from 'react'
import { useApp } from '../AppContext'
import { seg } from '../lib/logic'
import type { Lang, Theme } from '../types'

const LANGS: [Lang, string][] = [
  ['ru', 'РУС'],
  ['kz', 'ҚАЗ'],
  ['en', 'ENG'],
]
const THEMES: [Theme, string, string][] = [
  ['light', '☀', 'Светлая'],
  ['dark', '☾', 'Тёмная'],
  ['contrast', '◑', 'Для слабовидящих'],
]

const MonitorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="4" width="19" height="12.5" rx="1.5" />
    <path d="M8.5 20.5h7M12 16.5v4" />
  </svg>
)
const KioskIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="6.5" y="2.5" width="11" height="19" rx="2" />
    <path d="M10.5 18.5h3" />
  </svg>
)

export function AppBar() {
  const { narrow, ui, lang, theme, setLang, setTheme, setPreview, goHome, go } = useApp()

  // Uniform height for every control on the right of the bar.
  const CTRL_H = narrow ? 34 : 38
  const INNER_H = CTRL_H - 6

  const pillBox: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: CTRL_H,
    background: 'var(--c-bg2)',
    border: 'var(--bw) solid var(--c-line)',
    borderRadius: 999,
    padding: '0 3px',
    boxSizing: 'border-box',
  }

  // Inner pill/segment, vertically centred to a fixed height.
  const inner = (active: boolean, extra?: CSSProperties): CSSProperties => ({
    ...seg(narrow, active),
    padding: narrow ? '0 10px' : '0 13px',
    height: INNER_H,
    display: 'inline-flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    ...extra,
  })

  const modeOpt = (active: boolean): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: INNER_H + 6,
    height: INNER_H,
    border: 'none',
    cursor: 'pointer',
    borderRadius: 999,
    background: active ? 'var(--c-primary)' : 'transparent',
    color: active ? '#fff' : 'var(--c-ink2)',
    transition: 'all .15s ease',
  })

  const staffBtnStyle: CSSProperties = {
    border: 'var(--bw) solid var(--c-line)',
    background: 'var(--c-bg2)',
    color: 'var(--c-ink)',
    cursor: 'pointer',
    fontFamily: 'Manrope, sans-serif',
    fontWeight: 700,
    borderRadius: 999,
    height: CTRL_H,
    display: 'inline-flex',
    alignItems: 'center',
    padding: narrow ? '0 13px' : '0 17px',
    fontSize: 'var(--t-xs)',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '13px var(--pad)',
        background: 'color-mix(in srgb, var(--c-bg) 86%, transparent)',
        backdropFilter: 'blur(14px)',
        borderBottom: 'var(--bw) solid var(--c-line)',
      }}
    >
      <div
        onClick={goHome}
        style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' }}
      >
        <img
          src="/logo.png"
          alt="Karaganda Buketov University"
          width={42}
          height={42}
          style={{ display: 'block', objectFit: 'contain', flex: '0 0 auto' }}
        />
        <div style={{ lineHeight: 1.15 }}>
          <div
            style={{
              fontFamily: 'Lora, serif',
              fontWeight: 700,
              color: 'var(--c-ink)',
              fontSize: 'var(--t-md)',
            }}
          >
            Alumni
          </div>
          <div
            style={{
              fontSize: 'var(--t-2xs)',
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: 'var(--c-gold)',
              fontWeight: 700,
            }}
          >
            Buketov University
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--gap-ctrl)',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}
      >
        <div style={pillBox} role="group" aria-label={`${ui.modeWeb} / ${ui.modeKiosk}`}>
          <button
            onClick={() => setPreview('browser')}
            title={ui.modeWeb}
            aria-label={ui.modeWeb}
            aria-pressed={!narrow}
            style={modeOpt(!narrow)}
          >
            <MonitorIcon />
          </button>
          <button
            onClick={() => setPreview('kiosk')}
            title={ui.modeKiosk}
            aria-label={ui.modeKiosk}
            aria-pressed={narrow}
            style={modeOpt(narrow)}
          >
            <KioskIcon />
          </button>
        </div>
        <div style={pillBox}>
          {LANGS.map(([code, label]) => (
            <button key={code} onClick={() => setLang(code)} style={inner(lang === code)}>
              {label}
            </button>
          ))}
        </div>
        <div style={pillBox}>
          {THEMES.map(([key, icon, title]) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              title={title}
              style={inner(theme === key, { padding: narrow ? '0 8px' : '0 10px', fontSize: 15 })}
            >
              {icon}
            </button>
          ))}
        </div>
        <button onClick={() => go({ name: 'access' })} style={staffBtnStyle}>
          {ui.accessBtn}
        </button>
      </div>
    </div>
  )
}
