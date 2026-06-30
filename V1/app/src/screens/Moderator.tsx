import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { useApp } from '../AppContext'
import { ALU, FAC } from '../data/records'
import { avGrad, fac, initials, ptab, statusMeta } from '../lib/logic'
import { mediaSrc } from '../lib/api'
import { Icon } from '../components/icons'
import type { Alumnus, Loc, MediaItem } from '../types'

// Drafts are stored per moderator account so each one keeps their own list.
const DRAFTS_KEY = 'alumni-mod-drafts'

interface DraftShape {
  nameKz: string
  nameRu: string
  nameEn: string
  year: string
  spec: string
  pos: string
  bio: string
  mentor: string
  students: string
}

/** A saved draft: the form fields plus any uploaded photo/media. */
interface DraftEntry {
  id: string
  savedAt: string
  form: DraftShape
  photo: string
  media: MediaItem[]
}

const EMPTY: DraftShape = {
  nameKz: '', nameRu: '', nameEn: '', year: '', spec: '', pos: '', bio: '', mentor: '', students: '',
}

export function Moderator() {
  const {
    narrow, ui, L, go, goHome, modTab, setModTab, submissions, staff,
    createPerson, refreshSubmissions, updatePerson, logout, uploadMedia,
  } = useApp()

  useEffect(() => {
    if (staff) refreshSubmissions()
  }, [staff, refreshSubmissions])

  // ---- scope: a moderator only sees their own faculty; admin sees all ----
  const scopeFac = staff?.fac
  const fc = scopeFac ? fac(scopeFac) : undefined
  const scope = fc ? L(fc.name) : ui.roleAdmin
  const publishedMeta = statusMeta(L, 'published')

  // ---- real records list (no fabricated statuses) ----
  const recs = ALU.filter((a) => !scopeFac || a.fac === scopeFac).map((a) => ({
    id: a.id,
    raw: a,
    name: L(a.name),
    year: a.year,
    position: L(a.pos),
    initials: initials(a.name),
    avStyle: {
      width: 40,
      height: 40,
      borderRadius: '50%',
      flex: '0 0 auto',
      background: `linear-gradient(150deg,${a.accent}, color-mix(in srgb,${a.accent} 55%, #0a1830))`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontFamily: 'Lora, serif',
      fontWeight: 700,
      fontSize: 14,
    } as CSSProperties,
  }))

  const facLabel = (id: string): string => {
    const f = fac(id)
    return f ? L(f.name) : id
  }
  const submissionRows = submissions.filter((s) => s.status === 'review').map((s) => ({
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
      background: avGrad('#2E7AB0'),
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

  const reviewCount = submissionRows.length

  // ---- add-form state ----
  const [form, setForm] = useState<DraftShape>(EMPTY)
  const [photo, setPhoto] = useState('')
  const [media, setMedia] = useState<MediaItem[]>([])
  const [touched, setTouched] = useState(false)
  const [feedback, setFeedback] = useState('')
  const fbTimer = useRef<ReturnType<typeof setTimeout>>()

  // ---- drafts (per-moderator list) ----
  const draftsKey = `${DRAFTS_KEY}:${staff?.username ?? 'anon'}`
  const [drafts, setDrafts] = useState<DraftEntry[]>([])
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftsKey)
      setDrafts(raw ? (JSON.parse(raw) as DraftEntry[]) : [])
    } catch {
      setDrafts([])
    }
  }, [draftsKey])
  const persistDrafts = (next: DraftEntry[]) => {
    setDrafts(next)
    try {
      localStorage.setItem(draftsKey, JSON.stringify(next))
    } catch {
      /* storage unavailable — ignore */
    }
  }

  // ---- edit-existing-record state ----
  const [editId, setEditId] = useState<string | null>(null)
  const [eorig, setEorig] = useState<Alumnus | null>(null)
  const [saving, setSaving] = useState(false)
  const [eform, setEform] = useState({ nameKz: '', nameRu: '', nameEn: '', year: '', spec: '', pos: '', bio: '' })
  const eset = (k: keyof typeof eform) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEform((f) => ({ ...f, [k]: e.target.value }))

  const flash = (msg: string) => {
    setFeedback(msg)
    clearTimeout(fbTimer.current)
    fbTimer.current = setTimeout(() => setFeedback(''), 3000)
  }

  const set = (k: keyof DraftShape) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const up = await uploadMedia(file)
    if (!up) {
      flash(ui.uploadFailed)
      return
    }
    setPhoto(up.url)
  }
  const onMedia = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    for (const f of files) {
      const up = await uploadMedia(f)
      if (!up) {
        flash(ui.uploadFailed)
        continue
      }
      setMedia((prev) => [...prev, { name: up.name, kind: up.kind, url: up.url }])
    }
  }

  const buildName = (): Loc => {
    const n: Loc = {}
    if (form.nameKz.trim()) n.kz = form.nameKz.trim()
    if (form.nameRu.trim()) n.ru = form.nameRu.trim()
    if (form.nameEn.trim()) n.en = form.nameEn.trim()
    return n
  }
  const hasName = !!(form.nameKz.trim() || form.nameRu.trim() || form.nameEn.trim())

  const resetForm = () => {
    setForm(EMPTY)
    setPhoto('')
    setMedia([])
    setTouched(false)
    setEditingDraftId(null)
  }

  // A moderator enters verified data — it is published straight into the
  // archive (no self-review). The review queue is only for public submissions.
  const [publishing, setPublishing] = useState(false)
  const publish = async () => {
    if (!hasName) {
      setTouched(true)
      return
    }
    const toLoc = (s: string) => (s.trim() ? { ru: s.trim() } : undefined)
    setPublishing(true)
    const err = await createPerson({
      name: buildName(),
      fac: scopeFac || FAC[0].id,
      year: form.year.trim() ? Number(form.year.trim()) || undefined : undefined,
      spec: toLoc(form.spec),
      pos: toLoc(form.pos),
      bio: toLoc(form.bio),
      photoUrl: photo || undefined,
      media: media.map((m) => ({ name: m.name, kind: m.kind, url: m.url })),
    })
    setPublishing(false)
    if (err) {
      flash(err)
      return
    }
    // publishing a draft removes it from the saved list
    if (editingDraftId) persistDrafts(drafts.filter((d) => d.id !== editingDraftId))
    resetForm()
    flash(ui.modPublished)
    setModTab('list')
  }

  // Save the current form as a draft (updating the open one, or adding a new one).
  const saveDraft = () => {
    const id = editingDraftId ?? `d-${Date.now()}-${Math.round(Math.random() * 1e6)}`
    const entry: DraftEntry = { id, savedAt: new Date().toISOString(), form, photo, media }
    const exists = drafts.some((d) => d.id === id)
    persistDrafts(exists ? drafts.map((d) => (d.id === id ? entry : d)) : [entry, ...drafts])
    setEditingDraftId(id)
    flash(ui.draftSaved)
  }
  const loadDraft = (d: DraftEntry) => {
    setForm({ ...EMPTY, ...d.form })
    setPhoto(d.photo || '')
    setMedia(Array.isArray(d.media) ? d.media : [])
    setEditingDraftId(d.id)
    setTouched(false)
    setModTab('add')
  }
  const deleteDraft = (id: string) => {
    persistDrafts(drafts.filter((d) => d.id !== id))
    if (editingDraftId === id) setEditingDraftId(null)
    flash(ui.draftDeleted)
  }
  const newDraft = () => {
    resetForm()
    setModTab('add')
  }

  // ---- edit an existing record ----
  const startEdit = (a: Alumnus) => {
    setEorig(a)
    setEditId(a.id)
    setEform({
      nameKz: a.name.kz || '',
      nameRu: a.name.ru || '',
      nameEn: a.name.en || '',
      year: String(a.year ?? ''),
      spec: a.spec?.ru || '',
      pos: a.pos?.ru || '',
      bio: a.bio?.ru || '',
    })
  }
  const cancelEdit = () => {
    setEditId(null)
    setEorig(null)
  }
  const eHasName = !!(eform.nameKz.trim() || eform.nameRu.trim() || eform.nameEn.trim())
  const saveEdit = async () => {
    if (!editId || !eorig || !eHasName) return
    const name: Loc = {}
    if (eform.nameKz.trim()) name.kz = eform.nameKz.trim()
    if (eform.nameRu.trim()) name.ru = eform.nameRu.trim()
    if (eform.nameEn.trim()) name.en = eform.nameEn.trim()
    setSaving(true)
    // preserve other locales, update the RU form the moderator edited
    const err = await updatePerson(editId, {
      name,
      year: eform.year.trim() ? Number(eform.year.trim()) || eorig.year : eorig.year,
      spec: { ...eorig.spec, ru: eform.spec.trim() },
      pos: { ...eorig.pos, ru: eform.pos.trim() },
      bio: { ...eorig.bio, ru: eform.bio.trim() },
    })
    setSaving(false)
    if (err) {
      flash(err)
      return
    }
    setEditId(null)
    setEorig(null)
    flash(ui.recordUpdated)
  }

  const doLogout = () => {
    logout()
    goHome()
  }

  const formCols = narrow ? '1fr' : '190px 1fr'

  const inputStyle: CSSProperties = {
    width: '100%',
    background: 'var(--c-bg2)',
    border: 'var(--bw) solid var(--c-line)',
    borderRadius: 'var(--r)',
    padding: '11px 14px',
    fontSize: 'var(--t-sm)',
    color: 'var(--c-ink)',
    fontFamily: 'Manrope, sans-serif',
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

  const approveBtn: CSSProperties = {
    background: 'var(--c-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--r)',
    padding: '8px 13px',
    fontSize: 'var(--t-xs)',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Manrope, sans-serif',
    flex: '0 0 auto',
  }
  const tabs = [
    ['list', 'tabRecords'],
    ['add', 'tabAdd'],
    ['drafts', 'tabDrafts'],
    ['review', 'tabReview'],
  ] as const

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
          onClick={staff?.role === 'admin' ? () => go({ name: 'admin' }) : doLogout}
          style={{
            background: 'var(--c-bg2)',
            border: 'var(--bw) solid var(--c-line)',
            color: 'var(--c-ink)',
            borderRadius: 'var(--r)',
            padding: '9px 16px',
            fontSize: 'var(--t-xs)',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Manrope, sans-serif',
          }}
        >
          {staff?.role === 'admin' ? `${ui.switchToAdmin} →` : ui.logoutBtn}
        </button>
      </div>

      {/* feedback toast — fixed so it is always visible regardless of scroll */}
      {feedback && (
        <div
          style={{
            position: 'fixed',
            top: 18,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            background: 'var(--c-surface)',
            color: '#1f8a5b',
            border: '1px solid rgba(43,182,115,.5)',
            borderRadius: 'var(--r)',
            padding: '11px 16px',
            fontSize: 'var(--t-sm)',
            fontWeight: 700,
            boxShadow: '0 12px 30px -8px rgba(0,0,0,.35)',
            animation: 'fadeUp .25s ease',
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
          <button key={k} onClick={() => setModTab(k)} style={ptab(modTab === k)}>
            {ui[key]}
            {k === 'review' && reviewCount > 0 ? ` · ${reviewCount}` : ''}
            {k === 'drafts' && drafts.length > 0 ? ` · ${drafts.length}` : ''}
          </button>
        ))}
      </div>

      {/* LIST */}
      {modTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recs.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-ink2)', fontSize: 'var(--t-base)' }}>
              {ui.reviewEmpty}
            </div>
          )}
          {recs.map((r) => (
            <div
              key={r.id}
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
              <span style={publishedMeta.style}>{publishedMeta.label}</span>
              <button
                onClick={() => go({ name: 'alumni', id: r.id })}
                style={{
                  background: 'transparent',
                  border: 'var(--bw) solid var(--c-line)',
                  color: 'var(--c-ink2)',
                  borderRadius: 'var(--r)',
                  padding: '8px 12px',
                  fontSize: 'var(--t-xs)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'Manrope, sans-serif',
                  flex: '0 0 auto',
                }}
              >
                {ui.openRecord}
              </button>
              <button
                onClick={() => startEdit(r.raw)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--c-bg2)',
                  border: 'var(--bw) solid var(--c-line)',
                  color: 'var(--c-ink)',
                  borderRadius: 'var(--r)',
                  padding: '8px 13px',
                  fontSize: 'var(--t-xs)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'Manrope, sans-serif',
                  flex: '0 0 auto',
                }}
              >
                <Icon name="edit" size={13} /> {ui.edit}
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
          {/* faculty target — alumni are always added to the moderator's faculty */}
          {scopeFac && fc && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 12,
                padding: '11px 14px',
                background: 'color-mix(in srgb, var(--c-primary) 8%, var(--c-surface))',
                border: 'var(--bw) solid color-mix(in srgb, var(--c-primary) 32%, var(--c-line))',
                borderRadius: 'var(--r)',
                color: 'var(--c-ink)',
                fontSize: 'var(--t-sm)',
              }}
            >
              <Icon name="building" size={16} />
              <span>
                {ui.addToFaculty}: <strong>{L(fc.name)}</strong>
              </span>
            </div>
          )}
          {editingDraftId && (
            <div style={{ marginTop: 10, color: 'var(--c-ink2)', fontSize: 'var(--t-2xs)', fontWeight: 600 }}>
              {ui.editingDraft}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: formCols, gap: 20, marginTop: 18 }}>
            {/* photo slot */}
            <div>
              <div style={fieldLabel}>{ui.formPhoto}</div>
              <label
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
                  padding: photo ? 0 : 16,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <input type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />
                {photo ? (
                  <img src={mediaSrc(photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
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
                  </>
                )}
              </label>
              {photo && (
                <button
                  onClick={() => setPhoto('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--c-ink2)',
                    fontSize: 'var(--t-xs)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '8px 0 0',
                    fontFamily: 'Manrope, sans-serif',
                  }}
                >
                  {ui.applyRemove}
                </button>
              )}
            </div>
            {/* fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={fieldLabel}>{ui.formFullName} *</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={form.nameKz} onChange={set('nameKz')} placeholder="Қазақша" style={inputStyle} />
                  <input
                    value={form.nameRu}
                    onChange={set('nameRu')}
                    placeholder="Русский"
                    style={{ ...inputStyle, borderColor: touched && !hasName ? '#c2410c' : 'var(--c-line)' }}
                  />
                  <input value={form.nameEn} onChange={set('nameEn')} placeholder="English" style={inputStyle} />
                </div>
                {touched && !hasName && (
                  <div style={{ color: '#c2410c', fontSize: 'var(--t-2xs)', fontWeight: 600, marginTop: 6 }}>
                    {ui.applyRequired}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 110 }}>
                  <div style={fieldLabel}>{ui.formYear}</div>
                  <input value={form.year} onChange={set('year')} placeholder="2014" style={inputStyle} />
                </div>
                <div style={{ flex: 2, minWidth: 150 }}>
                  <div style={fieldLabel}>{ui.formSpecialty}</div>
                  <input value={form.spec} onChange={set('spec')} style={inputStyle} />
                </div>
              </div>
              <div>
                <div style={fieldLabel}>{ui.formPosition}</div>
                <input value={form.pos} onChange={set('pos')} style={inputStyle} />
              </div>
              <div>
                <div style={fieldLabel}>{ui.formBio}</div>
                <textarea value={form.bio} onChange={set('bio')} rows={3} style={textareaStyle} />
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={fieldLabel}>{ui.applyMentor}</div>
                  <input value={form.mentor} onChange={set('mentor')} placeholder="Профессор Сериков А.Қ." style={inputStyle} />
                </div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={fieldLabel}>{ui.applyStudents}</div>
                  <input value={form.students} onChange={set('students')} placeholder="ФИО через запятую" style={inputStyle} />
                </div>
              </div>
              <div>
                <div style={fieldLabel}>{ui.formMedia}</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {media.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: 84,
                        height: 84,
                        borderRadius: 'var(--r)',
                        overflow: 'hidden',
                        border: 'var(--bw) solid var(--c-line)',
                        position: 'relative',
                        flex: '0 0 auto',
                        background: 'var(--c-bg2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--c-ink2)',
                      }}
                    >
                      {m.kind === 'image' ? (
                        <img src={mediaSrc(m.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Icon name="play" size={22} />
                      )}
                      <button
                        onClick={() => setMedia((prev) => prev.filter((_, j) => j !== idx))}
                        style={{
                          position: 'absolute',
                          top: 3,
                          right: 3,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,.55)',
                          color: '#fff',
                          border: 'none',
                          fontSize: 11,
                          lineHeight: '18px',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <label
                    style={{
                      width: 84,
                      height: 84,
                      border: '2px dashed var(--c-line)',
                      borderRadius: 'var(--r)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--c-bg2)',
                      color: 'var(--c-ink2)',
                      fontSize: 20,
                      cursor: 'pointer',
                      flex: '0 0 auto',
                    }}
                  >
                    <input type="file" accept="image/*,video/*" multiple onChange={onMedia} style={{ display: 'none' }} />
                    <Icon name="plus" size={20} />
                  </label>
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
              alignItems: 'center',
              borderTop: 'var(--bw) solid var(--c-line)',
              paddingTop: 18,
            }}
          >
            <button
              onClick={publish}
              disabled={publishing}
              style={{
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
                cursor: publishing ? 'default' : 'pointer',
                opacity: publishing ? 0.6 : 1,
                fontFamily: 'Manrope, sans-serif',
                boxShadow: '0 8px 20px -8px var(--c-primary)',
              }}
            >
              <Icon name="check" size={15} /> {ui.publish}
            </button>
            <button
              onClick={saveDraft}
              style={{
                background: 'var(--c-bg2)',
                color: 'var(--c-ink)',
                border: 'var(--bw) solid var(--c-line)',
                borderRadius: 'var(--r)',
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

      {/* DRAFTS */}
      {modTab === 'drafts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-sm)', fontWeight: 600 }}>{ui.draftsHint}</div>
            <button
              onClick={newDraft}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: 'var(--c-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--r)',
                padding: '9px 16px',
                fontSize: 'var(--t-xs)',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Manrope, sans-serif',
              }}
            >
              <Icon name="plus" size={14} /> {ui.addAlumni}
            </button>
          </div>
          {drafts.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-ink2)', fontSize: 'var(--t-base)' }}>
              {ui.draftsEmpty}
            </div>
          ) : (
            drafts.map((d) => {
              const dname = d.form.nameRu || d.form.nameKz || d.form.nameEn || ui.draftUntitled
              const when = (() => {
                const dt = new Date(d.savedAt)
                return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
              })()
              return (
                <div
                  key={d.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    background: 'var(--c-surface)',
                    border: 'var(--bw) solid var(--c-line)',
                    borderRadius: 'var(--r)',
                    padding: '12px 16px',
                    boxShadow: 'var(--shadow)',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--r)', flex: '0 0 auto', background: 'var(--c-bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-ink2)' }}>
                    <Icon name="edit" size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Lora, serif', fontWeight: 700, color: 'var(--c-ink)', fontSize: 'var(--t-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dname}
                    </div>
                    <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-2xs)', fontWeight: 600 }}>
                      {[d.form.year, d.form.spec, when && `${ui.draftSavedAt} ${when}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <button
                    onClick={() => loadDraft(d)}
                    style={{
                      background: 'var(--c-bg2)',
                      border: 'var(--bw) solid var(--c-line)',
                      color: 'var(--c-ink)',
                      borderRadius: 'var(--r)',
                      padding: '8px 14px',
                      fontSize: 'var(--t-xs)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'Manrope, sans-serif',
                      flex: '0 0 auto',
                    }}
                  >
                    {ui.draftOpen}
                  </button>
                  <button
                    onClick={() => deleteDraft(d.id)}
                    aria-label={ui.modDelete}
                    style={{
                      background: 'none',
                      border: 'var(--bw) solid var(--c-line)',
                      color: '#b3261e',
                      borderRadius: 'var(--r)',
                      padding: '8px 12px',
                      fontSize: 'var(--t-xs)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'Manrope, sans-serif',
                      flex: '0 0 auto',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              )
            })
          )}
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
                borderLeft: '3px solid #2E7AB0',
                borderRadius: 'var(--r)',
                padding: '13px 16px',
                boxShadow: 'var(--shadow)',
                flexWrap: 'wrap',
              }}
            >
              <div style={s.avStyle}>
                {s.photoUrl ? <img src={s.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : s.initials}
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
                  background: 'rgba(46,122,176,.16)',
                  color: '#2E7AB0',
                  borderRadius: 'var(--r)',
                  padding: '4px 11px',
                  fontSize: 'var(--t-2xs)',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {ui.newApplication}
              </span>
              <button onClick={() => go({ name: 'submission', id: s.id })} style={approveBtn}>
                {ui.reviewBtn} →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* EDIT OVERLAY — edit an existing record */}
      {editId && (
        <div
          onClick={cancelEdit}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(8,16,32,.55)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '5vh 16px',
            overflowY: 'auto',
            animation: 'fadeUp .25s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 640,
              background: 'var(--c-surface)',
              border: 'var(--bw) solid var(--c-line)',
              borderRadius: 'var(--r-lg)',
              padding: 24,
              boxShadow: 'var(--shadow)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12 }}>
              <h2 style={{ fontFamily: 'Lora, serif', fontWeight: 700, color: 'var(--c-ink)', fontSize: 'var(--t-lg)', margin: 0 }}>
                {ui.editRecord}
              </h2>
              <button
                onClick={cancelEdit}
                aria-label={ui.cancelEdit}
                style={{
                  background: 'var(--c-bg2)',
                  border: 'var(--bw) solid var(--c-line)',
                  color: 'var(--c-ink)',
                  borderRadius: 'var(--r)',
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  fontFamily: 'Manrope, sans-serif',
                  flex: '0 0 auto',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={fieldLabel}>{ui.formFullName} *</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={eform.nameKz} onChange={eset('nameKz')} placeholder="Қазақша" style={inputStyle} />
                  <input
                    value={eform.nameRu}
                    onChange={eset('nameRu')}
                    placeholder="Русский"
                    style={{ ...inputStyle, borderColor: !eHasName ? '#c2410c' : 'var(--c-line)' }}
                  />
                  <input value={eform.nameEn} onChange={eset('nameEn')} placeholder="English" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 110 }}>
                  <div style={fieldLabel}>{ui.formYear}</div>
                  <input value={eform.year} onChange={eset('year')} placeholder="2014" style={inputStyle} />
                </div>
                <div style={{ flex: 2, minWidth: 150 }}>
                  <div style={fieldLabel}>{ui.formSpecialty}</div>
                  <input value={eform.spec} onChange={eset('spec')} style={inputStyle} />
                </div>
              </div>
              <div>
                <div style={fieldLabel}>{ui.formPosition}</div>
                <input value={eform.pos} onChange={eset('pos')} style={inputStyle} />
              </div>
              <div>
                <div style={fieldLabel}>{ui.formBio}</div>
                <textarea value={eform.bio} onChange={eset('bio')} rows={4} style={textareaStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap', borderTop: 'var(--bw) solid var(--c-line)', paddingTop: 18 }}>
              <button
                onClick={saveEdit}
                disabled={saving || !eHasName}
                style={{
                  background: 'var(--c-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--r)',
                  padding: '12px 22px',
                  fontSize: 'var(--t-sm)',
                  fontWeight: 700,
                  cursor: saving || !eHasName ? 'default' : 'pointer',
                  opacity: saving || !eHasName ? 0.6 : 1,
                  fontFamily: 'Manrope, sans-serif',
                  boxShadow: '0 8px 20px -8px var(--c-primary)',
                }}
              >
                {ui.saveChanges}
              </button>
              <button
                onClick={cancelEdit}
                style={{
                  background: 'var(--c-bg2)',
                  color: 'var(--c-ink)',
                  border: 'var(--bw) solid var(--c-line)',
                  borderRadius: 'var(--r)',
                  padding: '12px 22px',
                  fontSize: 'var(--t-sm)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'Manrope, sans-serif',
                }}
              >
                {ui.cancelEdit}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
