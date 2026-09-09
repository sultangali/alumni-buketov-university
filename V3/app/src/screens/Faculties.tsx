import { useApp } from '../AppContext'
import { FAC } from '../data/records'
import { facAlumniCount } from '../lib/logic'
export function FacultyGrid() {
 const {L,lang,go,ui}=useApp()
 return <div className="faculty-grid">{[...FAC].sort((a,b)=>L(a.name).localeCompare(L(b.name),lang==='kz'?'kk':lang)).map(f=><button className="faculty-card" key={f.id} onClick={()=>go({name:'faculty',fac:f.id})}><span className="faculty-symbol">{f.abbr}</span><span className="faculty-copy"><strong>{L(f.name)}</strong><small>{facAlumniCount(f)} {ui.alumni}</small></span><span className="faculty-arrow" aria-hidden="true">›</span></button>)}</div>
}
export function Faculties() {const {ui}=useApp();return <section className="page"><h1>{ui.facultiesTitle}</h1><p className="lede">{ui.facultiesSub}</p><FacultyGrid/></section>}
