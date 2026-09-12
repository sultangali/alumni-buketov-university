/** Versioned, asynchronous transport exposed only to the APK's bundled page. */
export interface KioskStatus {
  online: boolean
  cachedAt: string | null
  pending: number
  needsAttention: number
  publicOrigin: string
}
declare global {
  interface Window {
    AlumniNative?: { request(id: string, method: string, payload: string): void }
    __alumniNativeResponse?: (id: string, response: string) => void
  }
}
export const isNativeKiosk = () => typeof window !== 'undefined' && !!window.AlumniNative
export function newSubmissionId(): string {
  // getRandomValues also works on the isolated LAN's HTTP browser origin.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}
const pending = new Map<string, { resolve: (data: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>()
export function nativeRequest<T>(method: 'bootstrap' | 'submit' | 'status' | 'handoff' | 'maintenance', payload: unknown = {}): Promise<T> {
  if (!isNativeKiosk()) return Promise.reject(new Error('Native transport unavailable'))
  window.__alumniNativeResponse = (id, raw) => {
    const item = pending.get(id)
    if (!item) return
    pending.delete(id)
    clearTimeout(item.timer)
    try {
      const result = JSON.parse(raw)
      if (result.ok === true) item.resolve(result.data)
      else item.reject(new Error(typeof result.error === 'string' ? result.error : 'Операция не выполнена'))
    } catch { item.reject(new Error('Некорректный ответ приложения')) }
  }
  return new Promise<T>((resolve, reject) => {
    const id = newSubmissionId()
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error('Нет ответа приложения. Повторите попытку.'))
    }, 25000)
    pending.set(id, { resolve: data => resolve(data as T), reject, timer })
    try { window.AlumniNative!.request(id, method, JSON.stringify(payload)) }
    catch (e) { clearTimeout(timer); pending.delete(id); reject(e) }
  })
}

export function kioskMediaSrc(url: string): string {
  // Remote content is never opened by the bundled WebView.
  return /^\/media\/[a-zA-Z0-9_.-]+$/.test(url) ? `/cached-media/${url.slice(7)}` : ''
}
