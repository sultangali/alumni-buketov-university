import { useEffect, useRef, useState } from 'react'
import { useApp } from '../AppContext'
import { alumnusToPerson, fac, featList } from '../lib/logic'
import { Icon } from '../components/icons'
import { Portrait } from '../components/People'
import { ALU } from '../data/records'
import type { Alumnus } from '../types'

const ADVANCE_MS = 6000
const PRESENTATION_MODE = import.meta.env.DEV || import.meta.env.VITE_PRESENTATION_MODE === 'true'

export function AttractOverlay({ onDismiss }: { onDismiss: () => void }) {
  const { L, lang } = useApp()
  const [animation, setAnimation] = useState<'carousel' | 'stack' | 'flip' | 'fan' | 'deal'>(() => {
    const saved = localStorage.getItem('v3-slideshow-animation')
    return saved === 'stack' || saved === 'flip' || saved === 'fan' || saved === 'deal' ? saved : 'carousel'
  })
  const [pickerOpen, setPickerOpen] = useState(false)
  const holdTimer = useRef<ReturnType<typeof setTimeout>>()
  const cancelHold = () => { clearTimeout(holdTimer.current) }
  useEffect(() => () => clearTimeout(holdTimer.current), [])
  useEffect(() => {
    if (!pickerOpen) return
    const timer = setTimeout(() => setPickerOpen(false), 8000)
    return () => clearTimeout(timer)
  }, [pickerOpen])
  const featured = featList()
  const feats = featured.length ? featured : ALU
  const [slide, setSlide] = useState({ current: 0, previous: null as number | null, direction: 1 })
  const advance = (direction: number) => setSlide(s => ({ current: s.current + direction, previous: s.current, direction }))
  useEffect(() => {
    const timer = setTimeout(() => advance(1), ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [slide.current])
  const at = (index: number) => feats[((index % feats.length) + feats.length) % feats.length]
  const facultyName = (p: Alumnus) => {
    const name = L(fac(p.fac)?.name)
    if (!name) return ''
    if (/факультет|faculty/i.test(name)) return name
    return lang === 'ru' ? `Факультет ${name[0].toLowerCase()}${name.slice(1)}` : lang === 'kz' ? `${name} факультеті` : `Faculty of ${name}`
  }
  const card = (p: Alumnus, outgoing: boolean) => <article key={`${slide.current}-${outgoing}`} className={`attract-card ${outgoing ? 'attract-card-out' : 'attract-card-in'}`} aria-hidden={outgoing || undefined}>
    <Portrait p={alumnusToPerson(p)}/>
    <div className="attract-caption">
      <h1>{L(p.name)}</h1>
      {L(p.pos) && <p className="attract-role">{L(p.pos)}</p>}
      {L(p.org) && <p className="attract-org">{L(p.org)}</p>}
      <div className="attract-meta">
        {facultyName(p) && <p><Icon name="building" size={22}/><span>{facultyName(p)}</span></p>}
        {p.year && <p><Icon name="cap" size={22}/><span>{L({ru:'Выпуск',kz:'Түлек',en:'Class of'})} {p.year}</span></p>}
      </div>
      {!!p.awards?.length && <p className="attract-award"><Icon name="trophy" size={24}/><span>{L(p.awards[0])}</span></p>}
    </div>
  </article>
  return <div className="attract-overlay" tabIndex={0} aria-label={L({ru:'Слайд-шоу',kz:'Слайд-шоу',en:'Slideshow'})} onKeyDown={e => { if (e.key === 'Escape') onDismiss() }} onClick={onDismiss}>
    <img className="attract-watermark" src="/logo.png" alt="" aria-hidden="true"/>
    {feats.length ? <>
      <div className="attract-stage" data-animation={animation} data-direction={slide.direction}>
        {slide.previous !== null && card(at(slide.previous), true)}
        {card(at(slide.current), false)}
      </div>
      {feats.length > 1 && <>
        <button className="attract-arrow attract-prev" aria-label={L({ru:'Предыдущая карточка',kz:'Алдыңғы карточка',en:'Previous card'})} onClick={e => { e.stopPropagation(); advance(-1) }}><Icon name="chevronLeft" size={40}/></button>
        <button className="attract-arrow attract-next" aria-label={L({ru:'Следующая карточка',kz:'Келесі карточка',en:'Next card'})} onClick={e => { e.stopPropagation(); advance(1) }}><Icon name="chevronRight" size={40}/></button>
      </>}
    </> : <img className="attract-empty-logo" src="/logo.png" alt="Buketov University"/>}
    {PRESENTATION_MODE && pickerOpen && <div className="attract-animation-picker" onClick={e => e.stopPropagation()} aria-label="Варианты анимации">
      {(['carousel', 'stack', 'flip', 'fan', 'deal'] as const).map((value, index) => <button key={value} aria-pressed={animation === value} onClick={() => { setAnimation(value); localStorage.setItem('v3-slideshow-animation', value); setPickerOpen(false); advance(1) }}>{L([{ru:'Карусель',kz:'Карусель',en:'Carousel'},{ru:'Стопка',kz:'Бума',en:'Stack'},{ru:'Переворот',kz:'Аудару',en:'Flip'},{ru:'Веер',kz:'Желпуіш',en:'Fan'},{ru:'Перекладка',kz:'Ауыстыру',en:'Shuffle'}][index])}</button>)}
    </div>}
    <footer className="attract-footer" onClick={e => e.stopPropagation()} onPointerDown={e => {
        e.stopPropagation()
        if (!PRESENTATION_MODE) return
        cancelHold()
        holdTimer.current = setTimeout(() => setPickerOpen(open => !open), 1500)
      }} onPointerUp={cancelHold} onPointerCancel={cancelHold} onPointerLeave={cancelHold} onContextMenu={e => e.preventDefault()}>
      {!!feats.length && <div className="attract-progress"><span key={slide.current} style={{animationDuration:`${ADVANCE_MS}ms`}}/></div>}
    </footer>
  </div>
}
