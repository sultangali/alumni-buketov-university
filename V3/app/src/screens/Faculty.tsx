import { useApp } from '../AppContext'
import { fac,facAlumni,alumnusToPerson } from '../lib/logic'
import { People } from '../components/People'
export function Faculty({facId}:{facId:string}) {const {ui,L,go}=useApp();const f=fac(facId);if(!f)return null;return <section className="page"><p className="lede">{ui.facultiesTitle}</p><h1>{L(f.name)}</h1><div className="section-title"><h2>{ui.alumniCap}</h2><button onClick={()=>go({name:'facAlumni',fac:facId})}>{ui.searchPh}</button></div><People people={facAlumni(facId).map(alumnusToPerson)}/></section>}
