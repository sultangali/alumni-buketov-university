import type { ReactNode } from 'react'
import { Icon, type IconName } from '../components/icons'
import { useApp } from '../AppContext'
import { facAlumni, fac, gallery } from '../lib/logic'

export function Faculty({ facId }: { facId: string }) {
  const { ui, L, go } = useApp()
  const f = fac(facId)
  if (!f) return null

  const tiles = gallery(L, 2)
  const all = facAlumni(f.id)

  return (
    <div style={{ animation: 'fadeUp .45s ease' }}>
      <div
        style={{
          position: 'relative',
          minHeight: 220,
          background: f.grad,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          padding: 'var(--pad)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 78% 12%, rgba(255,255,255,.28), transparent 52%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 18,
            left: 'var(--pad)',
            fontFamily: 'Lora, serif',
            fontWeight: 700,
            fontSize: 96,
            color: 'rgba(255,255,255,.16)',
          }}
        >
          {f.abbr}
        </div>
        <div style={{ position: 'relative', color: '#fff' }}>
          <div
            style={{
              fontSize: 'var(--t-xs)',
              fontWeight: 700,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              opacity: 0.85,
              marginBottom: 8,
            }}
          >
            {ui.faculties} · {ui.est} {f.est}
          </div>
          <h1
            style={{
              fontFamily: 'Lora, serif',
              fontWeight: 700,
              fontSize: 'var(--t-2xl)',
              margin: 0,
              lineHeight: 1.08,
              maxWidth: 720,
              textWrap: 'balance',
            }}
          >
            {L(f.name)}
          </h1>
        </div>
      </div>

      <div style={{ padding: '22px var(--pad) 0', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Stat
          value={String(all.length)}
          label={ui.alumni}
          onClick={() => go({ name: 'facAlumni', fac: f.id })}
        />
      </div>

      <div style={{ padding: '22px var(--pad) 0' }}>
        <H2 mb={10}>{ui.history}</H2>
        <p
          style={{
            color: 'var(--c-ink2)',
            fontSize: 'var(--t-base)',
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 760,
            textWrap: 'pretty',
          }}
        >
          {L(f.hist)}
        </p>
      </div>

      <div style={{ padding: '26px var(--pad) 34px' }}>
        <H2>{ui.gallery}</H2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 10,
          }}
        >
          {tiles.map((g, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                aspectRatio: '4 / 3',
                borderRadius: 'var(--r)',
                overflow: 'hidden',
                background: g.grad,
                cursor: 'pointer',
                border: 'var(--bw) solid var(--c-line)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,.85)',
                }}
              >
                <Icon name={g.icon as IconName} size={22} />
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: '8px 10px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,.55))',
                  color: '#fff',
                  fontSize: 'var(--t-2xs)',
                  fontWeight: 600,
                }}
              >
                {g.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label, onClick }: { value: string; label: string; onClick?: () => void }) {
  const inner = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            fontFamily: 'Lora, serif',
            fontWeight: 700,
            fontSize: 'var(--t-xl)',
            color: 'var(--c-primary)',
          }}
        >
          {value}
        </div>
        {onClick && (
          <span style={{ color: 'var(--c-primary)', fontSize: 'var(--t-base)', fontWeight: 700 }}>
            →
          </span>
        )}
      </div>
      <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-xs)', fontWeight: 600 }}>{label}</div>
    </>
  )

  if (onClick) {
    return (
      <button
        className="lift"
        onClick={onClick}
        style={{
          flex: 1,
          minWidth: 130,
          background: 'var(--c-surface)',
          border: 'var(--bw) solid var(--c-line)',
          borderRadius: 'var(--r)',
          padding: '14px 18px',
          boxShadow: 'var(--shadow)',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          fontFamily: 'inherit',
        }}
      >
        {inner}
      </button>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        minWidth: 130,
        background: 'var(--c-surface)',
        border: 'var(--bw) solid var(--c-line)',
        borderRadius: 'var(--r)',
        padding: '14px 18px',
        boxShadow: 'var(--shadow)',
      }}
    >
      {inner}
    </div>
  )
}

function H2({ children, mb = 12 }: { children: ReactNode; mb?: number }) {
  return (
    <h2
      style={{
        fontFamily: 'Lora, serif',
        fontWeight: 700,
        color: 'var(--c-ink)',
        fontSize: 'var(--t-lg)',
        margin: `0 0 ${mb}px`,
      }}
    >
      {children}
    </h2>
  )
}
