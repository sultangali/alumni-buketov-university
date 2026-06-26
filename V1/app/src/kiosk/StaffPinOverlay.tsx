import { useState, type CSSProperties } from 'react'
import { useApp } from '../AppContext'

const PIN = '2468'

export function StaffPinOverlay({ onClose }: { onClose: () => void }) {
  const { ui, go } = useApp()
  const [val, setVal] = useState('')
  const [err, setErr] = useState(false)

  const press = (d: string) => {
    setErr(false)
    const next = (val + d).slice(0, 4)
    setVal(next)
    if (next.length === 4) {
      if (next === PIN) { onClose(); go({ name: 'access' }) }
      else { setErr(true); setVal('') }
    }
  }

  const padBtn: CSSProperties = { minHeight: 'var(--touch)', fontSize: 'var(--t-lg)', fontWeight: 700, border: 'var(--bw) solid var(--c-line)', borderRadius: 'var(--r)', background: 'var(--c-surface)', color: 'var(--c-ink)', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 120, background: 'rgba(6,12,24,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 320, background: 'var(--c-bg)', border: 'var(--bw) solid var(--c-line)', borderRadius: 'var(--r)', padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'Lora, serif', fontWeight: 700, fontSize: 'var(--t-lg)' }}>{ui.kioskPinTitle}</div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--c-ink2)', fontSize: 'var(--t-md)', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ textAlign: 'center', letterSpacing: 10, fontSize: 28, minHeight: 34, color: err ? '#c2410c' : 'var(--c-ink)' }}>
          {'•'.repeat(val.length)}{'◦'.repeat(4 - val.length)}
        </div>
        {err && <div style={{ textAlign: 'center', color: '#c2410c', fontSize: 'var(--t-xs)', fontWeight: 600, margin: '6px 0' }}>{ui.kioskPinWrong}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
          {['1','2','3','4','5','6','7','8','9'].map((d) => <button key={d} style={padBtn} onClick={() => press(d)}>{d}</button>)}
          <div />
          <button style={padBtn} onClick={() => press('0')}>0</button>
          <button style={padBtn} onClick={() => setVal((v) => v.slice(0, -1))}>⌫</button>
        </div>
      </div>
    </div>
  )
}
