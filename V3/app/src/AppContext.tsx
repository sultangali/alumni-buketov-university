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
import { validRoute, routeFromUrl, routeUrl, canView, nextFeatured } from './lib/navigation'
import { apiMe, apiLogout, ApiError } from './lib/api'
import { isNativeKiosk, nativeRequest } from './lib/kiosk'

type Staff = { token: string; role: 'admin' | 'moderator'; username: string; fac?: string }

// Persist the staff session + current route across reloads so an authenticated
// admin/moderator stays signed in and on the same screen instead of being
// bounced back to the home page.
const STAFF_KEY = 'alumni-staff-session'
const ROUTE_KEY = 'alumni-route'
const readStaff = (): Staff | null => {
  if (isNativeKiosk()) return null
  try {
    const raw = localStorage.getItem(STAFF_KEY)
    const value = raw ? JSON.parse(raw) : null
    return value && typeof value.token === 'string' && typeof value.username === 'string' && ['admin', 'moderator'].includes(value.role) ? value as Staff : null
  } catch {
    return null
  }
}
const readRoute = (): Route => {
  if (isNativeKiosk()) return { name: 'home' }
  try {
    const route = routeFromUrl(new URL(window.location.href)) ?? validRoute(JSON.parse(localStorage.getItem(ROUTE_KEY) || 'null'))
    if (route) return canView(route, readStaff()) ? route : { name: 'access' }
  } catch { /* invalid stored route */ }
  return { name: 'home' }
}

/** Initial preview mode: ?preview=kiosk|browser in the URL wins (for the
 *  info-kiosk's fixed URL), otherwise default to browser. */
