import type { CSSProperties } from 'react'
import { useKeyboard } from './keyboard'

const RU = ['ЙЦУКЕНГШЩЗХ', 'ФЫВАПРОЛДЖЭ', 'ЯЧСМИТЬБЮ']
const EN = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

export function OnScreenKeyboard() {
  const kb = useKeyboard()
  if (!kb.active) return null
  const rows = kb.layout === 'ru' ? RU : EN

  const key: CSSProperties = { minWidth: 30, height: 52, flex: 1, maxWidth: 56, border: '1px solid var(--c-line)', borderRadius: 'var(--r)', background: 'var(--c-surface)', color: 'var(--c-ink)', fontSize: 18, fontWeight: 600, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }
  const wide: CSSProperties = { ...key, maxWidth: 120 }

  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 90, background: 'var(--c-bg2)', borderTop: '1px solid var(--c-line)', padding: '10px 8px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {'1234567890'.split('').map((d) => (<button key={d} style={key} onClick={() => kb.type(d)}>{d}</button>))}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {r.split('').map((c) => (<button key={c} style={key} onClick={() => kb.type(c)}>{c}</button>))}
          {i === rows.length - 1 && (<button style={wide} onClick={kb.backspace}>⌫</button>)}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        <button style={wide} onClick={() => kb.setLayout(kb.layout === 'ru' ? 'en' : 'ru')}>{kb.layout === 'ru' ? 'EN' : 'РУ'}</button>
        <button style={{ ...key, maxWidth: 240 }} onClick={() => kb.type(' ')}>␣</button>
        <button style={key} onClick={() => kb.type('@')}>@</button>
        <button style={wide} onClick={kb.blur}>✓</button>
      </div>
    </div>
  )
}
