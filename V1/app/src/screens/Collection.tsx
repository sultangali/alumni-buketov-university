import { useState } from 'react'
import { Icon, type IconName } from '../components/icons'
import { useApp } from '../AppContext'
import { FAC } from '../data/records'
import { cardGrad, chipStyle, collectionPeople, initials } from '../lib/logic'
import type { CollectionKind, Loc, Person } from '../types'

const HERO_GRAD: Record<CollectionKind, string> = {
  teachers: 'linear-gradient(140deg,#3a7bd5,#1E50A0)',
  laureates: 'linear-gradient(140deg,#cba24f,#9c7424)',
  veterans: 'linear-gradient(140deg,#8a6fd6,#5b3fb0)',
}
const HERO_ICON: Record<CollectionKind, IconName> = {
  teachers: 'cap',
  laureates: 'trophy',
  veterans: 'medal',
}

function typeLabel(kind: CollectionKind, p: Person, ui: Record<string, string>): string | null {
  if (kind !== 'laureates') return null
  return p.tag === 'prize' ? ui.typePrize : ui.typeScholarship
}

export function Collection({ kind }: { kind: CollectionKind }) {
  const { ui, L, go } = useApp()
  const [facFilter, setFacFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const all = collectionPeople(kind)
  const title = kind === 'teachers' ? ui.teachersTitle : kind === 'laureates' ? ui.laureatesTitle : ui.veteransTitle
  const sub = kind === 'teachers' ? ui.teachersSub : kind === 'laureates' ? ui.laureatesSub : ui.veteransSub
  // Full faculty list available as filter options (not only faculties with people).
  const facsPresent = FAC

  const list = all.filter(
    (p) =>
      (facFilter === 'all' || p.fac === facFilter) &&
      (kind !== 'laureates' || typeFilter === 'all' || p.tag === typeFilter),
  )

  const allLabel: Loc = { ru: ui.filterAll, kz: ui.filterAll, en: ui.filterAll }

  return (
    <div style={{ animation: 'fadeUp .45s ease' }}>
      {/* hero */}
      <div
        style={{
          position: 'relative',
          minHeight: 168,
          background: HERO_GRAD[kind],
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
              'radial-gradient(circle at 80% 12%, rgba(255,255,255,.26), transparent 52%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 'var(--pad)',
            opacity: 0.22,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={HERO_ICON[kind]} size={70} />
        </div>
        <div style={{ position: 'relative', color: '#fff' }}>
          <div
            style={{
              fontSize: 'var(--t-xs)',
              fontWeight: 700,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              opacity: 0.85,
              marginBottom: 8,
            }}
          >
            {ui.categories} · {list.length} {ui.profilesWord}
          </div>
          <h1
            style={{
              fontFamily: 'Lora, serif',
              fontWeight: 700,
              fontSize: 'var(--t-2xl)',
              margin: 0,
              lineHeight: 1.08,
              maxWidth: 760,
              textWrap: 'balance',
            }}
          >
            {title}
          </h1>
        </div>
      </div>

      <div style={{ padding: '18px var(--pad) 0' }}>
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
          {sub}
        </p>
      </div>

      {/* filters */}
      <div style={{ padding: '18px var(--pad) 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setFacFilter('all')} style={chipStyle(facFilter === 'all')}>
            {L(allLabel)}
          </button>
          {facsPresent.map((f) => (
            <button key={f.id} onClick={() => setFacFilter(f.id)} style={chipStyle(facFilter === f.id)}>
              {f.abbr}
            </button>
          ))}
        </div>
        {kind === 'laureates' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setTypeFilter('all')} style={chipStyle(typeFilter === 'all')}>
              {L(allLabel)}
            </button>
            <button onClick={() => setTypeFilter('scholarship')} style={chipStyle(typeFilter === 'scholarship')}>
              {ui.typeScholarship}
            </button>
            <button onClick={() => setTypeFilter('prize')} style={chipStyle(typeFilter === 'prize')}>
              {ui.typePrize}
            </button>
          </div>
        )}
      </div>

      {/* grid */}
      <div style={{ padding: '20px var(--pad) 36px' }}>
        {list.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-ink2)', fontSize: 'var(--t-base)' }}>
            {ui.noResults}
          </div>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 'var(--gap-card)',
          }}
        >
          {list.map((p) => {
            const badge = p.badge ? L(p.badge) : typeLabel(kind, p, ui)
            return (
              <button
                key={p.id}
                className="lift-card"
                onClick={() => go({ name: 'alumni', id: p.id })}
                style={{
                  position: 'relative',
                  aspectRatio: '3 / 4',
                  width: '100%',
                  border: 'var(--bw) solid var(--c-line)',
                  borderRadius: 'var(--r)',
                  overflow: 'hidden',
                  background: cardGrad(p.accent),
                  boxShadow: 'var(--shadow)',
                  cursor: 'pointer',
                  padding: 0,
                  textAlign: 'left',
                  display: 'block',
                  fontFamily: 'Manrope, sans-serif',
                }}
              >
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'Lora, serif', fontWeight: 700, fontSize: 72, color: 'rgba(255,255,255,.20)', lineHeight: 1 }}>{initials(p.name)}</span>
                </div>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,.16), transparent 55%)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 38%, rgba(8,14,26,.5) 66%, rgba(8,14,26,.94))' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 13, color: '#fff', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--c-gold)', fontSize: 'var(--t-xs)', fontWeight: 700, marginBottom: 3 }}>{badge}</div>
                    <div style={{ fontFamily: 'Lora, serif', fontWeight: 700, fontSize: 'var(--t-base)', lineHeight: 1.15, marginBottom: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{L(p.name)}</div>
                    <div style={{ color: 'rgba(255,255,255,.82)', fontSize: 'var(--t-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{L(p.pos)}</div>
                  </div>
                  <span aria-hidden="true" style={{ flex: '0 0 auto', width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>→</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
