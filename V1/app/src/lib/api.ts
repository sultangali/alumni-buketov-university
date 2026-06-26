const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000'

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
