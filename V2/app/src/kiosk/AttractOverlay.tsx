import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useApp } from '../AppContext'
import { featList, cardGrad, initials } from '../lib/logic'
import { Icon } from '../components/icons'
import type { Alumnus } from '../types'

// auto-advance cadence — the progress bar is tied to this so they stay in sync
const ADVANCE_MS = 10000

export function AttractOverlay({ onDismiss }: { onDismiss: () => void }) {
  const { ui, L, theme } = useApp()
  const isDark = theme !== 'light'
  const feats = featList()
  const len = Math.max(1, feats.length)
  // `i` only ever increases; the card rotates an extra 180° each tick so the
  // two faces alternate — it literally flips over to reveal the next person.
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((x) => x + 1), ADVANCE_MS)
    return () => clearInterval(t)
  }, [])
  if (!feats.length) return null

  const at = (n: number): Alumnus => feats[((n % len) + len) % len]
  // content always changes on the hidden face, so there is never a visible pop
  const front = at(i % 2 === 0 ? i : i - 1)
  const back = at(i % 2 === 1 ? i : i + 1)

  // transparent, borderless prev/next controls (stopPropagation so the tap
  // navigates instead of dismissing the attract overlay)
  const navBtnStyle = (side: 'left' | 'right'): CSSProperties => ({
    position: 'absolute',
    left: side === 'left' ? 4 : undefined,
    right: side === 'right' ? 4 : undefined,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 5,
    background: 'transparent',
    border: 'none',
    color: 'var(--c-ink)',
    cursor: 'pointer',
    padding: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.3))',
    WebkitTapHighlightColor: 'transparent',
  })

  // Each face is a near-full-screen tonal "photo" tile (dark in every theme),
  // so its white caption reads on light and dark alike. No hard frame — the
  // edges melt into the backdrop via a soft inset vignette + ambient shadow.
  const faceStyle = (person: Alumnus, isBack: boolean): CSSProperties => ({
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    transform: isBack ? 'rotateY(180deg)' : 'none',
    borderRadius: 22,
    overflow: 'hidden',
    background: cardGrad(person.accent),
    boxShadow: 'inset 0 0 160px 40px rgba(6,12,24,.72), 0 50px 130px -28px rgba(0,0,0,.55)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  })

  const renderFace = (person: Alumnus, isBack: boolean) => (
    <div style={faceStyle(person, isBack)}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display, "EB Garamond", serif)', fontWeight: 700, fontSize: 280, color: 'rgba(255,255,255,.16)', lineHeight: 1 }}>
          {initials(person.name)}
        </span>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 16%, rgba(255,255,255,.16), transparent 52%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 42%, rgba(6,12,24,.5) 66%, rgba(6,12,24,.95))' }} />
      <div style={{ position: 'relative', padding: '0 var(--pad) 12%', color: '#fff', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display, "EB Garamond", serif)', fontWeight: 700, fontSize: 'var(--t-xl)', lineHeight: 1.12, marginBottom: 8, textWrap: 'balance' }}>
          {L(person.name)}
        </div>
        <div style={{ opacity: 0.86, fontSize: 'var(--t-md)' }}>{L(person.pos)}</div>
      </div>
    </div>
  )

  return (
    <div
      onPointerDown={onDismiss}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 26%, var(--c-bg2), var(--c-bg) 76%)',
        color: 'var(--c-ink)',
        cursor: 'pointer',
        animation: 'fadeIn .5s ease',
      }}
    >
      {/* university crest watermark — behind the foreground flip card */}
      <img
        src="/logo.png"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(86%, 500px)',
          opacity: isDark ? 0.14 : 0.1,
          filter: isDark ? 'brightness(0) invert(1)' : 'brightness(0)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      {/* near-full-page flip card (foreground) */}
      <div style={{ position: 'absolute', top: '4%', left: '4%', right: '4%', bottom: '17%', perspective: '2200px', zIndex: 1 }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            transition: 'transform 1.5s cubic-bezier(.62,.02,.34,1)',
            transform: `rotateY(${i * 180}deg)`,
          }}
        >
          {renderFace(front, false)}
          {renderFace(back, true)}
        </div>
      </div>

      <button aria-label="prev" onPointerDown={(e) => { e.stopPropagation(); setI((x) => x - 1) }} style={navBtnStyle('left')}>
        <Icon name="chevronLeft" size={44} />
      </button>
      <button aria-label="next" onPointerDown={(e) => { e.stopPropagation(); setI((x) => x + 1) }} style={navBtnStyle('right')}>
        <Icon name="chevronRight" size={44} />
      </button>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: '7%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, zIndex: 5 }}>
        {/* endless auto-advance progress — never reveals a total count */}
        <div style={{ width: '92%', height: 4, borderRadius: 999, background: 'color-mix(in srgb, var(--c-ink) 16%, transparent)', overflow: 'hidden' }}>
          <div key={i} style={{ width: '100%', height: '100%', background: 'var(--c-primary)', borderRadius: 999, transformOrigin: 'left', animation: `attractProgress ${ADVANCE_MS}ms linear forwards` }} />
        </div>
        <div
          data-loop="1"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            border: '1.5px solid color-mix(in srgb, var(--c-ink) 50%, transparent)',
            borderRadius: 999,
            padding: '14px 26px',
            fontSize: 'var(--t-base)',
            fontWeight: 600,
            animation: 'glowpulse 2s ease-in-out infinite',
          }}
        >
          <Icon name="play" size={16} /> {ui.kioskTouchStart}
        </div>
      </div>
    </div>
  )
}
