import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppProps, Lang, ModeratorAccount, Preview, Route, Submission, Theme } from './types'
import { I18N, type UIStrings } from './data/i18n'
import { fac, featList, makeL, person, type Localize } from './lib/logic'
import {
  fetchBootstrap,
  apiLogin,
  apiCreateSubmission,
  apiListSubmissions,
  apiPatchSubmission,
  apiListModerators,
  apiCreateModerator,
  apiUpdateModerator,
  apiDeleteModerator,
  apiUpdatePerson,
  apiCreatePerson,
  apiEditSubmission,
  apiUploadMedia,
  type UploadedMedia,
} from './lib/api'
import { hydrate } from './data/records'

type Staff = { token: string; role: 'admin' | 'moderator'; username: string; fac?: string }

// Persist the staff session + current route across reloads so an authenticated
// admin/moderator stays signed in and on the same screen instead of being
// bounced back to the home page.
const STAFF_KEY = 'alumni-staff-session'
const ROUTE_KEY = 'alumni-route'
const readStaff = (): Staff | null => {
  try {
    const raw = localStorage.getItem(STAFF_KEY)
    return raw ? (JSON.parse(raw) as Staff) : null
  } catch {
    return null
  }
}
const readRoute = (): Route => {
  try {
    const raw = localStorage.getItem(ROUTE_KEY)
    if (raw) {
      const r = JSON.parse(raw) as Route
      // staff-only screens require a session; otherwise fall back home
      const staffOnly = r.name === 'admin' || r.name === 'mod' || r.name === 'submission'
      if (!staffOnly || readStaff()) return r
    }
  } catch {
    /* malformed — ignore */
  }
  return { name: 'home' }
}

/** Initial preview mode: ?preview=kiosk|browser in the URL wins (for the
 *  info-kiosk's fixed URL), otherwise default to browser. */
const readPreview = (): Preview => {
  try {
    const p = new URLSearchParams(window.location.search).get('preview')
    if (p === 'kiosk' || p === 'browser') return p
  } catch {
    /* no window/search — ignore */
  }
  return 'browser'
}

// Configurable defaults — these correspond to the prototype's data-props
// (motion / defaultTheme / defaultLang / autoplaySeconds).
const PROPS: AppProps = {
  motion: 'full',
  defaultTheme: 'light',
  defaultLang: 'ru',
  autoplaySeconds: 6,
}

interface AppCtx extends AppProps {
  lang: Lang
  theme: Theme
  preview: Preview
  narrow: boolean
  ui: UIStrings
  L: Localize
  setLang: (l: Lang) => void
  setTheme: (t: Theme) => void
  setPreview: (p: Preview) => void

  route: Route
  go: (r: Route) => void
  back: () => void
  goHome: () => void
  showCrumb: boolean
  crumb: string

  featIdx: number
  setFeatIdx: (n: number) => void
  listYear: number | 'all'
  setListYear: (y: number | 'all') => void
  listQuery: string
  setListQuery: (q: string) => void
  media: 'photos' | 'videos'
  setMedia: (m: 'photos' | 'videos') => void
  modTab: 'list' | 'add' | 'drafts' | 'review'
  setModTab: (t: 'list' | 'add' | 'drafts' | 'review') => void
  adminTab: 'overview' | 'audit' | 'mods'
  setAdminTab: (t: 'overview' | 'audit' | 'mods') => void

  submissions: Submission[]
  addSubmission: (s: Omit<Submission, 'id' | 'status' | 'submittedAt'>) => void

  ready: boolean
  staff: Staff | null
  login: (username: string, password: string) => Promise<'admin' | 'moderator' | null>
  logout: () => void
  refreshSubmissions: () => void
  reviewSubmission: (id: string, action: 'approve' | 'reject') => Promise<string | null>

  moderators: ModeratorAccount[]
  refreshModerators: () => void
  createModerator: (body: { username: string; password: string; fac: string; scope?: Record<string, string> }) => Promise<string | null>
  updateModerator: (id: string, body: { fac?: string; status?: 'active' | 'suspended'; password?: string; scope?: Record<string, string> }) => Promise<string | null>
  deleteModerator: (id: string) => Promise<string | null>
  updatePerson: (id: string, body: Record<string, unknown>) => Promise<string | null>
  createPerson: (body: Record<string, unknown>) => Promise<string | null>
  editSubmission: (id: string, body: Record<string, unknown>) => Promise<string | null>
  /** Upload one image/video file; resolves to the stored media or null on error. */
  uploadMedia: (file: File) => Promise<UploadedMedia | null>
}

const Ctx = createContext<AppCtx | null>(null)

