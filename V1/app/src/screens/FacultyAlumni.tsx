import { useApp } from '../AppContext'
import { facAlumni, fac, cardGrad, initials, chipStyle } from '../lib/logic'
import type { Loc } from '../types'
import { Icon } from '../components/icons'

export function FacultyAlumni({ facId }: { facId: string }) {
  const { ui, L, go, listYear, setListYear, listQuery, setListQuery } = useApp()
  const f = fac(facId)
  if (!f) return null

  const all = facAlumni(f.id)
  const years = [...new Set(all.map((a) => a.year))].sort((x, y) => y - x)
  const q = listQuery.trim().toLowerCase()
  const list = all.filter(
    (a) =>
      (listYear === 'all' || a.year === listYear) &&
      (!q || (L(a.name) + L(a.pos)).toLowerCase().includes(q)),
  )
  const allYears: Loc = { ru: 'Все годы', kz: 'Барлығы', en: 'All years' }

  return (
    <div style={{ animation: 'fadeUp .45s ease', padding: '24px var(--pad) 36px' }}>
      <div
        style={{
          fontSize: 'var(--t-xs)',
          fontWeight: 700,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: 'var(--c-ink2)',
          marginBottom: 6,
        }}
      >
        {L(f.name).toUpperCase()}
      </div>
      <h1
        style={{
          fontFamily: 'Lora, serif',
          fontWeight: 700,
          fontSize: 'var(--t-2xl)',
          color: 'var(--c-ink)',
          margin: '0 0 20px',
          lineHeight: 1.08,
        }}
      >
        {ui.alumniCap}
      </h1>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <input
          value={listQuery}
          onChange={(e) => setListQuery(e.target.value)}
          placeholder={ui.searchPh}
          style={{
            background: 'var(--c-bg2)',
            border: 'var(--bw) solid var(--c-line)',
            borderRadius: 999,
            padding: '9px 16px',
            fontSize: 'var(--t-sm)',
            color: 'var(--c-ink)',
            fontFamily: 'Manrope, sans-serif',
            outline: 'none',
            minWidth: 180,
            flex: 1,
            maxWidth: 360,
          }}
        />
      </div>

      {years.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <button onClick={() => setListYear('all')} style={chipStyle(listYear === 'all')}>
            {L(allYears)}
          </button>
          {years.map((y) => (
            <button key={y} onClick={() => setListYear(y)} style={chipStyle(listYear === y)}>
              {y}
            </button>
          ))}
        </div>
      )}

      {list.length === 0 && (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--c-ink2)',
            fontSize: 'var(--t-base)',
          }}
        >
          {ui.noResults}
        </div>
      )}
      <div
        className="stagger"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 'var(--gap-card)',
        }}
      >
        {list.map((a) => (
          <button
            key={a.id}
            className="lift-card"
            onClick={() => go({ name: 'alumni', id: a.id })}
            style={{
              position: 'relative',
              aspectRatio: '3 / 4',
              width: '100%',
              border: 'var(--bw) solid var(--c-line)',
              borderRadius: 'var(--r)',
              overflow: 'hidden',
              background: cardGrad(a.accent),
              boxShadow: 'var(--shadow)',
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
              display: 'block',
              fontFamily: 'Manrope, sans-serif',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'Lora, serif', fontWeight: 700, fontSize: 72, color: 'rgba(255,255,255,.20)', lineHeight: 1 }}>{initials(a.name)}</span>
            </div>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,.16), transparent 55%)' }} />
            {a.video && (
              <div style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: 'var(--c-gold)', color: '#0a1830', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,.5)' }}>
                <Icon name="play" size={12} />
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 38%, rgba(8,14,26,.5) 66%, rgba(8,14,26,.94))' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 13, color: '#fff', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--c-gold)', fontSize: 'var(--t-xs)', fontWeight: 700, marginBottom: 3 }}>{a.year}</div>
                <div style={{ fontFamily: 'Lora, serif', fontWeight: 700, fontSize: 'var(--t-base)', lineHeight: 1.15, marginBottom: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{L(a.name)}</div>
                <div style={{ color: 'rgba(255,255,255,.82)', fontSize: 'var(--t-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{L(a.pos)}</div>
              </div>
              <span aria-hidden="true" style={{ flex: '0 0 auto', width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
