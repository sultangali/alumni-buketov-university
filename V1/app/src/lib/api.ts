// API origin. Production defaults to SAME-ORIGIN ('' → relative /api and /media),
// so one build serves both the public domain and the server's LAN IP (the
// info-kiosk), with nginx proxying both to the backend. Dev talks to the local
// backend. Set VITE_API_URL to override (rarely needed).
const ENV_API = import.meta.env.VITE_API_URL as string | undefined
export const API_URL = ENV_API ?? (import.meta.env.DEV ? 'http://localhost:4000' : '')

/**
 * Resolve a stored media path to a loadable URL. Server uploads are stored as
 * site-relative paths ("/media/xxx.jpg") that must be served from the API
 * origin; data: URLs and absolute http(s) URLs are returned unchanged.
 */
export const mediaSrc = (url?: string): string => {
  if (!url) return ''
  if (/^(data:|blob:|https?:)/.test(url)) return url
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

async function j(path: string, init?: RequestInit) {
  const r = await fetch(`${API_URL}${path}`, init)
  if (!r.ok) throw new Error(`${path} -> ${r.status}`)
  return r.json()
}
export const fetchBootstrap = () => j('/api/bootstrap')
export const apiLogin = (username: string, password: string) =>
  j('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
export const apiCreateSubmission = (body: unknown) =>
  j('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
export const apiListSubmissions = (token: string) =>
  j('/api/submissions', { headers: { Authorization: `Bearer ${token}` } })
export const apiPatchSubmission = (id: string, action: 'approve' | 'reject', token: string) =>
  j(`/api/submissions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action }) })
// in-place edit of a submission's fields before publishing (no `action`)
export const apiEditSubmission = (id: string, body: unknown, token: string) =>
  j(`/api/submissions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })

// ---- moderator management (admin only) ----
export const apiListModerators = (token: string) =>
  j('/api/moderators', { headers: { Authorization: `Bearer ${token}` } })
export const apiCreateModerator = (body: unknown, token: string) =>
  j('/api/moderators', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
export const apiUpdateModerator = (id: string, body: unknown, token: string) =>
  j(`/api/moderators/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
export const apiDeleteModerator = (id: string, token: string) =>
  j(`/api/moderators/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })

// ---- create / edit a person record (staff) ----
export const apiCreatePerson = (body: unknown, token: string) =>
  j('/api/people', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
export const apiUpdatePerson = (id: string, body: unknown, token: string) =>
  j(`/api/people/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })

// ---- media upload (public; the apply form uploads without a session) ----
export interface UploadedMedia { url: string; name: string; kind: 'image' | 'video' }
export const apiUploadMedia = async (file: File, token?: string): Promise<UploadedMedia> => {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch(`${API_URL}/api/media`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  })
  if (!r.ok) {
    let msg = `upload failed (${r.status})`
    try {
      const e = await r.json()
      if (e?.error) msg = e.error
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg)
  }
  return r.json()
}
