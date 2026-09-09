import { useApp } from '../AppContext'
import { person } from '../lib/logic'
import { ProfileMedia } from '../components/ProfileMedia'
import { DEMO_MEDIA } from '../data/demoMedia'
import { Icon } from '../components/icons'
import { Portrait } from '../components/People'
export function Profile({id}:{id:string}) {
 const {ui,L,go}=useApp();const p=person(id);if(!p)return <section className="page">{ui.noResults}</section>
 const demo = (import.meta.env.DEV || import.meta.env.VITE_PRESENTATION_MODE === 'true') && id === 'demo-mit-20260908-01' && new URLSearchParams(location.search).get('demoMedia') === '1'
 const links=(ids:string[]|undefined)=>(ids||[]).map(person).filter(x=>x!==null)
 return <article className="page profile"><header className="profile-head profile-hero"><Portrait key={p.id} p={p}/><div className="profile-summary"><h1>{L(p.name)}</h1><p className="profile-role">{L(p.pos)}</p>{L(p.org)&&<p>{L(p.org)}</p>}<div className="profile-meta">{p.kind==='alumnus'&&p.year?<span>{L({ru:'Выпуск',kz:'Түлек',en:'Class of'})} {p.year}</span>:L(p.badge)&&<span>{L(p.badge)}</span>}{L(p.spec)&&<span>{L(p.spec)}</span>}</div></div></header>{L(p.highlight)&&<p className="distinction profile-distinction"><Icon name="trophy" size={24}/><span>{L(p.highlight)}</span></p>}{L(p.bio)&&<section className="profile-section"><h2>{ui.biography||L({ru:'Биография',kz:'Өмірбаяны',en:'Biography'})}</h2><p>{L(p.bio)}</p></section>}{demo&&<p className="media-demo-note">{L({ru:'Демонстрационный альбом: стоковые фото и тестовые видео, не личные материалы Айданы.',kz:'Демоальбом: Айдананың жеке материалдары емес, сток фотолар мен сынақ бейнелері.',en:'Demo album: stock photos and test videos, not Aidana’s personal media.'})}</p>}<ProfileMedia key={p.id} media={demo ? DEMO_MEDIA : p.media || []}/>{!!p.awards?.length&&<section className="profile-section"><h2>{ui.awards}</h2><ul>{p.awards.map((a,i)=><li key={i}>{L(a)}</li>)}</ul></section>}{([['mentors',p.mentorText,p.mentors],['students',p.studentsText,p.students]] as const).map(([kind,content,ids])=>(content||links(ids).length>0)&&<section className="profile-section" key={kind}><h2>{ui[kind]}</h2>{content&&<p>{content}</p>}{links(ids).map(x=><button key={x.id} onClick={()=>go({name:'alumni',id:x.id})}>{L(x.name)}</button>)}</section>)}</article>
}
