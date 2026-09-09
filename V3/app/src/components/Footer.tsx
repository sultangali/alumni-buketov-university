import { useApp } from '../AppContext'

export function Footer() {
  const { ui } = useApp()
  return (
    <div
      style={{
        padding: '20px var(--pad)',
        borderTop: 'var(--bw) solid var(--c-line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--c-ink2)', fontWeight: 600 }}>
        {ui.footer}
      </div>
      <div style={{ fontSize: 'var(--t-2xs)', color: 'var(--c-ink2)' }}>
        © 2026 · Karaganda Buketov University
      </div>
    </div>
  )
}
