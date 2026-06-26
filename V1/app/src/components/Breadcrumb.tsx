import { useApp } from '../AppContext'

export function Breadcrumb() {
  const { showCrumb, crumb, ui, back } = useApp()
  if (!showCrumb) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 12,
        padding: '11px var(--pad)',
        borderBottom: 'var(--bw) solid var(--c-line)',
      }}
    >
      <button
        onClick={back}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          flex: '0 0 auto',
          background: 'transparent',
          border: 'none',
          padding: 0,
          color: 'var(--c-primary)',
          fontSize: 'var(--t-sm)',
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'Manrope, sans-serif',
        }}
      >
        <span style={{ fontSize: '1.2em', lineHeight: 1 }}>‹</span> {ui.back}
      </button>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 'var(--t-xs)',
          color: 'var(--c-ink2)',
          fontWeight: 600,
          lineHeight: 1.5,
          whiteSpace: 'normal',
          wordBreak: 'break-word',
        }}
      >
        {crumb}
      </div>
    </div>
  )
}
