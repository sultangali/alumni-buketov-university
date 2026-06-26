import { useEffect, type CSSProperties } from 'react'
import { Icon } from '../components/icons'
import { useApp } from '../AppContext'
import { ALU } from '../data/records'
import { avGrad, fac, initials, ptab, statusMeta } from '../lib/logic'

interface Rec {
  name: string
  year: number
  position: string
  initials: string
  avStyle: CSSProperties
  statusLabel: string
  statusStyle: CSSProperties
  open: () => void
}

const STATUS_SEQ = ['published', 'published', 'review', 'draft'] as const

export function Moderator() {
  const { narrow, ui, L, go, modTab, setModTab, submissions, staff, refreshSubmissions, reviewSubmission } = useApp()

  useEffect(() => {
    if (staff) refreshSubmissions()
  }, [staff, refreshSubmissions])

  const fc = fac('mit')
  const scope = fc ? L(fc.name) : ''

  const recs: Rec[] = ALU.filter((a) => a.fac === 'mit').map((a, i) => {
    const sm = statusMeta(L, STATUS_SEQ[i % 4])
    return {
      name: L(a.name),
      year: a.year,
      position: L(a.pos),
      initials: initials(a.name),
      avStyle: {
        width: 40,
        height: 40,
        borderRadius: '50%',
        flex: '0 0 auto',
        background: `linear-gradient(150deg,${a.accent}, color-mix(in srgb,${a.accent} 55%, #0a1424))`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'Lora, serif',
        fontWeight: 700,
        fontSize: 14,
      },
      statusLabel: sm.label,
      statusStyle: sm.style,
      open: () => go({ name: 'alumni', id: a.id }),
    }
  })

  const reviewRecs = recs.filter((r) => /проверк|review|Тексер/i.test(r.statusLabel))
  const reviewStatus = statusMeta(L, 'review')

  const facLabel = (id: string): string => {
    const f = fac(id)
    return f ? L(f.name) : id
  }
  const submissionRows = submissions.map((s) => ({
    id: s.id,
    initials: initials(s.name),
    name: L(s.name),
    sub: [s.year ?? '—', s.fac ? facLabel(s.fac) : '', s.pos || s.spec, s.mentor].filter(Boolean).join(' · '),
    photoUrl: s.photoUrl,
    avStyle: {
      width: 40,
      height: 40,
      borderRadius: '50%',
      flex: '0 0 auto',
      background: avGrad('#7A5CCB'),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontFamily: 'Lora, serif',
      fontWeight: 700,
      fontSize: 14,
      overflow: 'hidden',
    } as CSSProperties,
  }))

  const reviewCount = submissionRows.length + reviewRecs.length

  const tabs = [
    ['list', 'tabRecords'],
    ['add', 'tabAdd'],
    ['review', 'tabReview'],
  ] as const

  const formCols = narrow ? '1fr' : '190px 1fr'

  const inputStyle: CSSProperties = {
    width: '100%',
    background: 'var(--c-bg2)',
    border: 'var(--bw) solid var(--c-line)',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 'var(--t-sm)',
    color: 'var(--c-ink)',
    fontFamily: 'Manrope, sans-serif',
    outline: 'none',
  }
  const textareaStyle: CSSProperties = { ...inputStyle, resize: 'vertical' }

  const fieldLabel: CSSProperties = {
    fontSize: 'var(--t-xs)',
    fontWeight: 700,
    color: 'var(--c-ink2)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '.05em',
  }

  const approveBtn: CSSProperties = {
    background: 'var(--c-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 9,
    padding: '8px 13px',
    fontSize: 'var(--t-xs)',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Manrope, sans-serif',
    flex: '0 0 auto',
  }
  const rejectBtn: CSSProperties = {
    background: 'var(--c-bg2)',
    color: 'var(--c-ink)',
    border: 'var(--bw) solid var(--c-line)',
    borderRadius: 9,
    padding: '8px 13px',
    fontSize: 'var(--t-xs)',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Manrope, sans-serif',
    flex: '0 0 auto',
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
              borderRadius: 14,
              background: 'linear-gradient(140deg, var(--c-primary2), var(--c-primary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 22,
              flex: '0 0 auto',
            }}
          >
            <Icon name="edit" size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'Lora, serif',
                fontWeight: 700,
                color: 'var(--c-ink)',
                fontSize: 'var(--t-md)',
              }}
            >
              {ui.moderatorMode}
            </div>
            <div
              style={{
                color: 'var(--c-ink2)',
                fontSize: 'var(--t-xs)',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {ui.roleModerator} · {scope}
            </div>
          </div>
        </div>
        <button
          onClick={() => go({ name: 'admin' })}
          style={{
            background: 'var(--c-bg2)',
            border: 'var(--bw) solid var(--c-line)',
            color: 'var(--c-ink)',
            borderRadius: 999,
            padding: '9px 16px',
            fontSize: 'var(--t-xs)',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Manrope, sans-serif',
          }}
        >
          {ui.switchToAdmin} →
        </button>
      </div>

      {/* tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: 'var(--c-bg2)',
          border: 'var(--bw) solid var(--c-line)',
          borderRadius: 14,
          padding: 5,
          marginBottom: 22,
          width: 'fit-content',
          maxWidth: '100%',
          overflowX: 'auto',
        }}
      >
        {tabs.map(([k, key]) => (
          <button key={k} onClick={() => setModTab(k)} style={ptab(modTab === k)}>
            {ui[key]}
            {k === 'review' && reviewCount > 0 ? ` · ${reviewCount}` : ''}
          </button>
        ))}
      </div>

      {/* LIST */}
      {modTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recs.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'var(--c-surface)',
                border: 'var(--bw) solid var(--c-line)',
                borderRadius: 'var(--r)',
                padding: '13px 16px',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div style={r.avStyle}>{r.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'Lora, serif',
                    fontWeight: 600,
                    color: 'var(--c-ink)',
                    fontSize: 'var(--t-base)',
                  }}
                >
                  {r.name}
                </div>
                <div
                  style={{
                    color: 'var(--c-ink2)',
                    fontSize: 'var(--t-xs)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.year} · {r.position}
                </div>
              </div>
              <span style={r.statusStyle}>{r.statusLabel}</span>
              <button
                onClick={r.open}
                style={{
                  background: 'var(--c-bg2)',
                  border: 'var(--bw) solid var(--c-line)',
                  color: 'var(--c-ink)',
                  borderRadius: 9,
                  padding: '8px 13px',
                  fontSize: 'var(--t-xs)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'Manrope, sans-serif',
                  flex: '0 0 auto',
                }}
              >
                {ui.edit}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ADD FORM */}
      {modTab === 'add' && (
        <div
          style={{
            background: 'var(--c-surface)',
            border: 'var(--bw) solid var(--c-line)',
            borderRadius: 'var(--r-lg)',
            padding: 24,
            boxShadow: 'var(--shadow)',
            maxWidth: 820,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <h2
              style={{
                fontFamily: 'Lora, serif',
                fontWeight: 700,
                color: 'var(--c-ink)',
                fontSize: 'var(--t-lg)',
                margin: 0,
              }}
            >
              {ui.addAlumni}
            </h2>
            <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-2xs)', fontWeight: 600 }}>
              {ui.requiredHint}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: formCols, gap: 20, marginTop: 18 }}>
            {/* photo slot */}
            <div>
              <div style={fieldLabel}>{ui.formPhoto}</div>
              <div
                style={{
                  aspectRatio: '3 / 4',
                  border: '2px dashed var(--c-line)',
                  borderRadius: 'var(--r)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  background: 'var(--c-bg2)',
                  color: 'var(--c-ink2)',
                  textAlign: 'center',
                  padding: 16,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--c-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                  }}
                >
                  <Icon name="image" size={22} />
                </div>
                <div style={{ fontSize: 'var(--t-xs)', fontWeight: 600 }}>{ui.dropHint}</div>
              </div>
            </div>
            {/* fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={fieldLabel}>{ui.formFullName}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input placeholder="Қазақша" style={inputStyle} />
                  <input placeholder="Русский" style={inputStyle} />
                  <input placeholder="English" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 110 }}>
                  <div style={fieldLabel}>{ui.formYear}</div>
                  <input placeholder="2014" style={inputStyle} />
                </div>
                <div style={{ flex: 2, minWidth: 150 }}>
                  <div style={fieldLabel}>{ui.formSpecialty}</div>
                  <input style={inputStyle} />
                </div>
              </div>
              <div>
                <div style={fieldLabel}>{ui.formPosition}</div>
                <input style={inputStyle} />
              </div>
              <div>
                <div style={fieldLabel}>{ui.formBio}</div>
                <textarea rows={3} style={textareaStyle} />
              </div>
              <div>
                <div style={fieldLabel}>{ui.formMedia}</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div
                    style={{
                      width: 84,
                      height: 84,
                      border: '2px dashed var(--c-line)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--c-bg2)',
                      color: 'var(--c-ink2)',
                      fontSize: 20,
                      cursor: 'pointer',
                    }}
                  >
                    <Icon name="plus" size={20} />
                  </div>
                  <div
                    style={{
                      width: 84,
                      height: 84,
                      border: '2px dashed var(--c-line)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--c-bg2)',
                      color: 'var(--c-ink2)',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon name="play" size={18} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              marginTop: 22,
              flexWrap: 'wrap',
              borderTop: 'var(--bw) solid var(--c-line)',
              paddingTop: 18,
            }}
          >
            <button
              style={{
                background: 'var(--c-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 11,
                padding: '12px 22px',
                fontSize: 'var(--t-sm)',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Manrope, sans-serif',
                boxShadow: '0 8px 20px -8px var(--c-primary)',
              }}
            >
              {ui.sendReview}
            </button>
            <button
              style={{
                background: 'var(--c-bg2)',
                color: 'var(--c-ink)',
                border: 'var(--bw) solid var(--c-line)',
                borderRadius: 11,
                padding: '12px 22px',
                fontSize: 'var(--t-sm)',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Manrope, sans-serif',
              }}
            >
              {ui.saveDraft}
            </button>
          </div>
        </div>
      )}

      {/* REVIEW */}
      {modTab === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviewCount === 0 && (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: 'var(--c-ink2)',
                fontSize: 'var(--t-base)',
              }}
            >
              {ui.reviewEmpty}
            </div>
          )}

          {/* self-submitted applications */}
          {submissionRows.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'var(--c-surface)',
                border: 'var(--bw) solid var(--c-line)',
                borderLeft: '3px solid #7A5CCB',
                borderRadius: 'var(--r)',
                padding: '13px 16px',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div style={s.avStyle}>
                {s.photoUrl
                  ? <img src={s.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : s.initials
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'Lora, serif',
                    fontWeight: 600,
                    color: 'var(--c-ink)',
                    fontSize: 'var(--t-base)',
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    color: 'var(--c-ink2)',
                    fontSize: 'var(--t-xs)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.sub}
                </div>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(122,92,203,.16)',
                  color: '#7A5CCB',
                  borderRadius: 999,
                  padding: '4px 11px',
                  fontSize: 'var(--t-2xs)',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {ui.newApplication}
              </span>
              <span style={reviewStatus.style}>{reviewStatus.label}</span>
              <button onClick={() => reviewSubmission(s.id, 'approve')} style={approveBtn}>
                Опубликовать
              </button>
              <button onClick={() => reviewSubmission(s.id, 'reject')} style={rejectBtn}>
                Отклонить
              </button>
            </div>
          ))}

          {reviewRecs.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'var(--c-surface)',
                border: 'var(--bw) solid var(--c-line)',
                borderLeft: '3px solid #c2820f',
                borderRadius: 'var(--r)',
                padding: '13px 16px',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div style={r.avStyle}>{r.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'Lora, serif',
                    fontWeight: 600,
                    color: 'var(--c-ink)',
                    fontSize: 'var(--t-base)',
                  }}
                >
                  {r.name}
                </div>
                <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-xs)' }}>
                  {r.year} · {r.position}
                </div>
              </div>
              <span style={r.statusStyle}>{r.statusLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
