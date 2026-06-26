import { useState, type CSSProperties } from 'react'
import { useApp } from '../AppContext'

type Role = 'mod' | 'admin'

/**
 * Access screen — the single entry point that replaced the old "Staff" button.
 * Everyone can submit an application; only staff (moderator / admin) can sign in.
 */
export function Access() {
  const { ui, go, login: signInApi } = useApp()
  const [role, setRole] = useState<Role>('mod')
  const [login, setLogin] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState(false)

  const signIn = async () => {
    const r = await signInApi(login.trim(), pass)
    if (r) {
      setError(false)
      go({ name: r === 'admin' ? 'admin' : 'mod' })
    } else {
      setError(true)
    }
  }

  const card: CSSProperties = {
    background: 'var(--c-surface)',
    border: 'var(--bw) solid var(--c-line)',
    borderRadius: 'var(--r)',
    padding: 22,
    boxShadow: 'var(--shadow)',
  }
  const label: CSSProperties = {
    fontSize: 'var(--t-2xs)',
    fontWeight: 700,
    letterSpacing: '.14em',
    textTransform: 'uppercase',
    color: 'var(--c-ink2)',
    marginBottom: 12,
  }
  const input: CSSProperties = {
    width: '100%',
    background: 'var(--c-bg2)',
    border: 'var(--bw) solid var(--c-line)',
    borderRadius: 'var(--r)',
    padding: '11px 14px',
    fontSize: 'var(--t-sm)',
    color: 'var(--c-ink)',
    fontFamily: 'var(--font-ui)',
    outline: 'none',
  }
  const fieldLabel: CSSProperties = {
    display: 'block',
    fontSize: 'var(--t-xs)',
    fontWeight: 600,
    color: 'var(--c-ink2)',
    marginBottom: 6,
  }

  const roleBtn = (r: Role): CSSProperties => ({
    flex: 1,
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: 'var(--t-sm)',
    padding: '10px 12px',
    borderRadius: 'var(--r)',
    border: `var(--bw) solid ${role === r ? 'var(--c-accent)' : 'var(--c-line)'}`,
    background: role === r ? 'var(--c-accent)' : 'transparent',
    color: role === r ? 'var(--c-on-accent)' : 'var(--c-ink2)',
    transition: 'all .15s ease',
  })

  return (
    <div style={{ animation: 'fadeUp .45s ease', padding: '24px var(--pad) 36px' }}>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: 'var(--c-ink)',
          fontSize: 'var(--t-2xl)',
          margin: '0 0 6px',
        }}
      >
        {ui.accessTitle}
      </h1>
      <div className="rule" style={{ height: 'var(--rule)', width: 64, background: 'var(--c-accent)', marginBottom: 12 }} />
      <p style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-base)', margin: '0 0 24px', maxWidth: 620 }}>
        {ui.accessLead}
      </p>

      <div
        className="stagger"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--gap-card)',
          alignItems: 'start',
        }}
      >
        {/* PUBLIC — submit application */}
        <div className="top-rule bd2" style={card}>
          <div style={label}>{ui.accessPublic}</div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              color: 'var(--c-ink)',
              fontSize: 'var(--t-lg)',
              lineHeight: 1.2,
              marginBottom: 8,
            }}
          >
            {ui.accessApply}
          </div>
          <p style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-sm)', lineHeight: 1.5, margin: '0 0 18px' }}>
            {ui.accessApplyDesc}
          </p>
          <button
            onClick={() => go({ name: 'apply' })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--c-accent)',
              color: 'var(--c-on-accent)',
              border: 'none',
              borderRadius: 'var(--r)',
              padding: '12px 22px',
              fontSize: 'var(--t-sm)',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {ui.accessApply} →
          </button>
        </div>

        {/* STAFF — sign in */}
        <div className="top-rule bd2" style={card}>
          <div style={label}>{ui.accessStaff}</div>
          <p style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-sm)', lineHeight: 1.5, margin: '0 0 16px' }}>
            {ui.accessStaffDesc}
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => { setRole('mod'); setError(false) }} style={roleBtn('mod')}>
              {ui.accessRoleMod}
            </button>
            <button onClick={() => { setRole('admin'); setError(false) }} style={roleBtn('admin')}>
              {ui.accessRoleAdmin}
            </button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>{ui.accessLoginPh}</label>
            <input
              value={login}
              onChange={(e) => { setLogin(e.target.value); setError(false) }}
              placeholder={ui.accessLoginPh}
              autoComplete="username"
              style={input}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>{ui.accessPassPh}</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => { setPass(e.target.value); setError(false) }}
              placeholder={ui.accessPassPh}
              autoComplete="current-password"
              onKeyDown={(e) => e.key === 'Enter' && signIn()}
              style={input}
            />
          </div>

          {error && (
            <div role="alert" style={{ color: '#C2410C', fontSize: 'var(--t-xs)', fontWeight: 600, marginBottom: 12 }}>
              {ui.accessError}
            </div>
          )}

          <button
            onClick={signIn}
            style={{
              width: '100%',
              background: 'var(--c-ink)',
              color: 'var(--c-bg)',
              border: 'none',
              borderRadius: 'var(--r)',
              padding: '12px 18px',
              fontSize: 'var(--t-sm)',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {ui.accessEnter}
          </button>

          <div style={{ marginTop: 14, fontSize: 'var(--t-2xs)', color: 'var(--c-ink2)', lineHeight: 1.5 }}>
            {ui.accessDemo}: <b>moderator / moder123</b> · <b>admin / admin123</b>
          </div>
        </div>
      </div>
    </div>
  )
}
