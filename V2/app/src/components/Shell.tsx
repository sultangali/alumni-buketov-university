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
        background: '#0F1218',
        backgroundImage: 'radial-gradient(circle at 22% 8%, #1A2230 0%, #11141C 62%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '26px 18px 48px',
        fontFamily: 'var(--font-ui)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, color: '#BFC8D6' }}>
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
              fontWeight: 600,
            }}
          >
            Alumni Buketov University
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            background: '#131722',
            border: '1px solid #2A3242',
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
          color: '#6A7384',
          fontSize: 11.5,
          maxWidth: 520,
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        Цифровая летопись · V2 · логотип-плейсхолдер можно заменить на герб университета. Переключайте
        язык, тему и режим экрана в самой системе.
      </div>
    </div>
  )
}
