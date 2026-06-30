import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { useApp } from '../AppContext'
import { fac } from '../lib/logic'
import { mediaSrc } from '../lib/api'
import { Icon } from '../components/icons'
import type { Loc, MediaItem } from '../types'

/**
 * Full review page for a pending application. The moderator opens it from the
 * review queue, corrects the data in place, removes any wrong photos/media the
 * applicant uploaded, then publishes (→ a real archive record) or rejects.
 */
export function SubmissionReview({ id }: { id: string }) {
  const { ui, L, back, submissions, refreshSubmissions, editSubmission, reviewSubmission } = useApp()

  useEffect(() => {
    refreshSubmissions()
  }, [refreshSubmissions])

  const sub = useMemo(() => submissions.find((s) => s.id === id), [submissions, id])

  const [nameKz, setNameKz] = useState('')
  const [nameRu, setNameRu] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [year, setYear] = useState('')
  const [spec, setSpec] = useState('')
  const [pos, setPos] = useState('')
  const [bio, setBio] = useState('')
  const [mentor, setMentor] = useState('')
  const [students, setStudents] = useState('')
  const [photo, setPhoto] = useState('')
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const fbTimer = useRef<ReturnType<typeof setTimeout>>()
  const loadedFor = useRef<string | null>(null)

  // hydrate the form once the submission is available
  useEffect(() => {
    if (!sub || loadedFor.current === sub.id) return
    loadedFor.current = sub.id
    setNameKz(sub.name.kz || '')
    setNameRu(sub.name.ru || '')
    setNameEn(sub.name.en || '')
    setYear(sub.year != null ? String(sub.year) : '')
    setSpec(sub.spec || '')
    setPos(sub.pos || '')
    setBio(sub.bio || '')
    setMentor(sub.mentor || '')
    setStudents(sub.students || '')
    setPhoto(sub.photoUrl || '')
    setMediaList(sub.media ? [...sub.media] : [])
  }, [sub])

  const flash = (msg: string) => {
    setFeedback(msg)
    clearTimeout(fbTimer.current)
    fbTimer.current = setTimeout(() => setFeedback(''), 3000)
  }

  const buildName = (): Loc => {
    const n: Loc = {}
    if (nameKz.trim()) n.kz = nameKz.trim()
    if (nameRu.trim()) n.ru = nameRu.trim()
    if (nameEn.trim()) n.en = nameEn.trim()
    return n
  }
  const payload = () => ({
    name: buildName(),
    year: year.trim() ? Number(year.trim()) || null : null,
    spec: spec.trim(),
    pos: pos.trim(),
    bio: bio.trim(),
    mentor: mentor.trim(),
    students: students.trim(),
    photoUrl: photo,
    media: mediaList,
  })

  const save = async () => {
    if (!sub) return
    setBusy(true)
    const err = await editSubmission(sub.id, payload())
    setBusy(false)
    flash(err || ui.modUpdated)
  }
  const publish = async () => {
    if (!sub) return
    setBusy(true)
    // persist any in-place corrections first, then materialise the record
    const e1 = await editSubmission(sub.id, payload())
    if (e1) {
      setBusy(false)
      flash(e1)
      return
    }
    const e2 = await reviewSubmission(sub.id, 'approve')
    setBusy(false)
    if (e2) {
      flash(e2)
      return
    }
    back()
  }
  const reject = async () => {
    if (!sub) return
    setBusy(true)
    const err = await reviewSubmission(sub.id, 'reject')
    setBusy(false)
    if (err) {
      flash(err)
      return
    }
    back()
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    background: 'var(--c-bg2)',
    border: 'var(--bw) solid var(--c-line)',
    borderRadius: 'var(--r)',
    padding: '11px 14px',
    fontSize: 'var(--t-sm)',
    color: 'var(--c-ink)',
    fontFamily: 'var(--font-ui)',
    outline: 'none',
    boxSizing: 'border-box',
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

  if (!sub) {
    return (
      <div style={{ animation: 'fadeUp .4s ease', padding: '40px var(--pad)', textAlign: 'center' }}>
        <p style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-base)', marginBottom: 18 }}>{ui.submissionNotFound}</p>
        <button onClick={back} style={ghostBtn}>
          ← {ui.back}
        </button>
      </div>
    )
  }

  const f = fac(sub.fac)
  const facName = f ? L(f.name) : sub.fac

  return (
    <div style={{ animation: 'fadeUp .4s ease', padding: '22px var(--pad) 44px' }}>
      <button onClick={back} style={{ ...ghostBtn, marginBottom: 16 }}>
        ← {ui.back}
      </button>

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: 'var(--c-ink)',
          fontSize: 'var(--t-2xl)',
          margin: '0 0 4px',
        }}
      >
        {ui.reviewTitle}
      </h1>
      <p style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-sm)', margin: '0 0 20px' }}>
        {facName} · {sub.submittedAt}
      </p>

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

      <div
        style={{
          background: 'var(--c-surface)',
          border: 'var(--bw) solid var(--c-line)',
          borderRadius: 'var(--r-lg)',
          padding: 24,
          boxShadow: 'var(--shadow)',
          maxWidth: 760,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* photo */}
        <div>
          <div style={fieldLabel}>{ui.applyPhoto}</div>
          {photo ? (
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 150,
                  aspectRatio: '3 / 4',
                  borderRadius: 'var(--r)',
                  overflow: 'hidden',
                  border: 'var(--bw) solid var(--c-line)',
                  background: 'var(--c-bg2)',
                  flex: '0 0 auto',
                }}
              >
                <img src={mediaSrc(photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <button onClick={() => setPhoto('')} style={dangerBtn}>
                <Icon name="image" size={14} /> {ui.applyRemove}
              </button>
            </div>
          ) : (
            <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-sm)' }}>—</div>
          )}
        </div>

        {/* media */}
        <div>
          <div style={fieldLabel}>{ui.applyMedia}</div>
          {mediaList.length === 0 ? (
            <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-sm)' }}>—</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {mediaList.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    width: 110,
                    borderRadius: 'var(--r)',
                    border: 'var(--bw) solid var(--c-line)',
                    background: 'var(--c-bg2)',
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    alignItems: 'center',
                    position: 'relative',
                  }}
                >
                  <div style={{ width: '100%', aspectRatio: '4 / 3', borderRadius: 6, overflow: 'hidden', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-ink2)' }}>
                    {m.url && m.kind === 'image' ? (
                      <img src={mediaSrc(m.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : m.url && m.kind === 'video' ? (
                      <video src={mediaSrc(m.url)} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Icon name={m.kind === 'video' ? 'play' : 'image'} size={22} />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--t-2xs)',
                      color: 'var(--c-ink2)',
                      width: '100%',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.name}
                  </div>
                  <button
                    onClick={() => setMediaList((prev) => prev.filter((_, j) => j !== idx))}
                    aria-label={ui.applyRemove}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'rgba(179,38,30,.9)',
                      color: '#fff',
                      border: 'none',
                      fontSize: 11,
                      cursor: 'pointer',
                      lineHeight: '20px',
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* fields */}
        <div>
          <div style={fieldLabel}>{ui.formFullName} *</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={nameKz} onChange={(e: ChangeEvent<HTMLInputElement>) => setNameKz(e.target.value)} placeholder="Қазақша" style={inputStyle} />
            <input value={nameRu} onChange={(e: ChangeEvent<HTMLInputElement>) => setNameRu(e.target.value)} placeholder="Русский" style={inputStyle} />
            <input value={nameEn} onChange={(e: ChangeEvent<HTMLInputElement>) => setNameEn(e.target.value)} placeholder="English" style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 110 }}>
            <div style={fieldLabel}>{ui.formYear}</div>
            <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2014" style={inputStyle} />
          </div>
          <div style={{ flex: 2, minWidth: 150 }}>
            <div style={fieldLabel}>{ui.formSpecialty}</div>
            <input value={spec} onChange={(e) => setSpec(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div>
          <div style={fieldLabel}>{ui.formPosition}</div>
          <input value={pos} onChange={(e) => setPos(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={fieldLabel}>{ui.formBio}</div>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} style={textareaStyle} />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={fieldLabel}>{ui.applyMentor}</div>
            <input value={mentor} onChange={(e) => setMentor(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={fieldLabel}>{ui.applyStudents}</div>
            <input value={students} onChange={(e) => setStudents(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', borderTop: 'var(--bw) solid var(--c-line)', paddingTop: 18 }}>
          <button onClick={publish} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
            <Icon name="check" size={15} /> {ui.publish}
          </button>
          <button onClick={save} disabled={busy} style={ghostBtn}>
            {ui.saveChanges}
          </button>
          <button onClick={reject} disabled={busy} style={{ ...dangerBtn, padding: '12px 18px' }}>
            {ui.reject}
          </button>
        </div>
      </div>
    </div>
  )
}

const primaryBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  background: 'var(--c-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--r)',
  padding: '12px 22px',
  fontSize: 'var(--t-sm)',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
  boxShadow: '0 8px 20px -8px var(--c-primary)',
}
const ghostBtn: CSSProperties = {
  background: 'var(--c-bg2)',
  color: 'var(--c-ink)',
  border: 'var(--bw) solid var(--c-line)',
  borderRadius: 'var(--r)',
  padding: '12px 22px',
  fontSize: 'var(--t-sm)',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
}
const dangerBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'rgba(179,38,30,.1)',
  color: '#b3261e',
  border: '1px solid rgba(179,38,30,.3)',
  borderRadius: 'var(--r)',
  padding: '10px 14px',
  fontSize: 'var(--t-sm)',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
}
