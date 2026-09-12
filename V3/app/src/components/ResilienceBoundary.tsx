import { Component, type ReactNode } from 'react'
import { isNativeKiosk, nativeRequest } from '../lib/kiosk'

/** A bad record/render must leave a recoverable screen, not a blank WebView. */
export class ResilienceBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state = { failed: false }
  private hold: ReturnType<typeof setTimeout> | undefined
  static getDerivedStateFromError() { return { failed: true } }
  componentWillUnmount() { clearTimeout(this.hold) }
  render() {
    if (!this.state.failed) return this.props.children
    return <main style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,boxSizing:'border-box',fontFamily:'system-ui',background:'#f4f7fb',color:'#18304f',textAlign:'center'}}>
      <img src="/logo.png" alt="Buketov University" width={80} height={80}
        onPointerDown={() => { clearTimeout(this.hold); if (isNativeKiosk()) this.hold=setTimeout(()=>{void nativeRequest('maintenance').catch(()=>{})},2500) }}
        onPointerUp={() => clearTimeout(this.hold)} onPointerCancel={() => clearTimeout(this.hold)} onPointerLeave={() => clearTimeout(this.hold)} />
      <h1>Не удалось открыть страницу</h1>
      <p>Сақталған өтінімдер жойылмайды.<br/>Сохранённые заявки не удаляются.<br/>Saved applications are not deleted.</p>
      <button style={{padding:'16px 24px',fontSize:20}} onClick={()=>window.location.replace(isNativeKiosk()?'/?preview=kiosk':'/')}>
        Қайта ашу / Открыть заново / Reopen
      </button>
    </main>
  }
}
