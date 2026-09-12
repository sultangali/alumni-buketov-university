import { useRef } from 'react'
import { useApp } from '../AppContext'
import { fac, facAlumni, alumnusToPerson, matchesText } from '../lib/logic'
import { People } from '../components/People'
import { useOptionalKeyboard } from '../kiosk/keyboard'
export function FacultyAlumni({facId}:{facId:string}) {
 const {ui,L,listYear,setListYear,listQuery,setListQuery}=useApp();const kb=useOptionalKeyboard();const queryRef=useRef(listQuery);queryRef.current=listQuery;const f=fac(facId);if(!f)return null
 const all=facAlumni(facId);return <section className="page"><p className="lede">{L(f.name)}</p><h1>{ui.alumniCap}</h1><div className="filters"><input value={listQuery} aria-label={ui.searchPh} placeholder={ui.searchPh} onChange={e=>setListQuery(e.target.value)} onFocus={()=>kb?.focus(update=>{queryRef.current=update(queryRef.current);setListQuery(queryRef.current)})}/><select aria-label={ui.year} value={listYear} onChange={e=>setListYear(e.target.value==='all'?'all':Number(e.target.value))}><option value="all">{ui.filterAll}</option>{[...new Set(all.map(a=>a.year))].sort((a,b)=>b-a).map(y=><option key={y} value={y}>{y}</option>)}</select></div><People people={all.filter(a=>(listYear==='all'||a.year===listYear)&&matchesText(listQuery,a.name,a.pos)).map(alumnusToPerson)}/></section>
}
