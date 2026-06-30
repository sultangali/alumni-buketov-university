import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { useApp } from '../AppContext'
import { ALU, FAC, LAUREATES, TEACHERS, VETERANS } from '../data/records'
import { fac, nf, ptab, statusMeta, tagMeta } from '../lib/logic'
import { Icon } from '../components/icons'
import { PieChart, type Slice } from '../components/Charts'

// Editorial slice palette (deep blues → muted gold), cycled for charts.
const PALETTE = ['#1B5AA6', '#2E7AB0', '#3F9AC4', '#6E78C0', '#B79347', '#7E6422', '#4E92D6', '#1E5A7E']

export function Admin() {
  const {
    narrow, ui, L, go, adminTab, setAdminTab, submissions, staff,
    moderators, refreshModerators, createModerator, updateModerator, deleteModerator,
  } = useApp()

  // Load the real moderator roster as soon as an admin is in.
  useEffect(() => {
    if (staff?.role === 'admin') refreshModerators()
  }, [staff, refreshModerators])

  // Real counts: how many alumni records actually exist, per faculty.
  const facAlu = (id: string) => ALU.filter((a) => a.fac === id).length
  const facLabel = (id: string) => {
    const f = fac(id)
    return f ? L(f.name) : id
  }
  const totalA = ALU.length
  const maxF = Math.max(1, ...FAC.map((f) => facAlu(f.id)))
  const profileCount = ALU.length + TEACHERS.length + LAUREATES.length + VETERANS.length

  // ---- real, derived overview cards ----
  const cards = [
    { v: nf(totalA), l: ui.cardAlumniTotal, c: '#1B5AA6' },
    { v: nf(profileCount), l: ui.cardProfiles, c: '#1E5FA8' },
    { v: String(submissions.filter((s) => s.status === 'review').length), l: ui.cardInReview, c: '#9A6B16' },
    { v: String(moderators.length), l: ui.cardModerators, c: '#2E7AB0' },
  ]

  // ---- pie: profiles by category (real counts) ----
  const categoryPie: Slice[] = [
    { label: ui.catAlumniShort, value: ALU.length, color: '#1B5AA6' },
    { label: ui.teachersTitle, value: TEACHERS.length, color: '#3F9AC4' },
    { label: ui.laureatesTitle, value: LAUREATES.length, color: '#B79347' },
    { label: ui.veteransTitle, value: VETERANS.length, color: '#6E78C0' },
  ]

  // ---- pie: alumni headcount by faculty (top 6 + "others", real counts) ----
  const facCounts = FAC.map((f) => ({ name: L(f.name), n: facAlu(f.id) }))
    .sort((a, b) => b.n - a.n)
  const topFac = facCounts.slice(0, 6)
  const restN = facCounts.slice(6).reduce((s, f) => s + f.n, 0)
  const facultyPie: Slice[] = [
    ...topFac.map((f, i) => ({ label: f.name, value: f.n, color: PALETTE[i % PALETTE.length] })),
    ...(restN > 0 ? [{ label: ui.othersLabel, value: restN, color: '#5B6159' }] : []),
  ]

  const bars = FAC.map((f) => {
    const n = facAlu(f.id)
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

  // Real audit: every alumnus record attributed to the moderator who created
  // it, newest first. Replaces the old fabricated activity log.
  const fmtWhen = (iso?: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  const audit = ALU.filter((a) => a.createdBy)
    .slice()
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .map((a) => {
      const dot: CSSProperties = {
        width: 8,
        height: 8,
        borderRadius: '50%',
        flex: '0 0 auto',
        background: tagMeta('publish'),
      }
      return {
        who: a.createdBy as string,
        act: `${ui.auditAddedAlumnus} · ${facLabel(a.fac)}`,
        obj: L(a.name),
        t: fmtWhen(a.createdAt),
        dot,
        dotTop: { ...dot, marginTop: 6 } as CSSProperties,
      }
    })

  // ---- moderator-management state ----
  const [nUser, setNUser] = useState('')
  const [nPass, setNPass] = useState('')
  const [nFac, setNFac] = useState(FAC[0].id)
  const [nTouched, setNTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const fbTimer = useRef<ReturnType<typeof setTimeout>>()
  const flash = (msg: string) => {
    setFeedback(msg)
    clearTimeout(fbTimer.current)
    fbTimer.current = setTimeout(() => setFeedback(''), 3500)
  }

  const submitCreate = async () => {
    if (!nUser.trim() || !nPass.trim()) {
      setNTouched(true)
      return
    }
    setBusy(true)
    const f = fac(nFac)
    const err = await createModerator({
      username: nUser.trim(),
      password: nPass.trim(),
      fac: nFac,
      scope: f ? (f.name as Record<string, string>) : undefined,
    })
    setBusy(false)
    if (err) {
      flash(err)
      return
    }
    setNUser('')
    setNPass('')
    setNTouched(false)
    flash(ui.modCreated)
  }

  const toggleStatus = async (id: string, status: 'active' | 'suspended') => {
    const err = await updateModerator(id, { status: status === 'active' ? 'suspended' : 'active' })
    flash(err || ui.modUpdated)
  }
  const changeFac = async (id: string, facId: string) => {
    const f = fac(facId)
    const err = await updateModerator(id, { fac: facId, scope: f ? (f.name as Record<string, string>) : undefined })
    flash(err || ui.modUpdated)
  }
  const resetPwd = async (id: string) => {
    const pwd = window.prompt(ui.modNewPwd)
    if (!pwd || !pwd.trim()) return
    const err = await updateModerator(id, { password: pwd.trim() })
    flash(err || ui.modUpdated)
  }
  const removeMod = async (id: string) => {
    if (!window.confirm(ui.modConfirmDelete)) return
    const err = await deleteModerator(id)
    flash(err || ui.modDeleted)
  }

  const mods = moderators.map((m) => {
    const sm = statusMeta(L, m.status)
    const f = fac(m.fac)
    return {
      id: m.id,
      login: m.username,
      fac: m.fac,
      scope: m.scope ? L(m.scope) : '',
      faculty: f ? L(f.name) : m.fac,
      records: nf(m.records),
      pending: m.pending,
      status: m.status,
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

      {/* feedback toast */}
      {feedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            background: 'rgba(43,182,115,.14)',
            color: '#1f8a5b',
            border: '1px solid rgba(43,182,115,.4)',
            borderRadius: 'var(--r)',
            padding: '11px 15px',
            marginBottom: 16,
            fontSize: 'var(--t-sm)',
            fontWeight: 700,
          }}
        >
          <Icon name="check" size={16} /> {feedback}
        </div>
      )}

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

          {/* pie charts — real distributions */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: narrow ? '1fr' : '1fr 1fr',
              gap: 'var(--gap-card)',
              marginBottom: 26,
            }}
          >
            <div
              style={{
                background: 'var(--c-surface)',
                border: 'var(--bw) solid var(--c-line)',
                borderRadius: 'var(--r-lg)',
                padding: 20,
                boxShadow: 'var(--shadow)',
              }}
            >
              <h3 style={h3}>{ui.chartByCategory}</h3>
              <PieChart data={categoryPie} centerLabel={nf(profileCount)} centerSub={ui.cardProfiles} />
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
              <h3 style={h3}>{ui.chartByFaculty}</h3>
              <PieChart data={facultyPie} centerLabel={nf(totalA)} centerSub={ui.cardAlumniTotal} />
            </div>
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
                {audit.length === 0 && (
                  <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-sm)' }}>{ui.auditEmpty}</div>
                )}
                {audit.slice(0, 8).map((e, i) => (
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
          {audit.length === 0 && (
            <div style={{ padding: '28px 18px', color: 'var(--c-ink2)', fontSize: 'var(--t-sm)', textAlign: 'center' }}>
              {ui.auditEmpty}
            </div>
          )}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* create-moderator form */}
          <div
            style={{
              background: 'var(--c-surface)',
              border: 'var(--bw) solid var(--c-line)',
              borderRadius: 'var(--r-lg)',
              padding: 20,
              boxShadow: 'var(--shadow)',
            }}
          >
            <h3 style={h3}>{ui.createModerator}</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={modLabel}>{ui.modUsername} *</div>
                <input
                  value={nUser}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNUser(e.target.value)}
                  placeholder="moderator.pmi"
                  style={{ ...modInput, borderColor: nTouched && !nUser.trim() ? '#c2410c' : 'var(--c-line)' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={modLabel}>{ui.modPassword} *</div>
                <input
                  value={nPass}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNPass(e.target.value)}
                  type="text"
                  placeholder="••••••"
                  style={{ ...modInput, borderColor: nTouched && !nPass.trim() ? '#c2410c' : 'var(--c-line)' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={modLabel}>{ui.modFaculty}</div>
                <select value={nFac} onChange={(e) => setNFac(e.target.value)} style={{ ...modInput, cursor: 'pointer' }}>
                  {FAC.map((f) => (
                    <option key={f.id} value={f.id}>
                      {L(f.name)}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={submitCreate} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
                <Icon name="plus" size={15} /> {ui.createModerator}
              </button>
            </div>
          </div>

          {/* roster */}
          {mods.length === 0 && (
            <div style={{ padding: 36, textAlign: 'center', color: 'var(--c-ink2)', fontSize: 'var(--t-base)' }}>
              {ui.modEmpty}
            </div>
          )}
          {mods.map((m) => (
            <div
              key={m.id}
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
              <div style={{ flex: 1, minWidth: 150 }}>
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
                {/* faculty reassignment */}
                <select
                  value={m.fac}
                  onChange={(e) => changeFac(m.id, e.target.value)}
                  style={{
                    marginTop: 4,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--c-ink2)',
                    fontSize: 'var(--t-xs)',
                    fontWeight: 600,
                    fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                    padding: 0,
                    maxWidth: 220,
                  }}
                >
                  {FAC.map((f) => (
                    <option key={f.id} value={f.id}>
                      {L(f.name)}
                    </option>
                  ))}
                </select>
              </div>
              {/* progress */}
              <div style={{ textAlign: 'right', flex: '0 0 auto', minWidth: 76 }}>
                <div style={{ color: 'var(--c-ink)', fontWeight: 700, fontSize: 'var(--t-base)' }}>{m.records}</div>
                <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-2xs)', fontWeight: 600 }}>{ui.modRecordsShort}</div>
              </div>
              <div style={{ textAlign: 'right', flex: '0 0 auto', minWidth: 76 }}>
                <div style={{ color: m.pending ? '#9A6B16' : 'var(--c-ink)', fontWeight: 700, fontSize: 'var(--t-base)' }}>{m.pending}</div>
                <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-2xs)', fontWeight: 600 }}>{ui.modPendingShort}</div>
              </div>
              <span style={m.statusStyle}>{m.statusLabel}</span>
              {/* actions */}
              <div style={{ display: 'flex', gap: 6, flex: '0 0 auto', flexWrap: 'wrap' }}>
                <button onClick={() => toggleStatus(m.id, m.status)} style={miniBtn} title={m.status === 'active' ? ui.modSuspend : ui.modActivate}>
                  <Icon name={m.status === 'active' ? 'moon' : 'sun'} size={14} />
                  {m.status === 'active' ? ui.modSuspend : ui.modActivate}
                </button>
                <button onClick={() => resetPwd(m.id)} style={miniBtn} title={ui.modResetPwd}>
                  <Icon name="gear" size={14} />
                </button>
                <button onClick={() => removeMod(m.id)} style={dangerBtn} title={ui.modDelete}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const modLabel: CSSProperties = {
  fontSize: 'var(--t-2xs)',
  fontWeight: 700,
  color: 'var(--c-ink2)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '.05em',
}
const modInput: CSSProperties = {
  width: '100%',
  background: 'var(--c-bg2)',
  border: 'var(--bw) solid var(--c-line)',
  borderRadius: 'var(--r)',
  padding: '10px 13px',
  fontSize: 'var(--t-sm)',
  color: 'var(--c-ink)',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
  boxSizing: 'border-box',
}
const primaryBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  background: 'var(--c-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--r)',
  padding: '11px 18px',
  fontSize: 'var(--t-sm)',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
  flex: '0 0 auto',
}
const miniBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  background: 'var(--c-bg2)',
  color: 'var(--c-ink)',
  border: 'var(--bw) solid var(--c-line)',
  borderRadius: 'var(--r)',
  padding: '7px 11px',
  fontSize: 'var(--t-2xs)',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
}
const dangerBtn: CSSProperties = {
  background: 'rgba(179,38,30,.1)',
  color: '#b3261e',
  border: '1px solid rgba(179,38,30,.3)',
  borderRadius: 'var(--r)',
  padding: '7px 11px',
  fontSize: 'var(--t-xs)',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
}
