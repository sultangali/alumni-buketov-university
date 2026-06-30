export type Lang = 'ru' | 'kz' | 'en'
export type Theme = 'light' | 'dark' | 'contrast'
export type Motion = 'full' | 'subtle' | 'off'
export type Preview = 'kiosk' | 'browser'

/** A localized string. Always carries `ru`; `kz`/`en` may be present. */
export type Loc = Partial<Record<Lang, string>>

export interface Dept {
  id: string
  est: number
  count: number
  grad: string
  name: Loc
  head: Loc
  hist: Loc
}

export interface Faculty {
  id: string
  est: number
  grad: string
  abbr: string
  name: Loc
  hist: Loc
  depts: Dept[]
}

/** An uploaded image or video attached to a profile. */
export interface MediaItem {
  name: string
  kind: 'image' | 'video'
  /** Served path/URL of the uploaded file (e.g. "/media/x.jpg"). */
  url?: string
}

export interface Alumnus {
  id: string
  fac: string
  dept: string
  year: number
  featured: boolean
  video: boolean
  accent: string
  name: Loc
  spec: Loc
  pos: Loc
  org: Loc
  bio: Loc
  awards: Loc[]
  mentors: string[]
  students: string[]
  /** Optional uploaded profile photo + gallery (staff-added records). */
  photoUrl?: string
  media?: MediaItem[]
  /** Authorship — staff account that created this record, and when (ISO). */
  createdBy?: string
  createdAt?: string
}

export interface Teacher {
  name: Loc
  role: Loc
  /** When set, the teacher also has an alumnus record to link to. */
  id?: string
}

/** The kind of person a profile / collection entry represents. */
export type PersonKind = 'alumnus' | 'teacher' | 'laureate' | 'veteran'

/**
 * A unified person record used by the generic profile screen and the
 * category collections (best teachers / scholars & laureates / veterans).
 * Alumni are normalized into this shape on the fly via `alumnusToPerson`.
 */
export interface Person {
  id: string
  kind: PersonKind
  fac: string
  year: number
  accent: string
  video?: boolean
  name: Loc
  pos: Loc
  org?: Loc
  spec?: Loc
  bio: Loc
  awards?: Loc[]
  /** Overrides the year pill (e.g. "Лучший преподаватель 2023"). */
  badge?: Loc
  /** Headline distinction — scholarship/prize name, honorary title. */
  highlight?: Loc
  /** Small secondary line (e.g. "На службе с 1978 · 44 года стажа"). */
  meta?: Loc
  /** Sub-filter key within a collection (e.g. 'scholarship' | 'prize'). */
  tag?: string
  /** Alumni-only continuity links. */
  mentors?: string[]
  students?: string[]
  /** Optional uploaded profile photo + gallery (staff-added records). */
  photoUrl?: string
  media?: MediaItem[]
}

/** A self-submitted alumni application awaiting moderation. */
export interface Submission {
  id: string
  name: Loc
  year: number | null
  fac: string
  spec: string
  pos: string
  bio: string
  status: 'review' | 'published' | 'rejected'
  submittedAt: string
  mentor?: string
  students?: string
  photoUrl?: string
  media?: MediaItem[]
}

export interface AuditEntry {
  who: string
  act: Loc
  obj: string
  t: string
  tag: string
}

export interface Moderator {
  login: string
  fac: string
  scope: Loc
  records: number
  status: string
}

/** A real, admin-managed moderator account returned by /api/moderators. */
export interface ModeratorAccount {
  id: string
  username: string
  fac: string
  scope?: Loc
  status: 'active' | 'suspended'
  /** Live progress: published alumni in their faculty. */
  records: number
  /** Submissions awaiting their review. */
  pending: number
}

export type CollectionKind = 'teachers' | 'laureates' | 'veterans'

export type Route =
  | { name: 'home' }
  | { name: 'faculties' }
  | { name: 'faculty'; fac: string }
  | { name: 'facAlumni'; fac: string }
  | { name: 'alumni'; id: string }
  | { name: 'submission'; id: string }
  | { name: 'teachers' }
  | { name: 'laureates' }
  | { name: 'veterans' }
  | { name: 'apply' }
  | { name: 'access' }
  | { name: 'mod' }
  | { name: 'admin' }

export interface AppProps {
  motion: Motion
  defaultTheme: Theme
  defaultLang: Lang
  autoplaySeconds: number
}