export function useApp(): AppCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used within <AppProvider>')
  return v
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(PROPS.defaultLang)
  const [theme, setTheme] = useState<Theme>(PROPS.defaultTheme)
  // The info-kiosk opens the site with ?preview=kiosk to start in kiosk layout.
  const [preview, setPreview] = useState<Preview>(readPreview)
  const [route, setRoute] = useState<Route>(readRoute)
  const [, setHistory] = useState<Route[]>([])
  const [featIdx, setFeatIdx] = useState(0)
  const [listYear, setListYear] = useState<number | 'all'>('all')
  const [listQuery, setListQuery] = useState('')
  const [media, setMedia] = useState<'photos' | 'videos'>('photos')
  const [modTab, setModTab] = useState<'list' | 'add' | 'drafts' | 'review'>('list')
  const [adminTab, setAdminTab] = useState<'overview' | 'audit' | 'mods'>('overview')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const subSeq = useRef(0)

  // ---- API hydration + staff auth ----
  const [ready, setReady] = useState(false)
  const [, force] = useState(0)
  const [staff, setStaff] = useState<Staff | null>(readStaff)

  // Persist the route on every change so a reload restores the same screen.
  useEffect(() => {
    try {
      localStorage.setItem(ROUTE_KEY, JSON.stringify(route))
    } catch {
      /* storage unavailable — ignore */
    }
  }, [route])

  useEffect(() => {
    fetchBootstrap()
      .then((d) => {
        hydrate(d)
        setReady(true)
        force((n) => n + 1)
      })
      .catch(() => setReady(true))
  }, [])

  const addSubmission = useCallback(
    (s: Omit<Submission, 'id' | 'status' | 'submittedAt'>) => {
      // POST to the backend (fire-and-forget); offline it just stays local.
      apiCreateSubmission(s).catch(() => {})
      // optimistic local prepend so the current UI updates immediately
      subSeq.current += 1
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
      setSubmissions((prev) => [
        { ...s, id: `sub${subSeq.current}`, status: 'review', submittedAt: stamp },
        ...prev,
      ])
    },
    [],
  )

  const login = useCallback(async (username: string, password: string) => {
    try {
      const r = await apiLogin(username, password)
      const s: Staff = { token: r.token, role: r.role, username: r.username, fac: r.fac }
      setStaff(s)
      try {
        localStorage.setItem(STAFF_KEY, JSON.stringify(s))
      } catch {
        /* storage unavailable — session stays in-memory */
      }
      return r.role as 'admin' | 'moderator'
    } catch {
      return null
    }
  }, [])
  const logout = useCallback(() => {
    setStaff(null)
    try {
      localStorage.removeItem(STAFF_KEY)
    } catch {
      /* ignore */
    }
  }, [])
  const refreshSubmissions = useCallback(() => {
    if (!staff) return
    apiListSubmissions(staff.token).then(setSubmissions).catch(() => {})
  }, [staff])
  const reviewSubmission = useCallback(
    (id: string, action: 'approve' | 'reject') => {
      if (!staff) return Promise.resolve('no session')
      return apiPatchSubmission(id, action, staff.token)
        .then(() => {
          refreshSubmissions()
          // approving publishes a new archive record — re-hydrate content
          if (action === 'approve') reloadContent()
          return null
        })
        .catch((e) => (e instanceof Error ? e.message : 'error'))
    },
    [staff, refreshSubmissions],
  )

  // ---- moderator management (admin) ----
  const [moderators, setModerators] = useState<ModeratorAccount[]>([])
  const refreshModerators = useCallback(() => {
    if (!staff || staff.role !== 'admin') return
    apiListModerators(staff.token).then(setModerators).catch(() => {})
  }, [staff])
  const errMsg = (e: unknown): string => (e instanceof Error ? e.message : 'error')
  const createModerator = useCallback(
    async (body: { username: string; password: string; fac: string; scope?: Record<string, string> }) => {
      if (!staff) return 'no session'
      try {
        await apiCreateModerator(body, staff.token)
        refreshModerators()
        return null
      } catch (e) {
        return errMsg(e)
      }
    },
    [staff, refreshModerators],
  )
  const updateModerator = useCallback(
    async (id: string, body: { fac?: string; status?: 'active' | 'suspended'; password?: string; scope?: Record<string, string> }) => {
      if (!staff) return 'no session'
      try {
        await apiUpdateModerator(id, body, staff.token)
        refreshModerators()
        return null
      } catch (e) {
        return errMsg(e)
      }
    },
    [staff, refreshModerators],
  )
  const deleteModerator = useCallback(
    async (id: string) => {
      if (!staff) return 'no session'
      try {
        await apiDeleteModerator(id, staff.token)
        refreshModerators()
        return null
      } catch (e) {
        return errMsg(e)
      }
    },
    [staff, refreshModerators],
  )

  // Re-fetch the whole content bootstrap and re-hydrate the live datasets,
  // then force a re-render so every screen reflects the change.
  const reloadContent = useCallback(() => {
    return fetchBootstrap()
      .then((d) => {
        hydrate(d)
        force((n) => n + 1)
      })
      .catch(() => {})
  }, [])
  const updatePerson = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      if (!staff) return 'no session'
      try {
        await apiUpdatePerson(id, body, staff.token)
        await reloadContent()
        return null
      } catch (e) {
        return errMsg(e)
      }
    },
    [staff, reloadContent],
  )
  // Moderator publishes a verified alumnus directly into the archive.
  const createPerson = useCallback(
    async (body: Record<string, unknown>) => {
      if (!staff) return 'no session'
      try {
        await apiCreatePerson(body, staff.token)
        await reloadContent()
        return null
      } catch (e) {
        return errMsg(e)
      }
    },
    [staff, reloadContent],
  )
  // In-place correction of a pending submission before it is published.
  const editSubmission = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      if (!staff) return 'no session'
      try {
        await apiEditSubmission(id, body, staff.token)
        refreshSubmissions()
        return null
      } catch (e) {
        return errMsg(e)
      }
    },
    [staff, refreshSubmissions],
  )
  // Upload a single image/video to the server (returns the stored media path).
  // Public: the apply form uploads without a session, staff pass their token.
  const uploadMedia = useCallback(
    async (file: File): Promise<UploadedMedia | null> => {
      try {
        return await apiUploadMedia(file, staff?.token)
      } catch {
        return null
      }
    },
    [staff],
  )

  const narrow = preview === 'kiosk'
  const ui = I18N[lang]
  const L = useMemo(() => makeL(lang), [lang])

  // ---- navigation ----
  const go = useCallback((r: Route) => {
    setHistory((h) => [...h, route])
    // entering a faculty (or its alumni sub-page) resets the alumni-list filters
    if (r.name === 'faculty' || r.name === 'facAlumni') {
      setListYear('all')
      setListQuery('')
    }
    setRoute(r)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route])
  const back = useCallback(() => {
    setHistory((h) => {
      const copy = [...h]
      const prev = copy.pop() || { name: 'home' as const }
      setRoute(prev)
      return copy
    })
  }, [])
  const goHome = useCallback(() => {
    setRoute({ name: 'home' })
    setHistory([])
  }, [])

  // ---- autoplay for the Hall of Fame spotlight ----
  const featCount = featList().length
  const routeName = route.name
  const motion = PROPS.motion
  const autoplaySeconds = PROPS.autoplaySeconds
  const iv = useRef<ReturnType<typeof setInterval>>()
  useEffect(() => {
    clearInterval(iv.current)
    if (motion === 'off') return
    const ms = Math.max(2, autoplaySeconds || 6) * 1000
    iv.current = setInterval(() => {
      if (routeName === 'home') setFeatIdx((i) => (i + 1) % featCount)
    }, ms)
    return () => clearInterval(iv.current)
  }, [routeName, featCount, motion, autoplaySeconds])

  // ---- breadcrumb ----
  const { showCrumb, crumb } = useMemo(() => {
    const sep = ' › '
    let c = ''
    const r = route
    if (r.name === 'faculty') {
      const f = fac(r.fac)
      if (f) c = ui.faculties + sep + L(f.name)
    } else if (r.name === 'facAlumni') {
      const ff = fac(r.fac)
      if (ff) c = L(ff.name) + sep + ui.alumniCap
    } else if (r.name === 'alumni') {
      const p = person(r.id)
      if (p) {
        const f = fac(p.fac)
        c = (f ? L(f.name) : '') + sep + L(p.name)
      }
    } else if (r.name === 'teachers') {
      c = ui.categories + sep + ui.teachersTitle
    } else if (r.name === 'laureates') {
      c = ui.categories + sep + ui.laureatesTitle
    } else if (r.name === 'veterans') {
      c = ui.categories + sep + ui.veteransTitle
    } else if (r.name === 'apply') {
      c = ui.categories + sep + ui.applyTitle
    } else if (r.name === 'access') {
      c = ui.accessTitle
    } else if (r.name === 'submission') {
      c = ui.staff + sep + ui.tabReview
    } else if (r.name === 'mod') {
      c = ui.staff + sep + 'Модератор'
    } else if (r.name === 'admin') {
      c = ui.staff + sep + 'Администратор'
    } else if (r.name === 'faculties') {
      c = ui.faculties
    }
    return { showCrumb: r.name !== 'home', crumb: c }
  }, [route, ui, L])

  const value: AppCtx = {
    ...PROPS,
    lang,
    theme,
    preview,
    narrow,
    ui,
    L,
    setLang,
    setTheme,
    setPreview,
    route,
    go,
    back,
    goHome,
    showCrumb,
    crumb,
    featIdx,
    setFeatIdx,
    listYear,
    setListYear,
    listQuery,
    setListQuery,
    media,
    setMedia,
    modTab,
    setModTab,
    adminTab,
    setAdminTab,
    submissions,
    addSubmission,
    ready,
    staff,
    login,
    logout,
    refreshSubmissions,
    reviewSubmission,
    moderators,
    refreshModerators,
    createModerator,
    updateModerator,
    deleteModerator,
    updatePerson,
    createPerson,
    editSubmission,
    uploadMedia,
  }

  if (!ready) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--c-bg)',
          color: 'var(--c-ink)',
          fontSize: 'var(--t-lg)',
        }}
      >
        {ui.loading ?? '…'}
      </div>
    )
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
