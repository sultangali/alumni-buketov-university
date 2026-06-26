import { useApp } from '../AppContext'
import { FAC } from '../data/records'
import { facAlumniCount, nf } from '../lib/logic'

const tag = {
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  gap: 6,
  background: 'var(--c-bg2)',
  border: 'var(--bw) solid var(--c-line)',
  borderRadius: 999,
  padding: '5px 11px',
  fontSize: 'var(--t-xs)',
  fontWeight: 600,
  color: 'var(--c-ink2)',
}

export function Faculties() {
  const { ui, L, go } = useApp()

  return (
    <div style={{ animation: 'fadeUp .45s ease', padding: '22px var(--pad) 32px' }}>
      <h1
        style={{
          fontFamily: 'Lora, serif',
          fontWeight: 700,
          color: 'var(--c-ink)',
          fontSize: 'var(--t-2xl)',
          margin: '0 0 6px',
        }}
      >
        {ui.facultiesTitle}
      </h1>
      <p style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-base)', margin: '0 0 24px' }}>
        {ui.facultiesSub}
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--gap-card)',
        }}
      >
        {FAC.map((f) => (
          <button
            key={f.id}
            className="lift-lg"
            onClick={() => go({ name: 'faculty', fac: f.id })}
            style={{
              textAlign: 'left',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              border: 'var(--bw) solid var(--c-line)',
              borderRadius: 'var(--r-lg)',
              padding: 0,
              boxShadow: 'var(--shadow)',
              fontFamily: 'Manrope, sans-serif',
              background: 'var(--c-surface)',
            }}
          >
            <div
              style={{
                height: 96,
                background: f.grad,
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                padding: 14,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage:
                    'radial-gradient(circle at 80% 0%, rgba(255,255,255,.25), transparent 50%)',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  fontFamily: 'Lora, serif',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,.96)',
                  fontSize: 30,
                }}
              >
                {f.abbr}
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 14,
                  color: 'rgba(255,255,255,.85)',
                  fontSize: 'var(--t-xs)',
                  fontWeight: 700,
                }}
              >
                {ui.est} {f.est}
              </div>
            </div>
            <div style={{ padding: '16px 18px 18px' }}>
              <div
                style={{
                  fontFamily: 'Lora, serif',
                  fontWeight: 600,
                  color: 'var(--c-ink)',
                  fontSize: 'var(--t-lg)',
                  lineHeight: 1.2,
                  marginBottom: 12,
                }}
              >
                {L(f.name)}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={tag}>
                  {ui.est} {f.est}
                </span>
                <span style={tag}>
                  {nf(facAlumniCount(f))} {ui.alumni}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
