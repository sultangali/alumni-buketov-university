import type { CSSProperties } from 'react'
import type { Alumnus, CollectionKind, Faculty, Lang, Loc, MediaItem, Person } from '../types'
import { ALU, FAC, LAUREATES, TEACHERS, VETERANS } from '../data/records'

// ---- localization ----------------------------------------------------------

/** Build a localizer bound to the active language. Mirrors the prototype's L(). */
export const makeL =
  (lang: Lang) =>
  (o?: Loc): string =>
    o ? o[lang] || o.ru || o.en || '' : ''

export type Localize = ReturnType<typeof makeL>

// ---- data lookups ----------------------------------------------------------

export const fac = (id: string): Faculty | undefined => FAC.find((f) => f.id === id)
export const dept = (fid: string, did: string) => fac(fid)?.depts.find((d) => d.id === did)
export const alu = (id: string): Alumnus | null => ALU.find((a) => a.id === id) ?? null
export const facAlumniCount = (f: Faculty): number => f.depts.reduce((s, d) => s + d.count, 0)
export const featList = (): Alumnus[] => ALU.filter((a) => a.featured)

/** Real alumni records belonging to a faculty (the browsable archive subset). */
export const facAlumni = (facId: string): Alumnus[] => ALU.filter((a) => a.fac === facId)

// ---- unified person model --------------------------------------------------

/** Normalize an alumnus into the unified `Person` shape. */
export const alumnusToPerson = (a: Alumnus): Person => ({
  id: a.id,
  kind: 'alumnus',
  fac: a.fac,
  year: a.year,
  accent: a.accent,
  video: a.video,
  name: a.name,
  pos: a.pos,
  org: a.org,
  spec: a.spec,
  bio: a.bio,
  awards: a.awards,
  mentors: a.mentors,
  students: a.students,
  photoUrl: a.photoUrl,
  media: a.media,
})

const CATEGORY_PEOPLE: Person[] = [...TEACHERS, ...LAUREATES, ...VETERANS]

/** Resolve any profile id (alumnus / teacher / laureate / veteran). */
export const person = (id: string): Person | null => {
  const a = alu(id)
  if (a) return alumnusToPerson(a)
  return CATEGORY_PEOPLE.find((p) => p.id === id) ?? null
}

/** The dataset backing a category collection. */
export const collectionPeople = (kind: CollectionKind): Person[] =>
  kind === 'teachers' ? TEACHERS : kind === 'laureates' ? LAUREATES : VETERANS

/** Two-letter initials from the RU (or EN) form of a localized name. */
export const initials = (o: Loc): string => {
  const n = (o.ru || o.en || '').trim().split(/\s+/)
  return ((n[0] || '')[0] || '') + ((n[1] || '')[0] || '')
}

/** Russian-locale thousands grouping, as used throughout the prototype. */
export const nf = (n: number): string => n.toLocaleString('ru-RU')

// ---- tonal block builders --------------------------------------------------
// Editorial avatars are calm tonal monogram blocks, not glossy gradients.
// Base dark is a deep blue near-black so every tile harmonises.

const EVER = '#0a1830'

/** Card / featured-dot avatar block. */
export const cardGrad = (accent: string): string =>
  `linear-gradient(160deg, color-mix(in srgb,${accent} 78%, ${EVER}), color-mix(in srgb,${accent} 40%, ${EVER}))`

/** Large profile-header block. */
export const profileGrad = (accent: string): string =>
  `linear-gradient(160deg, color-mix(in srgb,${accent} 72%, ${EVER}), color-mix(in srgb,${accent} 36%, ${EVER}))`

/** Small round people-avatar block (mentors / students / mod rows). */
export const avGrad = (accent: string): string =>
  `linear-gradient(160deg, color-mix(in srgb,${accent} 78%, ${EVER}), color-mix(in srgb,${accent} 42%, ${EVER}))`

// ---- gallery ---------------------------------------------------------------

export interface GalleryTile {
  grad: string
  label: string
  icon: string
  /** When set, the tile shows a real uploaded image/video, not a placeholder. */
  url?: string
  kind?: 'image' | 'video'
}

/** Real gallery tiles built from a record's uploaded media. */
export function mediaGallery(L: Localize, media: MediaItem[]): GalleryTile[] {
  const labels: Loc = { ru: 'Архив', kz: 'Мұрағат', en: 'Archive' }
  return media
    .filter((m) => m.url)
    .map((m, i) => ({
      grad: `linear-gradient(160deg, hsl(${210 + i * 7} 22% 22%), hsl(${214 + i * 7} 18% 14%))`,
      label: m.name || `${L(labels)} · ${i + 1}`,
      icon: m.kind === 'video' ? 'play' : 'image',
      url: m.url,
      kind: m.kind,
    }))
}

/** Deterministic placeholder gallery, seeded per screen type (faculty=2,
 *  department=5, alumni=9), exactly as the prototype generated it. */
