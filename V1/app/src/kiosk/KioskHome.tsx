import type { CSSProperties } from 'react'
import { Icon, type IconName } from '../components/icons'
import { useApp } from '../AppContext'
import type { Route } from '../types'

export function KioskHome({ onSearch }: { onSearch: () => void }) {
  const { ui, go } = useApp()

  const tiles: { route: Route; icon: IconName; title: string }[] = [
    { route: { name: 'faculties' }, icon: 'cap', title: ui.kioskCatAlumni },
    { route: { name: 'teachers' }, icon: 'person', title: ui.catTeachers },
    { route: { name: 'laureates' }, icon: 'trophy', title: ui.catLaureates },
    { route: { name: 'veterans' }, icon: 'medal', title: ui.catVeterans },
  ]

  const tile: CSSProperties = {
    border: 'var(--bw) solid var(--c-line)',
    borderTop: '3px solid var(--c-primary)',
    borderRadius: 'var(--r)',
    background: 'var(--c-surface)',
    padding: 20,
    minHeight: 120,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    cursor: 'pointer',
    textAlign: 'left',
    color: 'var(--c-ink)',
    fontFamily: 'Manrope, sans-serif',
  }

  return (
    <div style={{ padding: '24px var(--pad) 28px', animation: 'fadeUp .4s ease' }}>
      <h1 style={{ fontFamily: 'Lora, serif', fontWeight: 700, fontSize: 'var(--t-2xl)', lineHeight: 1.05, margin: '0 0 10px' }}>
        {ui.heroTitle}
      </h1>
      <div style={{ height: 3, width: 64, background: 'var(--c-primary)', marginBottom: 18 }} />

      <button
        onClick={onSearch}
        style={{ width: '100%', minHeight: 'var(--touch)', display: 'flex', alignItems: 'center', gap: 12, border: '2px solid var(--c-line)', borderRadius: 'var(--r)', background: 'var(--c-bg2)', color: 'var(--c-ink2)', fontSize: 'var(--t-md)', fontWeight: 600, padding: '0 18px', cursor: 'pointer', marginBottom: 18 }}
      >
        <Icon name="search" size={20} /> {ui.kioskSearchBtn}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--gap-card)' }}>
        {tiles.map((t, i) => (
          <button key={i} onClick={() => go(t.route)} style={tile}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--r)', background: 'var(--c-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={t.icon} size={22} /></div>
            <div style={{ fontFamily: 'Lora, serif', fontWeight: 600, fontSize: 'var(--t-md)' }}>{t.title}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
