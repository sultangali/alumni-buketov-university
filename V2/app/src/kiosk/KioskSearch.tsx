import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useApp } from '../AppContext'
import { ALU, TEACHERS, LAUREATES, VETERANS } from '../data/records'
import { alumnusToPerson, cardGrad, initials } from '../lib/logic'
import { useKeyboard } from './keyboard'
import { Icon } from '../components/icons'

export function KioskSearch({ onClose }: { onClose: () => void }) {
  const { ui, L, go } = useApp()
  const kb = useKeyboard()
  const [q, setQ] = useState('')
  // open the on-screen keyboard for this search field; close it on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    kb.focus(setQ)
    return () => kb.blur()
  }, [])

  const people = useMemo(() => [...ALU.map(alumnusToPerson), ...TEACHERS, ...LAUREATES, ...VETERANS], [])
  const query = q.trim().toLowerCase()
  const results = query ? people.filter((p) => L(p.name).toLowerCase().includes(query)).slice(0, 30) : []

  const field: CSSProperties = { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 'var(--t-md)', color: 'var(--c-ink)', fontFamily: 'var(--font-ui, "Inter", sans-serif)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 'var(--pad)', border: '2px solid var(--c-primary)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
        <Icon name="search" size={20} />
        <input autoFocus value={q} placeholder={ui.kioskSearchPh} style={field}
          onFocus={() => kb.focus(setQ)}
          onChange={(e) => setQ(e.target.value)} />
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--c-ink2)', fontSize: 'var(--t-md)', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 var(--pad)' }}>
        {results.map((p) => (
          <button key={p.id} onClick={() => { kb.blur(); onClose(); go({ name: 'alumni', id: p.id }) }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--c-line)', background: 'transparent', padding: '14px 0', cursor: 'pointer' }}>
            <div style={{ width: 52, height: 52, borderRadius: 'var(--r)', background: cardGrad(p.accent), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display, "EB Garamond", serif)', fontWeight: 700 }}>{initials(p.name)}</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display, "EB Garamond", serif)', fontWeight: 600, fontSize: 'var(--t-md)', color: 'var(--c-ink)' }}>{L(p.name)}</div>
              <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-sm)' }}>{L(p.pos)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
