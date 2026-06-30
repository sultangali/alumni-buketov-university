import { useState } from 'react'
import type { CSSProperties } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useApp } from '../AppContext'
import { FAC } from '../data/records'
import { mediaSrc } from '../lib/api'
import { useOptionalKeyboard } from '../kiosk/keyboard'
import { Icon } from '../components/icons'
// On a kiosk the visitor can't attach files — they scan this to finish the
// photo/media upload (profile photo auto-cropped to 3:4) from their phone.
const UPLOAD_URL = 'https://alumni.buketov.edu.kz/u/apply'

export function Apply() {
  const { ui, L, go, addSubmission, narrow, uploadMedia } = useApp()
  const kbCtx = useOptionalKeyboard()
  const [uploadErr, setUploadErr] = useState('')

  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [facId, setFacId] = useState(FAC[0].id)
  const [facOther, setFacOther] = useState('')
  const [facNotListed, setFacNotListed] = useState(false)
  const [year, setYear] = useState('')
  const [spec, setSpec] = useState('')
  const [pos, setPos] = useState('')
  const [bio, setBio] = useState('')
  const [done, setDone] = useState(false)
  const [touched, setTouched] = useState(false)
  const [mentor, setMentor] = useState('')
  const [students, setStudents] = useState('')
  const [photo, setPhoto] = useState('')
  const [media, setMedia] = useState<{ name: string; kind: 'image' | 'video'; url: string }[]>([])

  const otherEmpty = facNotListed && !facOther.trim()

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadErr('')
    const up = await uploadMedia(file)
    if (!up) {
      setUploadErr(ui.uploadFailed)
      return
    }
    setPhoto(up.url)
  }
  const onMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    setUploadErr('')
    for (const f of files) {
      const up = await uploadMedia(f)
      if (!up) {
        setUploadErr(ui.uploadFailed)
        continue
      }
      setMedia((prev) => [...prev, { name: up.name, kind: up.kind, url: up.url }])
    }
  }

  const submit = () => {
    if (!name.trim() || otherEmpty) {
      setTouched(true)
      return
    }
    addSubmission({
      name: { ru: name.trim() },
      year: year.trim() ? Number(year.trim()) || null : null,
      fac: facNotListed ? facOther.trim() : facId,
      spec: spec.trim(),
      pos: pos.trim(),
      bio: bio.trim(),
      mentor: mentor.trim() || undefined,
      students: students.trim() || undefined,
      photoUrl: photo || undefined,
      media: media.map((m) => ({ name: m.name, kind: m.kind, url: m.url })),
    })
    setDone(true)
  }

  const reset = () => {
    setName('')
    setContact('')
    setFacId(FAC[0].id)
    setFacOther('')
    setFacNotListed(false)
    setYear('')
    setSpec('')
    setPos('')
    setBio('')
    setMentor('')
    setStudents('')
    setPhoto('')
    setMedia([])
    setUploadErr('')
    setTouched(false)
    setDone(false)
  }

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
    boxSizing: 'border-box',
  }
  const textareaStyle: CSSProperties = { ...inputStyle, resize: 'vertical' }
  const selectStyle: CSSProperties = { ...inputStyle, cursor: 'pointer', appearance: 'none' }
  const fieldLabel: CSSProperties = {
    fontSize: 'var(--t-xs)',
    fontWeight: 700,
    color: 'var(--c-ink2)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '.05em',
  }

  // On a kiosk the whole application is filled on the visitor's phone: show a
  // single, centred QR code that opens this same form on their smartphone.
  if (narrow) {
    return (
      <div
        style={{
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '36px var(--pad) 44px',
          animation: 'fadeUp .4s ease',
        }}
      >
        <h1
          style={{
            fontFamily: 'Lora, serif',
            fontWeight: 700,
            color: 'var(--c-ink)',
            fontSize: 'var(--t-2xl)',
            lineHeight: 1.1,
            margin: '0 0 12px',
          }}
        >
          {ui.applyQrTitle}
        </h1>
        <p style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-base)', lineHeight: 1.55, margin: '0 0 30px', maxWidth: 460 }}>
          {ui.applyQrDesc}
        </p>
        <div
          style={{
            background: '#fff',
            padding: 26,
            borderRadius: 'var(--r-lg)',
            border: 'var(--bw) solid var(--c-line)',
            borderTop: '4px solid var(--c-primary)',
            boxShadow: 'var(--shadow)',
            lineHeight: 0,
          }}
        >
          <QRCodeSVG value={UPLOAD_URL} size={236} bgColor="#ffffff" fgColor="#0a1830" level="M" />
        </div>
        <div style={{ marginTop: 20, color: 'var(--c-ink2)', fontSize: 'var(--t-sm)', fontWeight: 600 }}>
          {UPLOAD_URL.replace(/^https?:\/\//, '')}
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ animation: 'fadeUp .4s ease', padding: '40px var(--pad) 48px' }}>
        <div
          style={{
            maxWidth: 560,
            margin: '0 auto',
            textAlign: 'center',
            background: 'var(--c-surface)',
            border: 'var(--bw) solid var(--c-line)',
            borderRadius: 'var(--r-lg)',
            padding: '40px 28px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              margin: '0 auto 20px',
              borderRadius: '50%',
              background: 'linear-gradient(140deg, #2bb673, #1f8a5b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 34,
            }}
          >
            ✓
          </div>
          <h1
            style={{
              fontFamily: 'Lora, serif',
              fontWeight: 700,
              color: 'var(--c-ink)',
              fontSize: 'var(--t-xl)',
              margin: '0 0 10px',
            }}
          >
            {ui.applySuccess}
          </h1>
          <p style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-base)', lineHeight: 1.6, margin: '0 0 24px' }}>
            {ui.applySuccessSub}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={reset} style={primaryBtn}>
              {ui.applyAnother}
            </button>
            <button onClick={() => go({ name: 'home' })} style={ghostBtn}>
              {ui.back}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeUp .4s ease', padding: '22px var(--pad) 40px' }}>
      <h1
        style={{
          fontFamily: 'Lora, serif',
          fontWeight: 700,
          color: 'var(--c-ink)',
          fontSize: 'var(--t-2xl)',
          margin: '0 0 6px',
        }}
      >
        {ui.applyTitle}
      </h1>
      <p style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-base)', margin: '0 0 22px', maxWidth: 640 }}>
        {ui.applySub}
      </p>

      <div
        style={{
          background: 'var(--c-surface)',
          border: 'var(--bw) solid var(--c-line)',
          borderRadius: 'var(--r-lg)',
          padding: 24,
          boxShadow: 'var(--shadow)',
          maxWidth: 720,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div>
          <div style={fieldLabel}>{ui.applyName} *</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => kbCtx?.focus(setName)}
            placeholder="Айдос Серикулы Жумабеков"
            style={{
              ...inputStyle,
              borderColor: touched && !name.trim() ? '#c2410c' : 'var(--c-line)',
            }}
          />
          {touched && !name.trim() && (
            <div style={{ color: '#c2410c', fontSize: 'var(--t-2xs)', fontWeight: 600, marginTop: 6 }}>
              {ui.applyRequired}
            </div>
          )}
        </div>

        <div>
          <div style={fieldLabel}>{ui.applyFaculty}</div>
          {!facNotListed && (
            <div style={{ position: 'relative' }}>
              <select
                value={facId}
                onChange={(e) => {
                  setFacId(e.target.value)
                  setTouched(false)
                }}
                style={selectStyle}
              >
                {FAC.map((f) => (
                  <option key={f.id} value={f.id}>
                    {L(f.name)}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'var(--c-ink2)',
                  fontSize: 11,
                }}
              >
                ▼
              </span>
            </div>
          )}

          {/* Dedicated "my faculty isn't listed" path — a clear toggle that
              swaps the dropdown for a free-text input. */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              marginTop: 10,
              cursor: 'pointer',
              color: 'var(--c-ink)',
              fontSize: 'var(--t-sm)',
              fontWeight: 600,
            }}
          >
            <input
              type="checkbox"
              checked={facNotListed}
              onChange={(e) => {
                setFacNotListed(e.target.checked)
                setTouched(false)
              }}
              style={{ width: 18, height: 18, accentColor: 'var(--c-primary)', cursor: 'pointer', flex: '0 0 auto' }}
            />
            {ui.applyFacNotListed}
          </label>

          {facNotListed && (
            <div style={{ marginTop: 10 }}>
              <input
                value={facOther}
                onChange={(e) => setFacOther(e.target.value)}
                onFocus={() => kbCtx?.focus(setFacOther)}
                placeholder={ui.applyFacOtherPh}
                autoFocus
                style={{
                  ...inputStyle,
                  borderColor: touched && otherEmpty ? '#c2410c' : 'var(--c-line)',
                }}
              />
              {touched && otherEmpty && (
                <div style={{ color: '#c2410c', fontSize: 'var(--t-2xs)', fontWeight: 600, marginTop: 6 }}>
                  {ui.applyRequired}
                </div>
              )}
              <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-2xs)', marginTop: 6, lineHeight: 1.5 }}>
                {ui.applyFacOtherHint}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 110 }}>
            <div style={fieldLabel}>{ui.formYear}</div>
            <input value={year} onChange={(e) => setYear(e.target.value)} onFocus={() => kbCtx?.focus(setYear)} placeholder="2014" style={inputStyle} />
          </div>
          <div style={{ flex: 2, minWidth: 150 }}>
            <div style={fieldLabel}>{ui.formSpecialty}</div>
            <input value={spec} onChange={(e) => setSpec(e.target.value)} onFocus={() => kbCtx?.focus(setSpec)} style={inputStyle} />
          </div>
        </div>

        <div>
          <div style={fieldLabel}>{ui.formPosition}</div>
          <input value={pos} onChange={(e) => setPos(e.target.value)} onFocus={() => kbCtx?.focus(setPos)} style={inputStyle} />
        </div>

        <div>
          <div style={fieldLabel}>{ui.applyContact}</div>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            onFocus={() => kbCtx?.focus(setContact)}
            placeholder="name@example.com"
            style={inputStyle}
          />
        </div>

        <div>
          <div style={fieldLabel}>{ui.formBio}</div>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} onFocus={() => kbCtx?.focus(setBio)} rows={4} style={textareaStyle} />
        </div>

        {/* Profile photo (3:4) */}
        <div>
          <div style={fieldLabel}>{ui.applyPhoto}</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 150,
                aspectRatio: '3 / 4',
                borderRadius: 10,
                overflow: 'hidden',
                border: 'var(--bw) solid var(--c-line)',
                background: 'var(--c-bg2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '0 0 auto',
                color: 'var(--c-ink2)',
              }}
            >
              {photo
                ? <img src={mediaSrc(photo)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                : <Icon name="image" size={26} />
              }
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ ...ghostBtn, cursor: 'pointer', display: 'inline-block' }}>
                <input type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />
                {ui.applyPhotoBtn}
              </label>
              <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-2xs)', lineHeight: 1.5 }}>
                {ui.applyPhotoHint}
              </div>
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
                    padding: 0,
                    textAlign: 'left',
                    fontFamily: 'Manrope, sans-serif',
                  }}
                >
                  {ui.applyRemove}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Media upload */}
        <div>
          <div style={fieldLabel}>{ui.applyMedia}</div>
          <label style={{ ...ghostBtn, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="file" accept="image/*,video/*" multiple onChange={onMedia} style={{ display: 'none' }} />
            <Icon name="plus" size={16} /> {ui.applyMediaBtn}
          </label>
          {uploadErr && (
            <div style={{ color: '#c2410c', fontSize: 'var(--t-2xs)', fontWeight: 600, marginTop: 8 }}>{uploadErr}</div>
          )}
          {media.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {media.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
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
                  {m.kind === 'image'
                    ? <img src={mediaSrc(m.url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <Icon name="play" size={20} />
                  }
                  <button
                    onClick={() => setMedia((prev) => prev.filter((_, j) => j !== idx))}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,.55)',
                      color: '#fff',
                      border: 'none',
                      fontSize: 11,
                      lineHeight: '18px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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

        {/* Scientific continuity */}
        <div>
          <div style={{ ...fieldLabel, marginBottom: 12 }}>{ui.applyContinuity}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={fieldLabel}>{ui.applyMentor}</div>
              <input
                value={mentor}
                onChange={(e) => setMentor(e.target.value)}
                onFocus={() => kbCtx?.focus(setMentor)}
                placeholder="Профессор Сериков А.Қ."
                style={inputStyle}
              />
            </div>
            <div>
              <div style={fieldLabel}>{ui.applyStudents}</div>
              <input
                value={students}
                onChange={(e) => setStudents(e.target.value)}
                onFocus={() => kbCtx?.focus(setStudents)}
                placeholder="ФИО через запятую"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
            borderTop: 'var(--bw) solid var(--c-line)',
            paddingTop: 18,
          }}
        >
          <button onClick={submit} style={primaryBtn}>
            {ui.applySubmit}
          </button>
          <span style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-2xs)', fontWeight: 600 }}>
            {ui.applySub}
          </span>
        </div>
      </div>
    </div>
  )
}

const primaryBtn: CSSProperties = {
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
}
const ghostBtn: CSSProperties = {
  background: 'var(--c-bg2)',
  color: 'var(--c-ink)',
  border: 'var(--bw) solid var(--c-line)',
  borderRadius: 11,
  padding: '12px 22px',
  fontSize: 'var(--t-sm)',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Manrope, sans-serif',
}
