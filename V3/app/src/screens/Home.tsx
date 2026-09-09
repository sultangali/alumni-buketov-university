import { useEffect, useState } from 'react'
import { useApp } from '../AppContext'
import { ALU, TEACHERS, LAUREATES, VETERANS } from '../data/records'
import { alumnusToPerson, searchPeople } from '../lib/logic'
import { FacultyFilter } from '../components/FacultyFilter'
import { FacultyGrid } from './Faculties'
import { People } from '../components/People'
import { Icon } from '../components/icons'
import { useOptionalKeyboard } from '../kiosk/keyboard'
export function Home() {
 const {ui,L,go,route}=useApp();const [query,setQuery]=useState('');const kb=useOptionalKeyboard();const [faculty,setFaculty]=useState('')
 useEffect(()=>{setQuery('');setFaculty('')},[route])
 const people=[...ALU.map(alumnusToPerson),...TEACHERS,...LAUREATES,...VETERANS]
 return <div className="page home"><section className="intro"><div><h1>{L({ru:'Люди, которые создают историю',kz:'Тарихты жасайтын тұлғалар',en:'People who make history'})}</h1><p>{L({ru:'Выпускники, преподаватели и исследователи Карагандинского университета имени Е. А. Букетова.',kz:'Е. А. Бөкетов атындағы Қарағанды университетінің түлектері, оқытушылары мен зерттеушілері.',en:'Graduates, educators and researchers of Karaganda Buketov University.'})}</p></div><img src="/logo.png" alt="Buketov University"/></section><div className="archive-search"><div className="search-field"><span aria-hidden="true">⌕</span><input aria-label={ui.searchPh} placeholder={ui.searchPh} value={query} onFocus={()=>kb?.focus(setQuery)} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')} aria-label={L({ru:'Очистить поиск',kz:'Іздеуді тазарту',en:'Clear search'})}>×</button>}</div><FacultyFilter value={faculty} onChange={setFaculty}/></div>{query.trim()||faculty?<section><div className="section-title"><h2>{L({ru:'Результаты поиска',kz:'Іздеу нәтижелері',en:'Search results'})}</h2><button onClick={()=>{setQuery('');setFaculty('');kb?.blur()}}>{L({ru:'Сбросить',kz:'Тазарту',en:'Reset'})}</button></div><People people={searchPeople(people,query,faculty)}/></section>:<><section className="category-links">
  {([
    ['teachers', ui.catTeachers, TEACHERS.length, 'cap'],
    ['laureates', ui.catLaureates, LAUREATES.length, 'trophy'],
    ['veterans', ui.catVeterans, VETERANS.length, 'medal'],
  ] as const).map(([name, title, count, icon]) => (
    <button className="category-link" key={name} onClick={() => go({ name })}>
      <span className="category-link-icon"><Icon name={icon} size={28} /></span>
      <span className="category-link-copy"><strong>{title}</strong><small>{count} {ui.profilesWord}</small></span>
      <span className="category-link-arrow"><Icon name="chevronRight" size={18} /></span>
    </button>
  ))}
</section><section><div className="section-title"><h2>{ui.facultiesTitle}</h2><span>{ui.alumniCap}</span></div><FacultyGrid/></section></>}</div>
}