export function gallery(L: Localize, seed: number): GalleryTile[] {
  const labels: Loc = { ru: 'Архив', kz: 'Мұрағат', en: 'Archive' }
  const out: GalleryTile[] = []
  for (let i = 0; i < 6; i++) {
    // Blue / slate / muted-gold family, low saturation — calm editorial tiles.
    const hue = 204 + ((seed * 23 + i * 9) % 34)
    out.push({
      grad: `linear-gradient(160deg, hsl(${hue} 22% ${26 + i * 3}%), hsl(${(hue + 24) % 360} 18% 16%))`,
      label: `${L(labels)} · ${1972 + seed * 7 + i * 5}`,
      icon: i % 3 === 0 ? 'play' : 'image',
    })
  }
  return out
}

// ---- status & tag styling --------------------------------------------------

const STATUS: Record<string, { l: Loc; c: string; b: string }> = {
  published: { l: { ru: 'Опубликовано', kz: 'Жарияланған', en: 'Published' }, c: '#1E5FA8', b: 'rgba(30,95,168,.12)' },
  draft: { l: { ru: 'Черновик', kz: 'Жоба', en: 'Draft' }, c: '#6B6A5C', b: 'rgba(107,106,92,.14)' },
  review: { l: { ru: 'На проверке', kz: 'Тексеруде', en: 'In review' }, c: '#9A6B16', b: 'rgba(154,107,22,.14)' },
  active: { l: { ru: 'Активен', kz: 'Белсенді', en: 'Active' }, c: '#1E5FA8', b: 'rgba(30,95,168,.12)' },
  pending: { l: { ru: 'Ожидает', kz: 'Күтуде', en: 'Pending' }, c: '#9A6B16', b: 'rgba(154,107,22,.14)' },
  suspended: { l: { ru: 'Заблокирован', kz: 'Бұғатталған', en: 'Suspended' }, c: '#b3261e', b: 'rgba(179,38,30,.12)' },
}

export interface StatusMeta {
  label: string
  style: CSSProperties
}

export function statusMeta(L: Localize, k: string): StatusMeta {
  const x = STATUS[k] || STATUS.draft
  return {
    label: L(x.l),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontFamily: 'var(--font-ui)',
      background: x.b,
      color: x.c,
      border: '1px solid color-mix(in srgb, currentColor 26%, transparent)',
      borderRadius: 'var(--r)',
      padding: '4px 10px',
      fontSize: 'var(--t-2xs)',
      fontWeight: 600,
      letterSpacing: '.01em',
      whiteSpace: 'nowrap',
    },
  }
}

const TAG: Record<string, string> = {
  create: '#1E5FA8',
  publish: '#1B5AA6',
  edit: '#6B6A5C',
  media: '#3F76B0',
  admin: '#9A6B16',
  review: '#2E7AB0',
}
export const tagMeta = (k: string): string => TAG[k] || '#5B6159'

// ---- shared button-style helpers ------------------------------------------

/** Pill segment (language / theme / media toggles). */
export const seg = (narrow: boolean, active: boolean): CSSProperties => ({
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
  fontWeight: 600,
  letterSpacing: '.02em',
  borderRadius: 'var(--r-pill)',
  padding: narrow ? '6px 11px' : '7px 14px',
  fontSize: 'var(--t-xs)',
  background: active ? 'var(--c-accent)' : 'transparent',
  color: active ? 'var(--c-on-accent)' : 'var(--c-ink2)',
  transition: 'all .15s ease',
})

/** Outer demo-shell tab (kiosk / browser). */
export const tabSeg = (active: boolean): CSSProperties => ({
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
  fontWeight: 600,
  letterSpacing: '.02em',
  borderRadius: 'var(--r-pill)',
  padding: '9px 16px',
  fontSize: '12.5px',
  background: active ? 'var(--c-accent)' : 'transparent',
  color: active ? 'var(--c-on-accent)' : 'var(--c-ink2)',
  transition: 'all .15s ease',
  whiteSpace: 'nowrap',
})

/** Panel tab (moderator / admin sections) — editorial underlined tab. */
export const ptab = (active: boolean): CSSProperties => ({
  border: 'none',
  borderBottom: `2px solid ${active ? 'var(--c-accent)' : 'transparent'}`,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
  fontWeight: 600,
  letterSpacing: '.01em',
  borderRadius: '0',
  padding: '10px 4px',
  marginRight: '6px',
  fontSize: 'var(--t-sm)',
  background: 'transparent',
  color: active ? 'var(--c-ink)' : 'var(--c-ink2)',
  transition: 'all .15s ease',
  whiteSpace: 'nowrap',
})

/** Year filter chip (department screen) — squared editorial chip. */
export const chipStyle = (active: boolean): CSSProperties => ({
  border: `var(--bw) solid ${active ? 'var(--c-accent)' : 'var(--c-line)'}`,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
  fontWeight: 600,
  letterSpacing: '.01em',
  borderRadius: 'var(--r)',
  padding: '7px 14px',
  fontSize: 'var(--t-xs)',
  background: active ? 'var(--c-accent)' : 'transparent',
  color: active ? 'var(--c-on-accent)' : 'var(--c-ink2)',
  transition: 'all .15s ease',
})
