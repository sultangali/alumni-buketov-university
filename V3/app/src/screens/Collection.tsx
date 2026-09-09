import { useState } from 'react'
import { useApp } from '../AppContext'
import { FAC } from '../data/records'
import { collectionPeople, matchesText } from '../lib/logic'
import { People } from '../components/People'
import { useOptionalKeyboard } from '../kiosk/keyboard'
import type { CollectionKind } from '../types'
export function Collection({kind}:{kind:CollectionKind}) {
 const {ui,L,lang}=useApp();const [faculty,setFaculty]=useState('all');const [query,setQuery]=useState('');const kb=useOptionalKeyboard()
 const all=collectionPeople(kind);const title=kind==='teachers'?ui.teachersTitle:kind==='laureates'?ui.laureatesTitle:ui.veteransTitle
 return <section className="page"><h1>{title}</h1><p className="lede">{all.length} {ui.profilesWord}</p><div className="filters"><input aria-label={ui.searchPh} placeholder={ui.searchPh} value={query} onChange={e=>setQuery(e.target.value)} onFocus={()=>kb?.focus(setQuery)}/><select aria-label={ui.facultiesTitle} value={faculty} onChange={e=>setFaculty(e.target.value)}><option value="all">{ui.filterAll}</option>{[...FAC].sort((a,b)=>L(a.name).localeCompare(L(b.name),lang==='kz'?'kk':lang)).map(f=><option value={f.id} key={f.id}>{L(f.name)}</option>)}</select></div><People people={all.filter(p=>(faculty==='all'||p.fac===faculty)&&matchesText(query,p.name,p.pos))}/></section>
}
