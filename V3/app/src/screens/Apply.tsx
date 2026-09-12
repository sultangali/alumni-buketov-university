import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useApp } from '../AppContext'
import { FAC } from '../data/records'
import { mediaSrc, apiCreateHandoff, apiReadHandoff, apiSubmitHandoff } from '../lib/api'
import { isNativeKiosk, nativeRequest, newSubmissionId, type KioskStatus } from '../lib/kiosk'
import { useOptionalKeyboard } from '../kiosk/keyboard'
import { Icon } from '../components/icons'

// On a kiosk the visitor can't attach files — they scan this to finish the
// photo/media upload (profile photo auto-cropped to 3:4) from their phone.
// Same server on a LAN; an explicit public URL can be configured when reachable.
const phoneToken = () => new URLSearchParams(window.location.hash.slice(1)).get('handoff') || ''

export function Apply() {
  const { ui, L, go, addSubmission, narrow, uploadMedia, uploadsPending } = useApp()
  const kbCtx = useOptionalKeyboard()
  const [uploadErr, setUploadErr] = useState('')

  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [facId, setFacId] = useState('')
  const [facOther, setFacOther] = useState('')
  const [facNotListed, setFacNotListed] = useState(false)
  const [year, setYear] = useState('')
  const [spec, setSpec] = useState('')
  const [pos, setPos] = useState('')
  const [bio, setBio] = useState('')
  const [done, setDone] = useState(false)
  const [sending, setSending] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [kioskForm, setKioskForm] = useState(false)
  const [handoffToken, setHandoffToken] = useState(phoneToken)
  const [handoffReady, setHandoffReady] = useState(!handoffToken)
  const [handoffError, setHandoffError] = useState('')
  const [handoffUrl, setHandoffUrl] = useState('')
  const [handoffExpiry, setHandoffExpiry] = useState('')
  const [handoffBusy, setHandoffBusy] = useState(false)
  const [phoneAvailable, setPhoneAvailable] = useState(!isNativeKiosk() && !!import.meta.env.VITE_APPLY_URL)
  const [clientSubmissionId, setClientSubmissionId] = useState(newSubmissionId)
  const [touched, setTouched] = useState(false)
  const [mentor, setMentor] = useState('')
  const [students, setStudents] = useState('')
  const [photo, setPhoto] = useState('')
  const [media, setMedia] = useState<{ name: string; kind: 'image' | 'video'; url: string }[]>([])

  const otherEmpty = facNotListed && !facOther.trim()
  const draft = () => ({
    contact: contact.trim() || undefined, name: { ru: name.trim() },
    year: year.trim() ? Number(year.trim()) : null,
    fac: facNotListed ? facOther.trim() : facId, spec: spec.trim(), pos: pos.trim(), bio: bio.trim(),
    mentor: mentor.trim() || undefined, students: students.trim() || undefined,
    photoUrl: narrow ? undefined : photo || undefined,
    media: narrow ? [] : media.map(m => ({ name: m.name, kind: m.kind, url: m.url })),
  })

  useEffect(() => {
    if (!isNativeKiosk()) return
    let active = true
    const poll = () => nativeRequest<KioskStatus>('status').then(s => { if (active) setPhoneAvailable(s.online && !!s.publicOrigin) }).catch(() => { if (active) setPhoneAvailable(false) })
    void poll()
    const timer = setInterval(poll, 5000)
    return () => { active = false; clearInterval(timer) }
  }, [])
  useEffect(() => {
    if (!handoffToken || isNativeKiosk()) return
    let active = true
    apiReadHandoff(handoffToken).then(result => {
      if (!active) return
      const d = result.draft || {}
      setName(typeof d.name === 'string' ? d.name : d.name?.ru || '')
      setContact(d.contact || ''); setYear(d.year == null ? '' : String(d.year))
      const known = FAC.some(f => f.id === d.fac)
      setFacId(known ? d.fac : ''); setFacNotListed(!!d.fac && !known); setFacOther(known ? '' : d.fac || '')
      setSpec(d.spec || ''); setPos(d.pos || ''); setBio(d.bio || '')
      setMentor(d.mentor || ''); setStudents(d.students || '')
      setHandoffReady(true)
    }).catch(() => { if (active) setHandoffError(L({ru:'Ссылка недоступна или истекла. Начните новую заявку.',kz:'Сілтеме қолжетімсіз немесе мерзімі аяқталды. Жаңа өтінім бастаңыз.',en:'This link is unavailable or expired. Start a new application.'})) })
    return () => { active = false }
  }, [handoffToken])
  useEffect(() => {
    if (!handoffExpiry) return
    const timer = setTimeout(() => { setHandoffUrl(''); setHandoffExpiry('') }, Math.max(0, Date.parse(handoffExpiry) - Date.now()))
    return () => clearTimeout(timer)
  }, [handoffExpiry])
  const continueOnPhone = async () => {
    if (handoffBusy || sending) return
    setHandoffBusy(true); setSubmitError('')
    try {
      const result = await apiCreateHandoff(draft())
      if (!result.url || new URL(result.url).protocol !== 'https:') throw Error('Нет доступной ссылки')
      kbCtx?.blur()
      setHandoffUrl(result.url); setHandoffExpiry(result.expiresAt)
    } catch { setSubmitError(L({ru:'Продолжение на телефоне сейчас недоступно. Заполните заявку здесь.',kz:'Телефонда жалғастыру қазір қолжетімсіз. Өтінімді осында толтырыңыз.',en:'Phone continuation is unavailable. You can fill in the form here.'})) }
    finally { setHandoffBusy(false) }
  }

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

  const submit = async () => {
    if (sending || handoffBusy || uploadsPending || !handoffReady || handoffUrl) return
    if (!name.trim() || otherEmpty || (!facNotListed && !facId)) {
      setTouched(true)
      return
    }
    setSending(true)
    setSubmitError('')
    try {
    const body = { ...draft(), clientSubmissionId }
    if (handoffToken) await apiSubmitHandoff(handoffToken, body)
    else await addSubmission(body)
    kbCtx?.blur()
    setDone(true)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : ui.uploadFailed)
    } finally { setSending(false) }
  }

  const reset = () => {
    setClientSubmissionId(newSubmissionId())
    setHandoffToken(''); setHandoffReady(true); setHandoffError(''); setHandoffUrl(''); setHandoffExpiry('')
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    setName('')
    setContact('')
    setFacId(FAC[0]?.id ?? '')
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
    borderRadius: 'var(--r)',
    padding: '11px 14px',
    fontSize: 'var(--t-sm)',
    color: 'var(--c-ink)',
    fontFamily: 'var(--font-ui)',
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
  if (handoffError) return <div role="alert" style={{padding:32}}><p>{handoffError}</p><button onClick={reset} style={primaryBtn}>{L({ru:'Новая заявка',kz:'Жаңа өтінім',en:'New application'})}</button></div>
  if (!handoffReady) return <p role="status">{ui.loading}</p>
  if (handoffUrl) return <div style={{padding:32,textAlign:'center'}}>
    <h1>{L({ru:'Продолжите на телефоне',kz:'Телефонда жалғастырыңыз',en:'Continue on your phone'})}</h1>
    <QRCodeSVG value={handoffUrl} size={236}/>
    <p>{L({ru:'Отсканируйте код и завершите заявку с фотографиями. Отправлять эту анкету на киоске повторно не нужно.',kz:'Кодты сканерлеп, өтінімді фотосуреттермен аяқтаңыз. Киоскте қайта жіберудің қажеті жоқ.',en:'Scan to complete this application with photos. Do not submit it again on the kiosk.'})}</p>
    <button style={primaryBtn} onClick={() => { reset(); go({name:'home'}) }}>{L({ru:'Готово — очистить экран',kz:'Дайын — экранды тазарту',en:'Done — clear screen'})}</button>
  </div>
  if (narrow && !kioskForm) {
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
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: 'var(--c-ink)',
            fontSize: 'var(--t-2xl)',
            lineHeight: 1.1,
            margin: '0 0 12px',
          }}
        >
          {ui.applyTitle}
        </h1>
        <p style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-base)', lineHeight: 1.55, margin: '0 0 30px', maxWidth: 460 }}>
          {L({ru:'Выберите удобный способ подачи заявки.',kz:'Өтінім берудің ыңғайлы тәсілін таңдаңыз.',en:'Choose how you would like to apply.'})}
        </p>
        {phoneAvailable && <button style={primaryBtn} onClick={continueOnPhone} disabled={handoffBusy}>{L({ru:'Продолжить на телефоне — фото и видео',kz:'Телефонда жалғастыру — фото және бейне',en:'Continue on phone — photos and video'})}</button>}
        <div style={{ marginTop: 20, color: 'var(--c-ink2)', fontSize: 'var(--t-sm)', fontWeight: 600 }}>
          {submitError}
        </div>
        <p>{L({ru:'Здесь можно подать анкету без фотографии. Материалы можно добавить позднее с помощью модератора.',kz:'Мұнда фотосуретсіз өтінім беруге болады. Материалдарды кейін модератор көмегімен қосуға болады.',en:'Apply here without a photo. A moderator can help add media later.'})}</p>
        <button style={primaryBtn} onClick={() => setKioskForm(true)}>{L({ru: 'Заполнить здесь', kz: 'Осы жерде толтыру', en: 'Apply here'})}</button>
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
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--c-ink)',
              fontSize: 'var(--t-xl)',
              margin: '0 0 10px',
            }}
          >
            {isNativeKiosk() ? L({ru:'Заявка сохранена на киоске',kz:'Өтінім киоскте сақталды',en:'Application saved on this kiosk'}) : ui.applySuccess}
          </h1>
          <p style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-base)', lineHeight: 1.6, margin: '0 0 24px' }}>
            {isNativeKiosk() ? L({ru:'Отправим её автоматически при доступности сервера. Повторно заполнять не нужно.',kz:'Сервер қолжетімді болғанда автоматты түрде жібереміз. Қайта толтыру қажет емес.',en:'It will be sent automatically when the server is reachable. No need to submit again.'}) : ui.applySuccessSub}
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
          fontFamily: 'var(--font-display)',
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
          {touched && !facNotListed && !facId && <div role="alert" style={{ color: '#c2410c' }}>{ui.applyRequired}</div>}
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
                <option value="">{ui.applyFaculty}</option>
                {FAC.map((f) => (
                  <option key={f.id} value={f.id}>
                    {L(f.name)}
                  </option>
                ))}
              </select>
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

        {!narrow && <>
        {/* Profile photo (3:4) */}
        <div>
          <div style={fieldLabel}>{ui.applyPhoto}</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 150,
                aspectRatio: '3 / 4',
                borderRadius: 'var(--r)',
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
                    fontFamily: 'var(--font-ui)',
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

        </>}
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
          {submitError && <p role="alert" style={{color: '#b3261e'}}>{submitError}</p>}
          {narrow && phoneAvailable && <button style={ghostBtn} disabled={sending || handoffBusy} onClick={continueOnPhone}>{L({ru:'Продолжить с фото на телефоне',kz:'Телефонда фотомен жалғастыру',en:'Continue with photos on phone'})}</button>}
          <button onClick={submit} disabled={sending || handoffBusy || uploadsPending > 0} style={primaryBtn}>
            {sending || uploadsPending ? ui.loading : ui.applySubmit}
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
