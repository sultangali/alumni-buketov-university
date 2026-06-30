import { useState, type CSSProperties, type ReactNode } from 'react'
import { useApp } from '../AppContext'
import { TEACH } from '../data/records'
import { alu, avGrad, fac, gallery, initials, mediaGallery, person, profileGrad, seg, type GalleryTile } from '../lib/logic'
import { mediaSrc } from '../lib/api'
import type { PersonKind, Route } from '../types'
import { Icon, type IconName } from '../components/icons'

interface Linked {
  name: string
  sub: string
  initials: string
  accent: string
  open: (() => void) | null
}

const GALLERY_SEED: Record<PersonKind, number> = {
  alumnus: 9,
  teacher: 11,
  laureate: 13,
  veteran: 15,
}

export function Profile({ id }: { id: string }) {
  const { narrow, ui, L, go, media, setMedia } = useApp()
  const [lightbox, setLightbox] = useState<number | null>(null)
  const p = person(id)
  if (!p) return null

  const f = fac(p.fac)
  const open = (r: Route) => () => go(r)

  const resolveLinked = (pid: string): Linked | null => {
    const al = alu(pid)
    if (al)
      return {
        name: L(al.name),
        sub: L(al.pos),
        initials: initials(al.name),
        accent: al.accent,
        open: open({ name: 'alumni', id: al.id }),
      }
    const t = TEACH[pid]
    if (t)
      return {
        name: L(t.name),
        sub: L(t.role),
        initials: initials(t.name),
        accent: '#A9802F',
        open: t.id ? open({ name: 'alumni', id: t.id }) : null,
      }
    return null
  }

  const mentors = (p.mentors || []).map(resolveLinked).filter((x): x is Linked => Boolean(x))
  const students = (p.students || [])
    .map((sid): Linked | null => {
      const al = alu(sid)
      return al
        ? {
            name: L(al.name),
            sub: String(al.year),
            initials: initials(al.name),
            accent: al.accent,
            open: open({ name: 'alumni', id: al.id }),
          }
        : null
    })
    .filter((x): x is Linked => Boolean(x))

  const awards = (p.awards || []).map(L)
  // Prefer the record's real uploaded media; fall back to the deterministic
  // placeholder gallery for seeded records that have none.
  const uploaded = (p.media || []).filter((m) => m.url)
  const allTiles = uploaded.length ? mediaGallery(L, uploaded) : gallery(L, GALLERY_SEED[p.kind])
  // one media set, split into the active tab: 'play' tiles are videos, the rest photos
  const tiles = allTiles.filter((g) => (g.icon === 'play') === (media === 'videos'))
  const pill = p.badge ? L(p.badge) : String(p.year)

  const pbtn: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 13,
    background: 'var(--c-surface)',
    border: 'var(--bw) solid var(--c-line)',
    borderRadius: 'var(--r)',
    padding: '12px 14px',
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
    boxShadow: 'var(--shadow)',
    transition: 'transform .15s ease',
    textAlign: 'left',
  }
  const pav = (ac: string): CSSProperties => ({
    width: 46,
    height: 46,
    flex: '0 0 auto',
    borderRadius: '50%',
    background: avGrad(ac),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 16,
  })

  const heroTag: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,255,255,.16)',
    border: '1px solid rgba(255,255,255,.28)',
    borderRadius: 'var(--r)',
    padding: '6px 12px',
    fontSize: 'var(--t-xs)',
    fontWeight: 600,
    color: '#fff',
    backdropFilter: 'blur(4px)',
  }

  // ink chip used in the desktop (photo-left) header
  const infoTag: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--c-bg2)',
    border: 'var(--bw) solid var(--c-line)',
    borderRadius: 'var(--r)',
    padding: '6px 12px',
    fontSize: 'var(--t-xs)',
    fontWeight: 600,
    color: 'var(--c-ink2)',
  }

  // Profile photo: real uploaded image when present, else a monogram block
  // (large faint initials + soft highlight).
  const photoBg = (mono: number) =>
    p.photoUrl ? (
      <img
        src={mediaSrc(p.photoUrl)}
        alt={L(p.name)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
    ) : (
      <>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: mono, color: 'rgba(255,255,255,.17)', lineHeight: 1 }}>
            {initials(p.name)}
          </span>
        </div>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 16%, rgba(255,255,255,.18), transparent 55%)' }} />
      </>
    )

  const renderLinked = (x: Linked, withClassOf: boolean, key: number) => (
    <button key={key} className="press" onClick={x.open ?? undefined} style={pbtn}>
      <div style={pav(x.accent)}>{x.initials}</div>
      <div style={{ textAlign: 'left', minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            color: 'var(--c-ink)',
            fontSize: 'var(--t-base)',
          }}
        >
          {x.name}
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
          {withClassOf ? `${ui.classOf} ${x.sub}` : x.sub}
        </div>
      </div>
    </button>
  )

  return (
    <div style={{ animation: 'fadeUp .45s ease' }}>
      {narrow ? (
        /* kiosk / mobile: full-width 3:4 photo with the name overlaid on a transparent→dark scrim */
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '3 / 4',
            background: profileGrad(p.accent),
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          {photoBg(180)}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 22%, rgba(8,14,26,.5) 56%, rgba(8,14,26,.95))',
            }}
          />
          <div style={{ position: 'relative', padding: 'var(--pad)', color: '#fff' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 12px',
                borderRadius: 'var(--r)',
                background: 'rgba(255,255,255,.16)',
                border: '1px solid rgba(255,255,255,.32)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 'var(--t-xs)',
                marginBottom: 12,
                backdropFilter: 'blur(4px)',
              }}
            >
              ✦ {pill}
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: '#fff',
                fontSize: 'var(--t-2xl)',
                margin: '0 0 8px',
                lineHeight: 1.06,
                textShadow: '0 2px 22px rgba(0,0,0,.45)',
              }}
            >
              {L(p.name)}
            </h1>
            <div style={{ color: 'rgba(255,255,255,.96)', fontSize: 'var(--t-md)', fontWeight: 600, marginBottom: 4 }}>
              {L(p.pos)}
            </div>
            {p.org && (
              <div style={{ color: 'rgba(255,255,255,.82)', fontSize: 'var(--t-sm)', marginBottom: p.meta ? 2 : 14 }}>
                {L(p.org)}
              </div>
            )}
            {p.meta && (
              <div style={{ color: 'rgba(255,255,255,.82)', fontSize: 'var(--t-xs)', fontWeight: 600, marginBottom: 14 }}>
                {L(p.meta)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {p.spec && <span style={heroTag}><Icon name="cap" size={14} /> {L(p.spec)}</span>}
              {f && <span style={heroTag}><Icon name="building" size={14} /> {L(f.name)}</span>}
            </div>
          </div>
        </div>
      ) : (
        /* desktop: 3:4 photo on the left, data column on the right */
        <div style={{ display: 'flex', gap: 28, alignItems: 'stretch', padding: '24px var(--pad) 0' }}>
          <div
            style={{
              position: 'relative',
              width: 300,
              flex: '0 0 auto',
              aspectRatio: '3 / 4',
              background: profileGrad(p.accent),
              borderRadius: 'var(--r-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow)',
            }}
          >
            {photoBg(160)}
          </div>
          <div style={{ flex: 1, minWidth: 0, alignSelf: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 12px',
                borderRadius: 'var(--r)',
                background: 'color-mix(in srgb, var(--c-gold) 16%, transparent)',
                border: 'var(--bw) solid color-mix(in srgb, var(--c-gold) 40%, transparent)',
                color: 'var(--c-gold)',
                fontWeight: 700,
                fontSize: 'var(--t-xs)',
                marginBottom: 12,
              }}
            >
              ✦ {pill}
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--c-ink)',
                fontSize: 'var(--t-2xl)',
                margin: '0 0 10px',
                lineHeight: 1.08,
              }}
            >
              {L(p.name)}
            </h1>
            <div style={{ color: 'var(--c-ink)', fontSize: 'var(--t-md)', fontWeight: 600, marginBottom: 4 }}>
              {L(p.pos)}
            </div>
            {p.org && (
              <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-sm)', marginBottom: p.meta ? 2 : 14 }}>
                {L(p.org)}
              </div>
            )}
            {p.meta && (
              <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-xs)', fontWeight: 600, marginBottom: 14 }}>
                {L(p.meta)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {p.spec && <span style={infoTag}><Icon name="cap" size={14} /> {L(p.spec)}</span>}
              {f && <span style={infoTag}><Icon name="building" size={14} /> {L(f.name)}</span>}
            </div>
          </div>
        </div>
      )}

      {p.highlight && (
        <div style={{ padding: '22px var(--pad) 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              background: 'color-mix(in srgb, var(--c-gold) 10%, var(--c-surface))',
              border: 'var(--bw) solid color-mix(in srgb, var(--c-gold) 38%, transparent)',
              borderRadius: 'var(--r)',
              padding: '14px 16px',
            }}
          >
            <span style={{ color: 'var(--c-gold)', fontSize: 'var(--t-xl)' }}>★</span>
            <span style={{ color: 'var(--c-ink)', fontSize: 'var(--t-base)', fontWeight: 700 }}>
              {L(p.highlight)}
            </span>
          </div>
        </div>
      )}

      <div style={{ padding: '24px var(--pad) 0' }}>
        <Heading mb={10}>{ui.biography}</Heading>
        <p
          style={{
            color: 'var(--c-ink2)',
            fontSize: 'var(--t-base)',
            lineHeight: 1.65,
            margin: 0,
            maxWidth: 760,
            textWrap: 'pretty',
          }}
        >
          {L(p.bio)}
        </p>
      </div>

      {awards.length > 0 && (
        <div style={{ padding: '24px var(--pad) 0' }}>
          <Heading>{ui.awards}</Heading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {awards.map((w, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                  background: 'var(--c-surface)',
                  border: 'var(--bw) solid var(--c-line)',
                  borderLeft: '3px solid var(--c-gold)',
                  borderRadius: 'var(--r)',
                  padding: '13px 16px',
                }}
              >
                <span style={{ color: 'var(--c-gold)', display: 'flex', alignItems: 'center' }}><Icon name="medal" size={16} /></span>
                <span style={{ color: 'var(--c-ink)', fontSize: 'var(--t-base)', fontWeight: 600 }}>
                  {w}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '24px var(--pad) 0' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={() => { setMedia('photos'); setLightbox(null) }} style={seg(narrow, media === 'photos')}>
            {ui.photos}
          </button>
          <button onClick={() => { setMedia('videos'); setLightbox(null) }} style={seg(narrow, media === 'videos')}>
            {ui.videos}
          </button>
        </div>
        {tiles.length === 0 ? (
          <div style={{ padding: '24px 0', color: 'var(--c-ink2)', fontSize: 'var(--t-sm)' }}>{ui.noResults}</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 10,
            }}
          >
            {tiles.map((g, i) => (
              <button
                key={i}
                className="lift"
                onClick={() => setLightbox(i)}
                style={{
                  position: 'relative',
                  aspectRatio: '4 / 3',
                  borderRadius: 'var(--r)',
                  overflow: 'hidden',
                  background: g.grad,
                  cursor: 'pointer',
                  border: 'var(--bw) solid var(--c-line)',
                  padding: 0,
                }}
              >
                {g.url && g.kind === 'image' && (
                  <img src={mediaSrc(g.url)} alt={g.label} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                {g.url && g.kind === 'video' && (
                  <video src={mediaSrc(g.url)} muted playsInline preload="metadata" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,.9)',
                    // For real photos, only overlay the play badge on videos.
                    ...(g.url && g.kind === 'image' ? { display: 'none' } : null),
                    ...(g.url && g.kind === 'video' ? { background: 'rgba(0,0,0,.25)' } : null),
                  }}
                >
                  <Icon name={g.icon as IconName} size={26} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox !== null && (
        <Lightbox tiles={tiles} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />
      )}

      {(mentors.length > 0 || students.length > 0) && (
        <div style={{ padding: '26px var(--pad) 34px' }}>
          <Heading mb={6}>{ui.mentorStudent}</Heading>
          <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-xs)', fontWeight: 600, marginBottom: 14 }}>
            {ui.mentorStudentSub}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 'var(--gap-card)',
            }}
          >
            {mentors.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 'var(--t-xs)',
                    fontWeight: 700,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    color: 'var(--c-gold)',
                    marginBottom: 10,
                  }}
                >
                  {ui.mentors}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {mentors.map((x, i) => renderLinked(x, false, i))}
                </div>
              </div>
            )}
            {students.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 'var(--t-xs)',
                    fontWeight: 700,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    color: 'var(--c-primary)',
                    marginBottom: 10,
                  }}
                >
                  {ui.students}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {students.map((x, i) => renderLinked(x, true, i))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!(mentors.length > 0 || students.length > 0) && <div style={{ height: 34 }} />}
    </div>
  )
}

