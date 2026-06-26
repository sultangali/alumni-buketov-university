import type { CSSProperties } from 'react'
import { useApp } from '../AppContext'
import { AUDIT, FAC, MODS } from '../data/records'
import { fac, facAlumniCount, nf, ptab, statusMeta, tagMeta } from '../lib/logic'
import type { Loc } from '../types'
import { Icon } from '../components/icons'

export function Admin() {
  const { narrow, ui, L, go, adminTab, setAdminTab } = useApp()

  const totalA = FAC.reduce((s, f) => s + facAlumniCount(f), 0)
  const maxF = Math.max(...FAC.map((f) => facAlumniCount(f)))

  const cardDefs: { v: string; l: Loc; c: string }[] = [
    { v: nf(totalA), l: { ru: 'Всего записей', kz: 'Барлық жазба', en: 'Total records' }, c: '#1B5AA6' },
    { v: '2 184', l: { ru: 'Опубликовано', kz: 'Жарияланған', en: 'Published' }, c: '#1E5FA8' },
    { v: '37', l: { ru: 'На проверке', kz: 'Тексеруде', en: 'In review' }, c: '#9A6B16' },
    { v: String(MODS.length), l: { ru: 'Модераторов', kz: 'Модератор', en: 'Moderators' }, c: '#2E7AB0' },
  ]
  const cards = cardDefs.map((c) => ({ v: c.v, l: L(c.l), c: c.c }))

  const bars = FAC.map((f) => {
    const n = facAlumniCount(f)
    return {
      name: L(f.name),
      n: nf(n),
      barStyle: {
        height: 10,
        borderRadius: 'var(--r)',
        background: f.grad,
        width: `${Math.round((n / maxF) * 100)}%`,
        transition: 'width .6s ease',
      } as CSSProperties,
    }
  })

  const audit = AUDIT.map((e) => {
    const dot: CSSProperties = {
      width: 8,
      height: 8,
      borderRadius: '50%',
      flex: '0 0 auto',
      background: tagMeta(e.tag),
    }
    return {
      who: e.who,
      act: L(e.act),
      obj: e.obj,
      t: e.t,
      dot,
      dotTop: { ...dot, marginTop: 6 } as CSSProperties,
    }
  })

  const mods = MODS.map((m) => {
    const sm = statusMeta(L, m.status)
    const f = fac(m.fac)
    return {
      login: m.login,
      scope: L(m.scope),
      faculty: f ? L(f.name) : '',
      records: nf(m.records),
      statusLabel: sm.label,
      statusStyle: sm.style,
    }
  })

  const tabs = [
    ['overview', 'tabOverview'],
    ['audit', 'tabAudit'],
    ['mods', 'tabModerators'],
  ] as const

  const adminGridCols = narrow ? '1fr' : '1.1fr 1fr'
  const auditCols = '1.2fr 1.4fr 1.3fr 1fr'

  const h3: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    color: 'var(--c-ink)',
    fontSize: 'var(--t-md)',
    margin: '0 0 16px',
  }

  return (
    <div style={{ animation: 'fadeUp .4s ease', padding: '22px var(--pad) 36px' }}>
      {/* staff bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
          background: 'var(--c-surface)',
          border: 'var(--bw) solid var(--c-line)',
          borderRadius: 'var(--r-lg)',
          padding: '16px 20px',
          boxShadow: 'var(--shadow)',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--r)',
              background: 'linear-gradient(140deg, #9A6B16, #7E6422)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 22,
              flex: '0 0 auto',
            }}
          >
            <Icon name="gear" size={24} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--c-ink)',
                fontSize: 'var(--t-md)',
              }}
            >
              {ui.adminMode}
            </div>
            <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-xs)', fontWeight: 600 }}>
              {ui.roleAdmin}
            </div>
          </div>
        </div>
        <button
          onClick={() => go({ name: 'mod' })}
          style={{
            background: 'var(--c-bg2)',
            border: 'var(--bw) solid var(--c-line)',
            color: 'var(--c-ink)',
            borderRadius: 'var(--r)',
            padding: '9px 16px',
            fontSize: 'var(--t-xs)',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          ← {ui.switchToMod}
        </button>
      </div>

      {/* tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: 'var(--c-bg2)',
          border: 'var(--bw) solid var(--c-line)',
          borderRadius: 'var(--r)',
          padding: 5,
          marginBottom: 22,
          width: 'fit-content',
          maxWidth: '100%',
          overflowX: 'auto',
        }}
      >
        {tabs.map(([k, key]) => (
          <button key={k} onClick={() => setAdminTab(k)} style={ptab(adminTab === k)}>
            {ui[key]}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {adminTab === 'overview' && (
        <>
          <div
            className="stagger"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 'var(--gap-card)',
              marginBottom: 26,
            }}
          >
            {cards.map((c, i) => (
              <div
                key={i}
                className="bd2"
                style={{
                  background: 'var(--c-surface)',
                  border: 'var(--bw) solid var(--c-line)',
                  borderRadius: 'var(--r)',
                  padding: 18,
                  boxShadow: 'var(--shadow)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: 'var(--rule)',
                    background: c.c,
                  }}
                />
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    color: 'var(--c-ink)',
                    fontSize: 'var(--t-2xl)',
                    lineHeight: 1,
                  }}
                >
                  {c.v}
                </div>
                <div
                  style={{
                    color: 'var(--c-ink2)',
                    fontSize: 'var(--t-xs)',
                    fontWeight: 600,
                    marginTop: 8,
                  }}
                >
                  {c.l}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: adminGridCols, gap: 'var(--gap-card)' }}>
            <div
              style={{
                background: 'var(--c-surface)',
                border: 'var(--bw) solid var(--c-line)',
                borderRadius: 'var(--r-lg)',
                padding: 20,
                boxShadow: 'var(--shadow)',
              }}
            >
              <h3 style={h3}>{ui.alumniPerFaculty}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {bars.map((b, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span
                        style={{
                          color: 'var(--c-ink)',
                          fontSize: 'var(--t-xs)',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '75%',
                        }}
                      >
                        {b.name}
                      </span>
                      <span style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-xs)', fontWeight: 700 }}>
                        {b.n}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 10,
                        background: 'var(--c-bg2)',
                        borderRadius: 'var(--r)',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={b.barStyle} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                background: 'var(--c-surface)',
                border: 'var(--bw) solid var(--c-line)',
                borderRadius: 'var(--r-lg)',
                padding: 20,
                boxShadow: 'var(--shadow)',
              }}
            >
              <h3 style={h3}>{ui.recentActivity}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {audit.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                    <div style={e.dotTop} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: 'var(--c-ink)', fontSize: 'var(--t-sm)' }}>
                        <span style={{ fontWeight: 700 }}>{e.who}</span> · {e.act}
                      </div>
                      <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-2xs)', marginTop: 2 }}>
                        {e.obj} — {e.t}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* AUDIT */}
      {adminTab === 'audit' && (
        <div
          style={{
            background: 'var(--c-surface)',
            border: 'var(--bw) solid var(--c-line)',
            borderRadius: 'var(--r-lg)',
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: auditCols,
              gap: 12,
              padding: '14px 18px',
              background: 'var(--c-bg2)',
              borderBottom: 'var(--bw) solid var(--c-line)',
              fontSize: 'var(--t-2xs)',
              fontWeight: 700,
              letterSpacing: '.05em',
              textTransform: 'uppercase',
              color: 'var(--c-ink2)',
            }}
          >
            <span>{ui.colUser}</span>
            <span>{ui.colAction}</span>
            <span>{ui.colObject}</span>
            <span>{ui.colTime}</span>
          </div>
          {audit.map((e, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: auditCols,
                gap: 12,
                padding: '14px 18px',
                borderBottom: 'var(--bw) solid var(--c-line)',
                alignItems: 'center',
                fontSize: 'var(--t-sm)',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  color: 'var(--c-ink)',
                  fontWeight: 700,
                  minWidth: 0,
                }}
              >
                <span style={e.dot} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.who}
                </span>
              </span>
              <span style={{ color: 'var(--c-ink2)' }}>{e.act}</span>
              <span
                style={{
                  color: 'var(--c-ink)',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {e.obj}
              </span>
              <span style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-xs)' }}>{e.t}</span>
            </div>
          ))}
        </div>
      )}

      {/* MODERATORS */}
      {adminTab === 'mods' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mods.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'var(--c-surface)',
                border: 'var(--bw) solid var(--c-line)',
                borderRadius: 'var(--r)',
                padding: '15px 18px',
                boxShadow: 'var(--shadow)',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 'var(--r)',
                  background: 'var(--c-bg2)',
                  border: 'var(--bw) solid var(--c-line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--c-primary)',
                  flex: '0 0 auto',
                }}
              >
                <Icon name="person" size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    color: 'var(--c-ink)',
                    fontSize: 'var(--t-base)',
                  }}
                >
                  {m.login}
                </div>
                <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-xs)' }}>
                  {m.faculty} · {m.scope}
                </div>
              </div>
              <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                <div style={{ color: 'var(--c-ink)', fontWeight: 700, fontSize: 'var(--t-base)' }}>
                  {m.records}
                </div>
                <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-2xs)', fontWeight: 600 }}>
                  {ui.colRecords}
                </div>
              </div>
              <span style={m.statusStyle}>{m.statusLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
