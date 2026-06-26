import { useApp } from '../AppContext'
import { tabSeg } from '../lib/logic'
import { Frame } from './Frame'

/** The outer "demo" page: brand row, kiosk/browser toggle, device frame, caption. */
export function Shell() {
  const { narrow, setPreview } = useApp()

  return (
    <div
      style={{
        minHeight: '100%',
        width: '100%',
        background: '#1b2433',
        backgroundImage: 'radial-gradient(circle at 20% 10%, #243049 0%, #161d2a 60%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '26px 18px 48px',
        fontFamily: 'Manrope, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          marginBottom: 22,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, color: '#aebbd2' }}>
          <img
            src="/logo.png"
            alt="Karaganda Buketov University"
            width={34}
            height={34}
            style={{ display: 'block', objectFit: 'contain' }}
          />
          <div
            style={{
              fontSize: 13,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Alumni Buketov University
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            background: '#0e1320',
            border: '1px solid #2b3650',
            borderRadius: 999,
            padding: 4,
          }}
        >
          <button onClick={() => setPreview('kiosk')} style={tabSeg(narrow)}>
            Киоск · вертикальный
          </button>
          <button onClick={() => setPreview('browser')} style={tabSeg(!narrow)}>
            Браузер · горизонтальный
          </button>
        </div>
      </div>

      <Frame />

      <div
        style={{
          marginTop: 16,
          color: '#5f6d86',
          fontSize: 11.5,
          maxWidth: 520,
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        Прототип V1 · логотип-плейсхолдер можно заменить на герб университета. Переключайте язык, тему
        и режим экрана в самой системе.
      </div>
    </div>
  )
}