function Heading({ children, mb = 12 }: { children: ReactNode; mb?: number }) {
  return (
    <h2
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        color: 'var(--c-ink)',
        fontSize: 'var(--t-lg)',
        margin: `0 0 ${mb}px`,
      }}
    >
      {children}
    </h2>
  )
}

// Full-screen media viewer with prev/next and a thumbnail strip of all items.
function Lightbox({ tiles, index, onClose, onIndex }: { tiles: GalleryTile[]; index: number; onClose: () => void; onIndex: (n: number) => void }) {
  const t = tiles[index]
  if (!t) return null
  const step = (d: number) => onIndex((index + d + tiles.length) % tiles.length)
  const navBtn: CSSProperties = {
    flex: '0 0 auto',
    background: 'transparent',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    padding: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.6))',
  }
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,9,15,.93)', display: 'flex', flexDirection: 'column', animation: 'fadeIn .25s ease' }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        aria-label="close"
        style={{ position: 'absolute', top: 14, right: 14, zIndex: 2, background: 'transparent', border: 'none', color: '#fff', fontSize: 26, lineHeight: 1, cursor: 'pointer', padding: 8 }}
      >
        ✕
      </button>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '52px 4px 8px' }}>
        <button onClick={(e) => { e.stopPropagation(); step(-1) }} aria-label="prev" style={navBtn}><Icon name="chevronLeft" size={40} /></button>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'relative', flex: 1, maxWidth: 'min(92%, 900px)', maxHeight: '100%', aspectRatio: '4 / 3', borderRadius: 16, overflow: 'hidden', background: t.grad, boxShadow: '0 30px 90px rgba(0,0,0,.6)' }}
        >
          {t.url && t.kind === 'image' && (
            <img src={mediaSrc(t.url)} alt={t.label} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#05090f' }} />
          )}
          {t.url && t.kind === 'video' && (
            <video src={mediaSrc(t.url)} controls autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#05090f' }} />
          )}
          {!t.url && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.92)' }}>
              <Icon name={t.icon as IconName} size={72} />
            </div>
          )}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 20px', background: 'linear-gradient(transparent, rgba(0,0,0,.6))', color: '#fff', fontSize: 'var(--t-sm)', fontWeight: 600 }}>
            {t.label}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); step(1) }} aria-label="next" style={navBtn}><Icon name="chevronRight" size={40} /></button>
      </div>
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', padding: '8px 12px 22px' }}>
        {tiles.map((th, k) => (
          <button
            key={k}
            onClick={() => onIndex(k)}
            aria-label={`item ${k + 1}`}
            style={{ position: 'relative', width: 60, height: 46, flex: '0 0 auto', borderRadius: 8, overflow: 'hidden', background: th.grad, border: k === index ? '2px solid #fff' : '2px solid transparent', opacity: k === index ? 1 : 0.55, cursor: 'pointer', padding: 0 }}
          >
            {th.url && th.kind === 'image' && (
              <img src={mediaSrc(th.url)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            {th.url && th.kind === 'video' && (
              <video src={mediaSrc(th.url)} muted playsInline preload="metadata" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.85)', ...(th.url && th.kind === 'image' ? { display: 'none' } : null) }}>
              <Icon name={th.icon as IconName} size={14} />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
