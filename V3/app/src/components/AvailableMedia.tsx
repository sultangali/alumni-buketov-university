import { useEffect, useState } from 'react'
import { useApp } from '../AppContext'
import { mediaSrc } from '../lib/api'
import { isNativeKiosk } from '../lib/kiosk'

export function AvailableMedia({url,kind,label}:{url?:string;kind:'image'|'video';label:string}) {
  const {L}=useApp()
  const [failed,setFailed]=useState(false)
  const src=mediaSrc(url)
  useEffect(()=>setFailed(false),[url])
  useEffect(()=>{
    if(!failed || !src || !isNativeKiosk())return
    const timer=setTimeout(()=>setFailed(false),15000)
    return()=>clearTimeout(timer)
  },[failed,src])
  if(failed || !src)return <span role="status" style={{display:'block',padding:24}}>{L({ru:'Материал сейчас недоступен. Повторите после восстановления связи.',kz:'Материал қазір қолжетімсіз. Байланыс қалпына келгенде қайталаңыз.',en:'Media unavailable. Try again when the connection returns.'})}</span>
  return kind==='image'
    ? <img src={src} alt={label} loading="lazy" onError={()=>setFailed(true)}/>
    : <video src={src} controls playsInline preload="metadata" aria-label={label} onError={()=>setFailed(true)}/>
}
