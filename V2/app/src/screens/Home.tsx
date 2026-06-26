import { useState, type CSSProperties } from 'react'
import { useApp } from '../AppContext'
import { FAC } from '../data/records'
import { cardGrad, fac, facAlumniCount, featList, initials, nf } from '../lib/logic'
import type { Loc, Route } from '../types'
import { Icon, type IconName } from '../components/icons'

export function Home() {
  const { narrow, ui, lang, L, go, featIdx, setFeatIdx } = useApp()
  const [facQuery, setFacQuery] = useState('')
  const fq = facQuery.trim().toLowerCase()
  const facList = fq ? FAC.filter((f) => L(f.name).toLowerCase().includes(fq) || f.abbr.toLowerCase().includes(fq)) : FAC

  const feats = featList()
  const fi = feats.length ? featIdx % feats.length : 0
  const fa = feats[fi]
  const f = fac(fa.fac)

  const feat = {
    initials: initials(fa.name),
    grad: cardGrad(fa.accent),
    name: L(fa.name),
    position: L(fa.pos),
    video: fa.video,
    yearLabel:
      (lang === 'en' ? 'Class of ' : lang === 'kz' ? '' : 'Выпуск ') +
      fa.year +
      (lang === 'kz' ? ' жылғы түлек' : ''),
    facLine: (f ? L(f.name) : '') + ' · ' + L(fa.spec),
  }

  const categories: {
    route: Route
    icon: IconName
    grad: string
    title: string
    sub: string
  }[] = [
    { route: { name: 'teachers' }, icon: 'cap', grad: 'linear-gradient(160deg,#3E7FC0,#1B5AA6)', title: ui.catTeachers, sub: ui.catTeachersSub },
    { route: { name: 'laureates' }, icon: 'trophy', grad: 'linear-gradient(160deg,#B79347,#7E6422)', title: ui.catLaureates, sub: ui.catLaureatesSub },
    { route: { name: 'veterans' }, icon: 'medal', grad: 'linear-gradient(160deg,#3F9AC4,#1E5A7E)', title: ui.catVeterans, sub: ui.catVeteransSub },
    { route: { name: 'apply' }, icon: 'plus', grad: 'linear-gradient(160deg,#6E78C0,#3A4690)', title: ui.catApply, sub: ui.catApplySub },
  ]

  const totalAlumni = FAC.reduce((s, fc) => s + facAlumniCount(fc), 0)
  const stats: { value: string; label: Loc }[] = [
    { value: nf(totalAlumni) + '+', label: { ru: 'Выпускников в архиве', kz: 'Архивтегі түлектер', en: 'Graduates archived' } },
    { value: String(FAC.length), label: { ru: 'Факультетов', kz: 'Факультет', en: 'Faculties' } },
    { value: '1970', label: { ru: 'Архив ведётся с', kz: 'Архив басталуы', en: 'Archive since' } },
    { value: '4K', label: { ru: 'Мультимедиа качество', kz: 'Мультимедиа сапасы', en: 'Multimedia quality' } },
  ]

  const spotlightStyle: CSSProperties = {
    display: 'flex',
    flexDirection: narrow ? 'column' : 'row',
    gap: narrow ? 16 : 26,
    background: 'var(--c-surface)',
    border: 'var(--bw) solid var(--c-line)',
    borderRadius: 'var(--r-lg)',
    padding: narrow ? 16 : 22,
    boxShadow: 'var(--shadow)',
  }
  const spotPortraitStyle: CSSProperties = {
    position: 'relative',
    width: narrow ? '100%' : 260,
    height: narrow ? 240 : 300,
    flex: '0 0 auto',
    borderRadius: 'var(--r)',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div style={{ animation: 'fadeIn .5s ease', paddingBottom: 28 }}>
      {/* hero */}
      <div style={{ position: 'relative', padding: 'var(--pad)', paddingTop: 22, overflow: 'hidden' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 13px',
            borderRadius: 'var(--r)',
            background: 'color-mix(in srgb, var(--c-gold) 14%, transparent)',
            border: 'var(--bw) solid color-mix(in srgb, var(--c-gold) 40%, transparent)',
            color: 'var(--c-gold)',
            fontWeight: 600,
            fontSize: 'var(--t-xs)',
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            marginBottom: 18,
          }}
        >
          ✦ {ui.goldFund}
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: 'var(--c-ink)',
            fontSize: 'var(--t-3xl)',
            lineHeight: 1.05,
            margin: '0 0 12px',
            letterSpacing: '-.02em',
            textWrap: 'balance',
          }}
        >
          {ui.heroTitle}
        </h1>
        <p
          style={{
            color: 'var(--c-ink2)',
            fontSize: 'var(--t-md)',
            lineHeight: 1.55,
            margin: 0,
            maxWidth: 640,
            textWrap: 'pretty',
          }}
        >
          {ui.heroSub}
        </p>

        <div
          className="stagger"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 'var(--gap-card)',
            marginTop: 26,
          }}
        >
          {stats.map((s, i) => (
            <div
              key={i}
              className="top-rule bd2"
              style={{
                background: 'var(--c-surface)',
                border: 'var(--bw) solid var(--c-line)',
                borderRadius: 'var(--r)',
                padding: '16px 18px',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  color: 'var(--c-primary)',
                  fontSize: 'var(--t-2xl)',
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  color: 'var(--c-ink2)',
                  fontSize: 'var(--t-xs)',
                  fontWeight: 600,
                  marginTop: 6,
                }}
              >
                {L(s.label)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* featured spotlight */}
      <div style={{ padding: '8px var(--pad) 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--c-ink)',
              fontSize: 'var(--t-xl)',
              margin: 0,
            }}
          >
            {ui.hallOfFame}
          </h2>
          <div style={{ fontSize: 'var(--t-xs)', color: 'var(--c-ink2)', fontWeight: 600 }}>
            {ui.featuredHint}
          </div>
        </div>

        <div className="top-rule bd2" style={spotlightStyle}>
          {/* portrait */}
          <div style={spotPortraitStyle}>
            <div style={{ position: 'absolute', inset: 0, background: feat.grad }} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'radial-gradient(circle at 30% 20%, rgba(255,255,255,.22), transparent 55%)',
                mixBlendMode: 'screen',
              }}
            />
            <div
              style={{
                position: 'relative',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'rgba(255,255,255,.95)',
                fontSize: 92,
                textShadow: '0 6px 30px rgba(0,0,0,.3)',
              }}
            >
              {feat.initials}
            </div>
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 11px',
                borderRadius: 'var(--r)',
                background: 'rgba(0,0,0,.34)',
                backdropFilter: 'blur(6px)',
                color: '#fff',
                fontSize: 'var(--t-2xs)',
                fontWeight: 700,
              }}
            >
              ✦ {feat.yearLabel}
            </div>
            {feat.video && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 14,
                  right: 14,
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,.4)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  border: '1.5px solid rgba(255,255,255,.5)',
                }}
              >
                <Icon name="play" size={16} />
              </div>
            )}
          </div>

          {/* info */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: 4,
            }}
          >
            <div
              style={{
                fontSize: 'var(--t-xs)',
                fontWeight: 700,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'var(--c-gold)',
                marginBottom: 8,
              }}
            >
              {ui.distinguished}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--c-ink)',
                fontSize: 'var(--t-2xl)',
                lineHeight: 1.08,
                marginBottom: 8,
              }}
            >
              {feat.name}
            </div>
            <div
              style={{
                color: 'var(--c-ink2)',
                fontSize: 'var(--t-base)',
                lineHeight: 1.5,
                marginBottom: 6,
              }}
            >
              {feat.position}
            </div>
            <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-sm)', marginBottom: 16 }}>
              {feat.facLine}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => go({ name: 'alumni', id: fa.id })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--c-accent)',
                  color: 'var(--c-on-accent)',
                  border: 'none',
                  borderRadius: 'var(--r)',
                  padding: '12px 22px',
                  fontSize: 'var(--t-sm)',
                  fontWeight: 600,
                  letterSpacing: '.01em',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {ui.viewProfile} →
              </button>
            </div>
            {/* thumb rail */}
            <div style={{ display: 'flex', gap: 9, marginTop: 20 }}>
              {feats.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => setFeatIdx(i)}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 'var(--r)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 14,
                    color: '#fff',
                    border: i === fi ? '2px solid var(--c-gold)' : '2px solid transparent',
                    background: cardGrad(a.accent),
                    transform: i === fi ? 'scale(1.08)' : 'scale(1)',
                    transition: 'all .2s ease',
                    boxShadow: i === fi ? '0 6px 16px -6px var(--c-gold)' : 'none',
                  }}
                >
                  {initials(a.name)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* categories — shown first */}
      <div style={{ padding: '30px var(--pad) 0' }}>
        <div style={{ marginBottom: 14 }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--c-ink)',
              fontSize: 'var(--t-xl)',
              margin: '0 0 4px',
            }}
          >
            {ui.categories}
          </h2>
          <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-sm)', fontWeight: 600 }}>
            {ui.categoriesSub}
          </div>
        </div>
        <div
          className="stagger"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--gap-card)',
          }}
        >
          {categories.map((c, i) => (
            <button
              key={i}
              className="lift top-rule bd2"
              onClick={() => go(c.route)}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                background: 'var(--c-surface)',
                border: 'var(--bw) solid var(--c-line)',
                borderRadius: 'var(--r)',
                padding: 18,
                boxShadow: 'var(--shadow)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                fontFamily: 'var(--font-ui)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--r)',
                    background: c.grad,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <Icon name={c.icon} size={22} />
                </div>
                <span style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-xl)', opacity: 0.4 }}>→</span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  color: 'var(--c-ink)',
                  fontSize: 'var(--t-base)',
                  lineHeight: 1.25,
                }}
              >
                {c.title}
              </div>
              <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-xs)', fontWeight: 600, lineHeight: 1.4 }}>
                {c.sub}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* explore faculties — shown after categories, with a quick filter */}
      <div style={{ padding: '30px var(--pad) 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--c-ink)',
              fontSize: 'var(--t-xl)',
              margin: 0,
            }}
          >
            {ui.exploreFaculties}
          </h2>
          <input
            value={facQuery}
            onChange={(e) => setFacQuery(e.target.value)}
            placeholder={ui.facFilterPh}
            aria-label={ui.facFilterPh}
            style={{
              background: 'var(--c-bg2)',
              border: 'var(--bw) solid var(--c-line)',
              borderRadius: 'var(--r)',
              padding: '9px 14px',
              fontSize: 'var(--t-sm)',
              color: 'var(--c-ink)',
              fontFamily: 'var(--font-ui)',
              outline: 'none',
              minWidth: 200,
              flex: narrow ? '1 1 100%' : '0 1 280px',
            }}
          />
        </div>
        {facList.length === 0 ? (
          <div style={{ padding: '24px 0', color: 'var(--c-ink2)', fontSize: 'var(--t-base)' }}>
            {ui.noResults}
          </div>
        ) : (
          <div
            className="stagger"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--gap-card)',
            }}
          >
            {facList.map((fc) => (
              <button
                key={fc.id}
                className="lift top-rule bd2"
                onClick={() => go({ name: 'faculty', fac: fc.id })}
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: 'var(--c-surface)',
                  border: 'var(--bw) solid var(--c-line)',
                  borderRadius: 'var(--r)',
                  padding: 18,
                  boxShadow: 'var(--shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--r)',
                      background: fc.grad,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: 18,
                    }}
                  >
                    {fc.abbr}
                  </div>
                  <span style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-xl)', opacity: 0.4 }}>→</span>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    color: 'var(--c-ink)',
                    fontSize: 'var(--t-base)',
                    lineHeight: 1.25,
                  }}
                >
                  {L(fc.name)}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 14,
                    color: 'var(--c-ink2)',
                    fontSize: 'var(--t-xs)',
                    fontWeight: 600,
                  }}
                >
                  <span>
                    {ui.est} {fc.est}
                  </span>
                  <span>
                    {nf(facAlumniCount(fc))} · {ui.alumni}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
