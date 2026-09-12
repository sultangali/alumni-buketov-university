// API origin. Production defaults to SAME-ORIGIN ('' → relative /api and /media),
// so one build serves both the public domain and the server's LAN IP (the
// info-kiosk), with nginx proxying both to the backend. Dev talks to the local
// backend. Set VITE_API_URL to override (rarely needed).
import { isNativeKiosk, nativeRequest, kioskMediaSrc } from './kiosk'
const ENV_API = import.meta.env.VITE_API_URL as string | undefined
export const API_URL = ENV_API ?? ''

/**
 * Resolve a stored media path to a loadable URL. Server uploads are stored as
 * site-relative paths ("/media/xxx.jpg") that must be served from the API
 * origin; data: URLs and absolute http(s) URLs are returned unchanged.
 */
export const mediaSrc = (url?: string): string => {
  if (!url) return ''
  if (isNativeKiosk()) return kioskMediaSrc(url)
  if (/^(data:|blob:|https?:)/.test(url)) return url
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

async function j(path: string, init?: RequestInit) {
  if (isNativeKiosk()) throw new ApiError('Доступно на сайте с личного устройства.', 403)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const r = await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal })
    const body = await r.json().catch(() => null)
    if (!r.ok) {
      if (r.status === 401 && new Headers(init?.headers).has('Authorization') && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('alumni-session-expired'))
      }
      throw new ApiError(typeof body?.error === 'string' ? body.error : `HTTP ${r.status}`, r.status)
    }
    if (body === null) throw new ApiError('Invalid server response', r.status)
    return body
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError('Сервер недоступен. Проверьте соединение и повторите попытку.', 0)
  } finally { clearTimeout(timer) }
}
export const apiMe = (token: string) => j('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
export const apiLogout = (token: string) => j('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
export const fetchBootstrap = () => isNativeKiosk() ? nativeRequest<any>('bootstrap') : j('/api/bootstrap')
export const apiLogin = (username: string, password: string) =>
  j('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
export const apiCreateSubmission = (body: unknown) =>
  isNativeKiosk() ? nativeRequest<any>('submit', body) : j('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const apiCreateHandoff = async (draft: unknown) => {
  if (isNativeKiosk()) return nativeRequest<{url: string; expiresAt: string}>('handoff', { draft })
  const publicUrl = new URL(import.meta.env.VITE_APPLY_URL || '/u/apply', window.location.origin)
  if (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password) throw new Error('Public HTTPS form unavailable')
  const result = await j('/api/kiosk/handoffs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draft }) })
  publicUrl.hash = new URLSearchParams({handoff: result.token}).toString()
  return { url: publicUrl.href, expiresAt: result.expiresAt }
}
export const apiReadHandoff = (token: string) => j(`/api/kiosk/handoffs/${encodeURIComponent(token)}`)
export const apiSubmitHandoff = (token: string, body: unknown) => j(`/api/kiosk/handoffs/${encodeURIComponent(token)}/submit`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})
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
  return j('/api/media', {
    method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: fd,
  })
}
