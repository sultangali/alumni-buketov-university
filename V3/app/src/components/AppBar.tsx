import { useEffect, useState } from 'react'
import { useApp } from '../AppContext'
import { Icon } from './icons'

export function AppBar() {
  const { ui, L, lang, setLang, setPreview, goHome, go, staff, logout, route } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchRequested, setSearchRequested] = useState(false)
  const searchLabel = L({ru:'Поиск',kz:'Іздеу',en:'Search'})
  const openSearch = () => { goHome(); setSearchRequested(true) }
  useEffect(() => {
    if (searchRequested && route.name === 'home') {
      document.querySelector<HTMLInputElement>('.search-field input')?.focus()
      setSearchRequested(false)
    }
  }, [route, searchRequested])
  useEffect(() => { setMenuOpen(false) }, [route])
  const access = () => go({ name: staff ? (staff.role === 'admin' ? 'admin' : 'mod') : 'access' })
  const accessLabel = staff ? (staff.role === 'admin' ? ui.accessRoleAdmin : ui.accessRoleMod) : ui.accessBtn
  const kioskLabel = L({ ru: 'Режим киоска', kz: 'Киоск режимі', en: 'Kiosk mode' })
  return (
    <header className="v3-header">
      <button className="brand" onClick={goHome} aria-label={L({ru:'Buketov University — главная',kz:'Buketov University — басты бет',en:'Buketov University — home'})}>
        <img src="/logo.png" alt="" />
        <span>Buketov University<small>{ui.alumniCap}</small></span>
      </button>
      <nav className="desktop-navigation" aria-label={L({ru:'Основная навигация',kz:'Негізгі навигация',en:'Main navigation'})}>
        <button onClick={openSearch}><Icon name="search" size={18}/>{searchLabel}</button>
        <button onClick={() => go({ name: 'faculties' })}><Icon name="building" size={18}/>{ui.facultiesTitle}</button>
        <button onClick={() => go({ name: 'apply' })}><Icon name="plus" size={18}/>{ui.catApply}</button>
      </nav>
      <div className="header-tools">
        <div className="languages" aria-label={L({ru:'Язык',kz:'Тіл',en:'Language'})}>
          {(['kz', 'ru', 'en'] as const).map(l => <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l === 'kz' ? 'ҚАЗ' : l === 'ru' ? 'РУС' : 'ENG'}</button>)}
        </div>
        <button className="desktop-tool mode-button" onClick={() => setPreview('kiosk')} title={kioskLabel} aria-label={kioskLabel}>
          <Icon name="kiosk" size={18}/>
        </button>
        <button className="desktop-tool" onClick={access}><Icon name={staff ? "gear" : "person"} size={18}/>{accessLabel}</button>
        {staff && <button className="desktop-tool" onClick={logout}><Icon name="logout" size={18}/>{ui.logoutBtn}</button>}
        <button className="menu-toggle" aria-expanded={menuOpen} aria-controls="compact-navigation" onClick={() => setMenuOpen(v => !v)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={menuOpen ? 'M6 6l12 12M6 18L18 6' : 'M4 6h16M4 12h16M4 18h16'}/></svg>
          {L({ru:'Меню',kz:'Мәзір',en:'Menu'})}
        </button>
      </div>
      {menuOpen && <nav id="compact-navigation" className="compact-navigation" aria-label={L({ru:'Меню сайта',kz:'Сайт мәзірі',en:'Site menu'})}>
        <button onClick={goHome}><Icon name="home" size={18}/>{ui.kioskHome}</button>
        <button onClick={openSearch}><Icon name="search" size={18}/>{searchLabel}</button>
        <button onClick={() => go({ name: 'faculties' })}><Icon name="building" size={18}/>{ui.facultiesTitle}</button>
        <button onClick={() => go({ name: 'apply' })}><Icon name="plus" size={18}/>{ui.catApply}</button>
        <button onClick={access}><Icon name={staff ? "gear" : "person"} size={18}/>{accessLabel}</button>
        <button onClick={() => setPreview('kiosk')}><Icon name="kiosk" size={18}/>{kioskLabel}</button>
        {staff && <button onClick={logout}><Icon name="logout" size={18}/>{ui.logoutBtn}</button>}
      </nav>}
    </header>
  )
}
