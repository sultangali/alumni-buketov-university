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

// ---- gradient builders -----------------------------------------------------

/** Card / featured-dot avatar gradient. */
export const cardGrad = (accent: string): string =>
  `linear-gradient(150deg,${accent}, color-mix(in srgb,${accent} 55%, #0a1830))`

/** Large profile-header gradient. */
export const profileGrad = (accent: string): string =>
  `linear-gradient(155deg,${accent}, color-mix(in srgb,${accent} 50%, #0a1424))`

/** Small round people-avatar gradient (mentors / students / mod rows). */
export const avGrad = (accent: string): string =>
  `linear-gradient(150deg,${accent}, color-mix(in srgb,${accent} 55%, #0a1424))`

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
    .map((m, i) => {
      const hue = 47 + i * 23
      return {
        grad: `linear-gradient(150deg, hsl(${hue % 360} 42% ${34 + i * 4}%), hsl(${(hue + 40) % 360} 38% 22%))`,
        label: m.name || `${L(labels)} · ${i + 1}`,
        icon: m.kind === 'video' ? 'play' : 'image',
        url: m.url,
        kind: m.kind,
      }
    })
}

/** Deterministic placeholder gallery, seeded per screen type (faculty=2,
 *  department=5, alumni=9), exactly as the prototype generated it. */
export function gallery(L: Localize, seed: number): GalleryTile[] {
  const labels: Loc = { ru: 'Архив', kz: 'Мұрағат', en: 'Archive' }
  const out: GalleryTile[] = []
  for (let i = 0; i < 6; i++) {
    const hue = seed * 47 + i * 23
    out.push({
      grad: `linear-gradient(150deg, hsl(${hue % 360} 42% ${34 + i * 4}%), hsl(${(hue + 40) % 360} 38% 22%))`,
      label: `${L(labels)} · ${1972 + seed * 7 + i * 5}`,
      icon: i % 3 === 0 ? 'play' : 'image',
    })
  }
  return out
}

// ---- status & tag styling --------------------------------------------------

const STATUS: Record<string, { l: Loc; c: string; b: string }> = {
  published: { l: { ru: 'Опубликовано', kz: 'Жарияланған', en: 'Published' }, c: '#1f8a5b', b: 'rgba(31,138,91,.14)' },
  draft: { l: { ru: 'Черновик', kz: 'Жоба', en: 'Draft' }, c: '#8a7a4a', b: 'rgba(138,122,74,.16)' },
  review: { l: { ru: 'На проверке', kz: 'Тексеруде', en: 'In review' }, c: '#c2820f', b: 'rgba(194,130,15,.16)' },
  active: { l: { ru: 'Активен', kz: 'Белсенді', en: 'Active' }, c: '#1f8a5b', b: 'rgba(31,138,91,.14)' },
  pending: { l: { ru: 'Ожидает', kz: 'Күтуде', en: 'Pending' }, c: '#c2820f', b: 'rgba(194,130,15,.16)' },
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
      background: x.b,
      color: x.c,
      borderRadius: '999px',
      padding: '4px 11px',
      fontSize: 'var(--t-2xs)',
      fontWeight: 700,
      whiteSpace: 'nowrap',
    },
  }
}

const TAG: Record<string, string> = {
  create: '#1f8a5b',
  publish: '#1E50A0',
  edit: '#8a7a4a',
  media: '#7A5CCB',
  admin: '#c2820f',
  review: '#2e8b7a',
}
export const tagMeta = (k: string): string => TAG[k] || '#586079'

// ---- shared button-style helpers ------------------------------------------

/** Pill segment (language / theme / media toggles). */
export const seg = (narrow: boolean, active: boolean): CSSProperties => ({
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'Manrope, sans-serif',
  fontWeight: 700,
  borderRadius: '999px',
  padding: narrow ? '6px 10px' : '7px 13px',
  fontSize: 'var(--t-xs)',
  background: active ? 'var(--c-primary)' : 'transparent',
  color: active ? '#fff' : 'var(--c-ink2)',
  transition: 'all .15s ease',
})

/** Outer demo-shell tab (kiosk / browser). */
export const tabSeg = (active: boolean): CSSProperties => ({
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'Manrope, sans-serif',
  fontWeight: 700,
  borderRadius: '999px',
  padding: '9px 16px',
  fontSize: '12.5px',
  background: active ? '#2F6BD0' : 'transparent',
  color: active ? '#fff' : '#8493ad',
  transition: 'all .15s ease',
  whiteSpace: 'nowrap',
})

/** Panel tab (moderator / admin sections). */
export const ptab = (active: boolean): CSSProperties => ({
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'Manrope, sans-serif',
  fontWeight: 700,
  borderRadius: '10px',
  padding: '10px 16px',
  fontSize: 'var(--t-sm)',
  background: active ? 'var(--c-primary)' : 'transparent',
  color: active ? '#fff' : 'var(--c-ink2)',
  transition: 'all .15s ease',
  whiteSpace: 'nowrap',
})

/** Year filter chip (department screen). */
export const chipStyle = (active: boolean): CSSProperties => ({
  border: `var(--bw) solid ${active ? 'var(--c-primary)' : 'var(--c-line)'}`,
  cursor: 'pointer',
  fontFamily: 'Manrope, sans-serif',
  fontWeight: 700,
  borderRadius: '999px',
  padding: '7px 15px',
  fontSize: 'var(--t-xs)',
  background: active ? 'var(--c-primary)' : 'var(--c-bg2)',
  color: active ? '#fff' : 'var(--c-ink2)',
  transition: 'all .15s ease',
})
