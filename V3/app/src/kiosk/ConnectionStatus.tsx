import { useEffect, useState } from 'react'
import { isNativeKiosk, nativeRequest, type KioskStatus } from '../lib/kiosk'
import { useApp } from '../AppContext'

export function ConnectionStatus() {
  const [status, setStatus] = useState<KioskStatus | null>(null)
  const { L } = useApp()
  useEffect(() => {
    if (!isNativeKiosk()) return
    let active = true
    const poll = () => nativeRequest<KioskStatus>('status').then(s => { if (active) setStatus(s) }).catch(() => {})
    void poll()
    const timer = setInterval(poll, 5000)
    return () => { active = false; clearInterval(timer) }
  }, [])
  if (!isNativeKiosk() || !status || status.online) return null
  return <div role="status" style={{ padding: '8px 16px', background: '#fff3d6', color: '#513b16', fontSize: 14 }}>
    {L({ru:'Работаем без связи. Доступна сохранённая копия.',kz:'Байланыс жоқ. Сақталған көшірме қолжетімді.',en:'Offline. Showing the saved catalogue.'})}
    {status.cachedAt && ` ${new Date(status.cachedAt).toLocaleDateString()}`}
  </div>
}
