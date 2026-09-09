import type { Route } from '../types'
const plain = new Set(['home', 'faculties', 'teachers', 'laureates', 'veterans', 'apply', 'access', 'mod', 'admin'])
export function validRoute(value: unknown): Route | null {
  if (!value || typeof value !== 'object') return null
  const r = value as Record<string, unknown>
  if (typeof r.name !== 'string') return null
  if (plain.has(r.name)) return { name: r.name } as Route
  if ((r.name === 'faculty' || r.name === 'facAlumni') && typeof r.fac === 'string' && r.fac) return { name: r.name, fac: r.fac }
  if ((r.name === 'alumni' || r.name === 'submission') && typeof r.id === 'string' && r.id) return { name: r.name, id: r.id }
  return null
}
export function routeFromUrl(url: URL): Route | null {
  if (url.pathname.replace(/\/$/, '') === '/u/apply') return { name: 'apply' }
  return validRoute({ name: url.searchParams.get('page'), fac: url.searchParams.get('fac'), id: url.searchParams.get('id') })
}
export function routeUrl(route: Route, current: string): string {
  const url = new URL(current)
  url.pathname = route.name === 'apply' ? '/u/apply' : '/'
  url.searchParams.set('page', route.name)
  url.searchParams.delete('fac'); url.searchParams.delete('id')
  if ('fac' in route) url.searchParams.set('fac', route.fac)
  if ('id' in route) url.searchParams.set('id', route.id)
  return url.pathname + url.search
}
export function canView(route: Route, staff: { role: string } | null): boolean {
  if (route.name === 'admin') return staff?.role === 'admin'
  if (route.name === 'mod' || route.name === 'submission') return staff?.role === 'admin' || staff?.role === 'moderator'
  return true
}
export function nextFeatured(index: number, count: number): number {
  return count > 0 ? ((Number.isFinite(index) ? index : -1) + 1) % count : 0
}
