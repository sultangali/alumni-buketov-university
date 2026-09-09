import { useEffect, useState } from 'react'
import { useApp } from '../AppContext'
import { fac, initials } from '../lib/logic'
import { mediaSrc } from '../lib/api'
import { Icon } from './icons'
import type { Person } from '../types'
export function Portrait({p}: {p:Person}) {
 const {L}=useApp(); const [failed,setFailed]=useState(false)
 useEffect(()=>setFailed(false),[p.photoUrl])
 return <div className="portrait">{p.photoUrl&&!failed?<img src={mediaSrc(p.photoUrl)} alt={L(p.name)} onError={()=>setFailed(true)}/>:<span className={initials(p.name).length>2?'separated-initials':undefined} aria-label={L({ru:'Фотография не добавлена',kz:'Фотосурет қосылмаған',en:'Photo not added'})}>{initials(p.name)}</span>}</div>
}
export function People({people}: {people:Person[]}) {
 const {L,ui,go}=useApp()
 return people.length?<div className="people-grid">{people.map(p=><button className="person-card" key={p.id} onClick={()=>go({name:'alumni',id:p.id})}><Portrait p={p}/><div className="person-summary"><small>{p.kind==='alumnus'?p.year:L(p.badge)||L(p.meta)}</small><h3>{L(p.name)}</h3><p>{L(p.pos)}</p></div><div className="person-details"><small>{L(fac(p.fac)?.name)}</small>{p.highlight&&<p className="distinction"><Icon name="trophy" size={22}/><span>{L(p.highlight)}</span></p>}</div></button>)}</div>:<div className="empty">{ui.noResults}</div>
}