const readPreview = (): Preview => {
  if (isNativeKiosk()) return 'kiosk'
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
  addSubmission: (s: Omit<Submission, 'id' | 'status' | 'submittedAt'>) => Promise<void>
  uploadsPending: number
  operationError: string
  retryContent: () => void

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
  const [preview, setPreviewState] = useState<Preview>(readPreview)
  const setPreview = (value: Preview) => {
    if (isNativeKiosk()) return
    setPreviewState(value)
    const url = new URL(window.location.href)
    url.searchParams.set('preview', value)
    window.history.replaceState(window.history.state, '', url)
  }
  const [route, setRoute] = useState<Route>(readRoute)
  const historyDepth = useRef(0)
  const maintenanceHold = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(maintenanceHold.current), [])
  const [featIdx, setFeatIdx] = useState(0)
  const [listYear, setListYear] = useState<number | 'all'>('all')
  const [listQuery, setListQuery] = useState('')
  const [media, setMedia] = useState<'photos' | 'videos'>('photos')
  const [modTab, setModTab] = useState<'list' | 'add' | 'drafts' | 'review'>('list')
  const [adminTab, setAdminTab] = useState<'overview' | 'audit' | 'mods'>('overview')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [uploadsPending, setUploadsPending] = useState(0)
  const [operationError, setOperationError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const retryContent = () => setLoadAttempt(n => n + 1)

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
    let cancelled = false
    setReady(false)
    setLoadError('')
    const saved = readStaff()
    Promise.all([
      fetchBootstrap(),
      saved ? apiMe(saved.token).then(me => ({ ...me, token: saved.token } as Staff)).catch(e => {
        if (!(e instanceof ApiError) || e.status !== 401) throw e
        return null
      }) : Promise.resolve(null),
    ]).then(([data, session]) => {
      if (cancelled) return
      hydrate(data)
      setStaff(session)
      if (!session) { try { localStorage.removeItem(STAFF_KEY) } catch { /* unavailable storage */ } }
      setReady(true)
      force(n => n + 1)
    }).catch(e => { if (!cancelled) setLoadError(e.message) })
    return () => { cancelled = true }
  }, [loadAttempt])

  const addSubmission = useCallback(async (s: Omit<Submission, 'id' | 'status' | 'submittedAt'>) => {
    const saved = await apiCreateSubmission(s)
    if (isNativeKiosk()) return
    setSubmissions(prev => [saved, ...prev.filter(p => p.id !== saved.id)])
  }, [])

  useEffect(() => {
    if (!isNativeKiosk()) return
    let cancelled = false
    const timer = setInterval(() => {
      fetchBootstrap().then(data => {
        if (cancelled) return
        hydrate(data)
        setReady(true)
        setLoadError('')
        force(n => n + 1)
      }).catch(() => { /* Keep the current view and form on a failed refresh. */ })
    }, 15000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])

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
  const clearSession = useCallback(() => {
    setStaff(null)
    setSubmissions([])
    setModerators([])
    setRoute({ name: 'home' })
    historyDepth.current = 0
    window.history.replaceState({ alumniDepth: 0 }, '', routeUrl({ name: 'home' }, window.location.href))
    try { localStorage.removeItem(STAFF_KEY) } catch { /* unavailable storage */ }
  }, [])
  const logout = useCallback(() => {
    const token = staff?.token
    clearSession()
    if (token) apiLogout(token).catch(() => setOperationError('Локальный выход выполнен. Сервер не подтвердил завершение сессии.'))
  }, [staff, clearSession])
  useEffect(() => {
    const expire = () => { clearSession(); setOperationError('Сессия завершена. Войдите снова.') }
    window.addEventListener('alumni-session-expired', expire)
    return () => window.removeEventListener('alumni-session-expired', expire)
  }, [clearSession])
  const refreshSubmissions = useCallback(() => {
    if (!staff) return
    apiListSubmissions(staff.token).then(setSubmissions).catch(e => setOperationError(e.message))
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
    apiListModerators(staff.token).then(setModerators).catch(e => setOperationError(e.message))
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
      .catch(e => setOperationError(e.message))
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
      setUploadsPending(n => n + 1)
      try {
        return await apiUploadMedia(file, staff?.token)
      } catch (e) {
        setOperationError(errMsg(e))
        return null
      } finally { setUploadsPending(n => n - 1) }
    },
    [staff],
  )

  const narrow = preview === 'kiosk'
  const ui = I18N[lang]
  const L = useMemo(() => makeL(lang), [lang])

  // ---- navigation ----
  const go = useCallback((r: Route) => {
    const target = r
    if (r.name === 'faculty' || r.name === 'facAlumni') { setListYear('all'); setListQuery('') }
    setOperationError('')
    historyDepth.current += 1
    window.history.pushState({ alumniDepth: historyDepth.current }, '', routeUrl(target, window.location.href))
    setRoute(target)
  }, [staff])
  const goHome = useCallback(() => go({ name: 'home' }), [go])
  const back = useCallback(() => {
    if (historyDepth.current > 0) window.history.back()
    else goHome()
  }, [goHome])
  useEffect(() => {
    window.history.replaceState({ alumniDepth: 0 }, '', routeUrl(readRoute(), window.location.href))
    const pop = () => {
      historyDepth.current = window.history.state?.alumniDepth ?? 0
      setRoute(routeFromUrl(new URL(window.location.href)) ?? { name: 'home' })
    }
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
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
      if (routeName === 'home') setFeatIdx((i) => nextFeatured(i, featCount))
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
    uploadsPending,
    operationError,
    retryContent,
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
        {isNativeKiosk() && <img src="/logo.png" alt="Buketov University" width={72} height={72}
          onPointerDown={() => { clearTimeout(maintenanceHold.current); maintenanceHold.current = setTimeout(() => { void nativeRequest('maintenance').catch(() => {}) }, 2500) }}
          onPointerUp={() => clearTimeout(maintenanceHold.current)} onPointerCancel={() => clearTimeout(maintenanceHold.current)} onPointerLeave={() => clearTimeout(maintenanceHold.current)} />}
        {loadError ? <div role="alert"><p>{loadError}</p><button onClick={retryContent}>Повторить / Retry / Қайталау</button></div> : (ui.loading ?? '…')}
      </div>
    )
  }

  return <Ctx.Provider value={value}>{operationError && <div role="alert" style={{position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: '#fff4e5', color: '#602b00', padding: 12}}>{operationError} <button onClick={() => setOperationError('')}>✕</button></div>}{children}</Ctx.Provider>
}
