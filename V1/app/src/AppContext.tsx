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
import type { AppProps, Lang, Preview, Route, Submission, Theme } from './types'
import { I18N, type UIStrings } from './data/i18n'
import { fac, featList, makeL, person, type Localize } from './lib/logic'
import {
  fetchBootstrap,
  apiLogin,
  apiCreateSubmission,
  apiListSubmissions,
  apiPatchSubmission,
} from './lib/api'
import { hydrate } from './data/records'

type Staff = { token: string; role: 'admin' | 'moderator'; username: string; fac?: string }

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
  modTab: 'list' | 'add' | 'review'
  setModTab: (t: 'list' | 'add' | 'review') => void
  adminTab: 'overview' | 'audit' | 'mods'
  setAdminTab: (t: 'overview' | 'audit' | 'mods') => void

  submissions: Submission[]
  addSubmission: (s: Omit<Submission, 'id' | 'status' | 'submittedAt'>) => void

  ready: boolean
  staff: Staff | null
  login: (username: string, password: string) => Promise<'admin' | 'moderator' | null>
  logout: () => void
  refreshSubmissions: () => void
  reviewSubmission: (id: string, action: 'approve' | 'reject') => void
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
  const [preview, setPreview] = useState<Preview>('browser')
  const [route, setRoute] = useState<Route>({ name: 'home' })
  const [, setHistory] = useState<Route[]>([])
  const [featIdx, setFeatIdx] = useState(0)
  const [listYear, setListYear] = useState<number | 'all'>('all')
  const [listQuery, setListQuery] = useState('')
  const [media, setMedia] = useState<'photos' | 'videos'>('photos')
  const [modTab, setModTab] = useState<'list' | 'add' | 'review'>('list')
  const [adminTab, setAdminTab] = useState<'overview' | 'audit' | 'mods'>('overview')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const subSeq = useRef(0)

  // ---- API hydration + staff auth ----
  const [ready, setReady] = useState(false)
  const [, force] = useState(0)
  const [staff, setStaff] = useState<Staff | null>(null)

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
      setStaff({ token: r.token, role: r.role, username: r.username, fac: r.fac })
      return r.role as 'admin' | 'moderator'
    } catch {
      return null
    }
  }, [])
  const logout = useCallback(() => setStaff(null), [])
  const refreshSubmissions = useCallback(() => {
    if (!staff) return
    apiListSubmissions(staff.token).then(setSubmissions).catch(() => {})
  }, [staff])
  const reviewSubmission = useCallback(
    (id: string, action: 'approve' | 'reject') => {
      if (!staff) return
      apiPatchSubmission(id, action, staff.token)
        .then(() => refreshSubmissions())
        .catch(() => {})
    },
    [staff, refreshSubmissions],
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
