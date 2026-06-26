# Kiosk Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen vertical 9:16 kiosk mode (Hybrid A+B visitor touch-stand) to BOTH V1 and V2, reusing the existing app core.

**Architecture:** When `preview === 'kiosk'`, render a new `<KioskApp/>` (full-viewport vertical column, no demo stage) instead of the demo `Shell → Frame`. KioskApp composes kiosk chrome + a kiosk-aware screen router + idle/attract/keyboard/PIN overlays. Core (data, logic, routes, AppContext, i18n) is untouched; kiosk is an additive layer plus a render branch. V2 is the reference; V1 mirrors it with its own tokens/fonts.

**Tech Stack:** React 18 + TypeScript (strict) + Vite. Inline styles + CSS custom-property tokens. No CSS framework, no router lib, no test runner.

## Global Constraints

- Strict TS: no unused locals/params; exhaustive switches. Build must pass `tsc -b && vite build` clean.
- No new runtime dependencies (react/react-dom only).
- Reuse core verbatim: domain model, routes, i18n contract, `person()` resolver, data layer, AppContext. Do NOT modify the existing website Shell/Frame rendering path.
- Trilingual: every user-facing string is an i18n key added to all three blocks (ru/kz/en) in `data/i18n.ts`. Localized content via `L(loc)`.
- Touch targets ≥ 48px; no hover-only interactions; respect `prefers-reduced-motion`.
- Two apps: `V2/app` (reference, strict azure: `EB Garamond`/`Inter`, square `--r:0`, tokens incl. `--c-accent`/`--c-on-accent`) and `V1/app` (heritage navy/gold: `'Lora, serif'`/`'Manrope, sans-serif'`, rounded `--r:16`, uses `--c-primary` + `#fff` — NO `--c-accent` token).
- **Verification cycle (no test runner):** each task ends with (a) `npm run build` clean, (b) a dev-server visual check via the existing screenshot harness (`node` + playwright from `/home/sult/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`, chromium-1228), (c) commit. Demo PIN for staff: `2468`.
- Demo timings: attract idle 60000ms (set to 4000ms temporarily only while testing, then restore).

---

## File Structure (V2; V1 mirrors the same tree under `V1/app/src`)

Create:
- `V2/app/src/kiosk/KioskApp.tsx` — full-screen vertical container; mounts providers + idle + overlays + chrome + router.
- `V2/app/src/kiosk/KioskChrome.tsx` — top bar (logo w/ long-press, compact lang, mode-exit) + bottom nav.
- `V2/app/src/kiosk/KioskHome.tsx` — hub home (hero + search button + 2×2 tiles + apply CTA).
- `V2/app/src/kiosk/KioskSearch.tsx` — full-screen people search with on-screen keyboard.
- `V2/app/src/kiosk/AttractOverlay.tsx` — idle screensaver.
- `V2/app/src/kiosk/StaffPinOverlay.tsx` — hidden numeric PIN access.
- `V2/app/src/kiosk/OnScreenKeyboard.tsx` — touch keyboard (ru/en + digits).
- `V2/app/src/kiosk/keyboard.tsx` — `KeyboardProvider` + `useKeyboard()` context.
- `V2/app/src/kiosk/useIdle.ts` — idle timer hook.

Modify:
- `V2/app/src/App.tsx` — branch website vs kiosk under the provider.
- `V2/app/src/lib/theme.ts` — add kiosk density to `vars(theme, narrow, kiosk?)`.
- `V2/app/src/index.css` — `[data-kiosk]` rules (gallery grid, big rows, keyboard).
- `V2/app/src/data/i18n.ts` — kiosk i18n keys (ru/kz/en).
- `V2/app/src/screens/Apply.tsx` — bind inputs to the on-screen keyboard when in kiosk.

---

### Task 1: Kiosk render branch + full-screen vertical container

**Files:**
- Create: `V2/app/src/kiosk/KioskApp.tsx`
- Modify: `V2/app/src/App.tsx`

**Interfaces:**
- Produces: `export function KioskApp(): JSX.Element` — full-viewport vertical kiosk container that renders `<AppBar/>`? No — renders its own chrome later; for THIS task it renders the existing `<ScreenRouter/>` inside a 9:16 column so navigation works.

- [ ] **Step 1: Read current `App.tsx`**

Run: `sed -n '1,40p' "V2/app/src/App.tsx"`
Expected: see `<AppProvider><Shell/></AppProvider>`.

- [ ] **Step 2: Create `KioskApp.tsx` (minimal container)**

```tsx
import type { CSSProperties } from 'react'
import { useApp } from '../AppContext'
import { vars } from '../lib/theme'
import { ScreenRouter } from '../components/ScreenRouter'

export function KioskApp() {
  const { theme, motion } = useApp()

  const stage: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: '#05070b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  const screen: CSSProperties = {
    ...vars(theme, true, true),
    position: 'relative',
    height: '100dvh',
    aspectRatio: '9 / 16',
    maxWidth: '100vw',
    background: 'var(--c-bg)',
    color: 'var(--c-ink)',
    fontFamily: 'var(--font-ui, "Inter", system-ui, sans-serif)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <div style={stage}>
      <div style={screen} data-kiosk="1" data-motion={motion}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <ScreenRouter />
        </div>
      </div>
    </div>
  )
}
```

> NOTE: `vars(theme, true, true)` — the 3rd arg (kiosk) is added in Task 2; until then `vars` ignores it. To avoid a TS error now, Task 2 adds the optional param. If implementing strictly in order, temporarily call `vars(theme, true)` here and add the 3rd arg in Task 2 Step 4. Use `vars(theme, true)` for this task.

Replace the `...vars(theme, true, true)` line above with `...vars(theme, true),` for Task 1.

- [ ] **Step 3: Branch in `App.tsx`**

Read `App.tsx`; replace the body that renders `<Shell/>` with a switch component. Example final `App.tsx`:

```tsx
import { AppProvider, useApp } from './AppContext'
import { Shell } from './components/Shell'
import { KioskApp } from './kiosk/KioskApp'

function Stage() {
  const { preview } = useApp()
  return preview === 'kiosk' ? <KioskApp /> : <Shell />
}

export default function App() {
  return (
    <AppProvider>
      <Stage />
    </AppProvider>
  )
}
```

(Adjust imports to match the existing `App.tsx` — keep its existing import style and any extra wrappers.)

- [ ] **Step 4: Build**

Run: `cd "V2/app" && npm run build`
Expected: PASS (no TS errors).

- [ ] **Step 5: Visual check**

Run dev (`npm run dev -- --port 5182 --strictPort`), screenshot home, then toggle kiosk via the AppBar kiosk icon. Expected: kiosk fills the viewport as a vertical 9:16 column on a dark backdrop; the home content scrolls inside it; switching back to website restores the demo stage.

- [ ] **Step 6: Commit**

```bash
git add "V2/app/src/kiosk/KioskApp.tsx" "V2/app/src/App.tsx"
git commit -m "feat(kiosk): full-screen vertical kiosk render branch"
```

---

### Task 2: Kiosk density tokens + chrome (top bar + bottom nav)

**Files:**
- Modify: `V2/app/src/lib/theme.ts`
- Modify: `V2/app/src/data/i18n.ts`
- Create: `V2/app/src/kiosk/KioskChrome.tsx`
- Modify: `V2/app/src/kiosk/KioskApp.tsx`

**Interfaces:**
- Produces: `vars(theme: Theme, narrow: boolean, kiosk?: boolean): CSSProperties` (3rd optional arg). `export function KioskChrome(props: { children: ReactNode }): JSX.Element`.

- [ ] **Step 1: Add kiosk density to `vars()` in `theme.ts`**

Change the signature and merge an extra kiosk override block:

```ts
export function vars(theme: Theme, narrow: boolean, kiosk = false): CSSProperties {
  const merged: Record<string, string> = {
    ...base,
    ...themes[theme],
    '--pad': narrow ? '18px' : '48px',
    '--gap-card': narrow ? '12px' : '18px',
    '--gap-ctrl': narrow ? '6px' : '10px',
  }
  if (kiosk) {
    Object.assign(merged, {
      '--pad': '28px',
      '--gap-card': '16px',
      '--touch': '60px',
      '--t-2xs': '14px',
      '--t-xs': '15px',
      '--t-sm': '17px',
      '--t-base': '19px',
      '--t-md': '23px',
      '--t-lg': '30px',
      '--t-xl': '40px',
      '--t-2xl': '54px',
      '--t-3xl': '72px',
    })
  }
  return merged as CSSProperties
}
```

- [ ] **Step 2: Add kiosk i18n keys to all three blocks in `data/i18n.ts`**

Add after each block's `accessBtn` line (ru/kz/en respectively):

ru:
```ts
    kioskTouchStart: 'Коснитесь, чтобы начать',
    kioskHome: 'Главная',
    kioskApply: 'Подать заявку',
    kioskBack: 'Назад',
    kioskSearchBtn: 'Найти выпускника',
    kioskSearchPh: 'Имя или фамилия…',
    kioskCatAlumni: 'Выпускники',
    kioskPinTitle: 'Вход персонала',
    kioskPinWrong: 'Неверный PIN',
```
kz:
```ts
    kioskTouchStart: 'Бастау үшін түртіңіз',
    kioskHome: 'Басты бет',
    kioskApply: 'Өтінім беру',
    kioskBack: 'Артқа',
    kioskSearchBtn: 'Түлекті табу',
    kioskSearchPh: 'Аты-жөні…',
    kioskCatAlumni: 'Түлектер',
    kioskPinTitle: 'Қызметкерлер кірісі',
    kioskPinWrong: 'PIN қате',
```
en:
```ts
    kioskTouchStart: 'Touch to begin',
    kioskHome: 'Home',
    kioskApply: 'Apply',
    kioskBack: 'Back',
    kioskSearchBtn: 'Find a graduate',
    kioskSearchPh: 'Name or surname…',
    kioskCatAlumni: 'Alumni',
    kioskPinTitle: 'Staff sign-in',
    kioskPinWrong: 'Wrong PIN',
```

- [ ] **Step 3: Create `KioskChrome.tsx`**

```tsx
import type { CSSProperties, ReactNode } from 'react'
import { useApp } from '../AppContext'

export function KioskChrome({ children, onLogoHold }: { children: ReactNode; onLogoHold: () => void }) {
  const { ui, lang, setLang, go, goHome, showCrumb, back, setPreview } = useApp()

  let holdTimer: ReturnType<typeof setTimeout> | undefined
  const startHold = () => {
    holdTimer = setTimeout(onLogoHold, 2500)
  }
  const cancelHold = () => holdTimer && clearTimeout(holdTimer)

  const navBtn: CSSProperties = {
    flex: 1,
    minHeight: 'var(--touch)',
    border: 'var(--bw) solid var(--c-line)',
    borderRadius: 'var(--r)',
    background: 'transparent',
    color: 'var(--c-ink)',
    fontFamily: 'var(--font-ui, "Inter", sans-serif)',
    fontWeight: 600,
    fontSize: 'var(--t-sm)',
    cursor: 'pointer',
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px var(--pad)',
          borderBottom: 'var(--bw) solid var(--c-line)',
        }}
      >
        <img
          src="/logo.png"
          alt="Karaganda Buketov University"
          width={48}
          height={48}
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          style={{ display: 'block', objectFit: 'contain', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['ru', 'kz', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                minWidth: 48,
                minHeight: 44,
                border: 'var(--bw) solid var(--c-line)',
                borderRadius: 'var(--r)',
                background: lang === l ? 'var(--c-primary)' : 'transparent',
                color: lang === l ? '#fff' : 'var(--c-ink2)',
                fontWeight: 700,
                fontFamily: 'var(--font-ui, "Inter", sans-serif)',
                cursor: 'pointer',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
          {/* prototype-only exit to website */}
          <button
            onClick={() => setPreview('browser')}
            title="exit kiosk"
            style={{ minWidth: 44, minHeight: 44, border: 'var(--bw) solid var(--c-line)', borderRadius: 'var(--r)', background: 'transparent', color: 'var(--c-ink2)', cursor: 'pointer' }}
          >
            ⇱
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>{children}</div>

      <div style={{ display: 'flex', gap: 10, padding: '12px var(--pad)', borderTop: 'var(--bw) solid var(--c-line)' }}>
        {showCrumb && (
          <button style={navBtn} onClick={back}>
            ‹ {ui.kioskBack}
          </button>
        )}
        <button style={{ ...navBtn, background: 'var(--c-primary)', color: '#fff', borderColor: 'var(--c-primary)' }} onClick={goHome}>
          ▢ {ui.kioskHome}
        </button>
        <button style={navBtn} onClick={() => go({ name: 'apply' })}>
          ✚ {ui.kioskApply}
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Use kiosk vars + chrome in `KioskApp.tsx`**

Update KioskApp: change `vars(theme, true)` → `vars(theme, true, true)`; wrap router content in `<KioskChrome onLogoHold={...}>`. (The `onLogoHold` opens the PIN overlay — added in Task 8; for now pass `() => {}` and a TODO comment, OR add a local `useState` showing nothing. Use `() => {}` placeholder wired properly in Task 8.)

```tsx
      <div style={screen} data-kiosk="1" data-motion={motion}>
        <KioskChrome onLogoHold={() => {}}>
          <ScreenRouter />
        </KioskChrome>
      </div>
```

(Remove the previous inner scroll div — KioskChrome now owns the scroll region.)

- [ ] **Step 5: Build**

Run: `cd "V2/app" && npm run build`
Expected: PASS.

- [ ] **Step 6: Visual check**

Screenshot kiosk: top bar (logo + RU/KZ/EN + exit), big scaled type, bottom nav (Главная / Подать заявку). Tap «Подать заявку» → Apply screen. Tap a lang → UI switches.

- [ ] **Step 7: Commit**

```bash
git add "V2/app/src/lib/theme.ts" "V2/app/src/data/i18n.ts" "V2/app/src/kiosk/KioskChrome.tsx" "V2/app/src/kiosk/KioskApp.tsx"
git commit -m "feat(kiosk): density tokens + top/bottom chrome"
```

---

### Task 3: KioskHome hub (Hybrid B)

**Files:**
- Create: `V2/app/src/kiosk/KioskHome.tsx`
- Modify: `V2/app/src/kiosk/KioskApp.tsx`

**Interfaces:**
- Consumes: `useApp()` (`ui`, `go`, `setKioskSearch?` — search opens via route or local state; here Home receives `onSearch: () => void`).
- Produces: `export function KioskHome(props: { onSearch: () => void }): JSX.Element`.

- [ ] **Step 1: Create `KioskHome.tsx`**

```tsx
import type { CSSProperties } from 'react'
import { useApp } from '../AppContext'
import type { Route } from '../types'

export function KioskHome({ onSearch }: { onSearch: () => void }) {
  const { ui, go } = useApp()

  const tiles: { route: Route; icon: string; title: string }[] = [
    { route: { name: 'faculties' }, icon: '🎓', title: ui.kioskCatAlumni },
    { route: { name: 'teachers' }, icon: '👤', title: ui.catTeachers },
    { route: { name: 'laureates' }, icon: '🏆', title: ui.catLaureates },
    { route: { name: 'veterans' }, icon: '🎖', title: ui.catVeterans },
  ]

  const tile: CSSProperties = {
    border: 'var(--bw) solid var(--c-line2, var(--c-line))',
    borderTop: '3px solid var(--c-primary)',
    borderRadius: 'var(--r)',
    background: 'var(--c-surface)',
    padding: 20,
    minHeight: 120,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'var(--font-ui, "Inter", sans-serif)',
  }

  return (
    <div style={{ padding: '24px var(--pad) 28px', animation: 'fadeUp .4s ease' }}>
      <h1 style={{ fontFamily: 'var(--font-display, "EB Garamond", serif)', fontWeight: 700, fontSize: 'var(--t-2xl)', lineHeight: 1.05, margin: '0 0 10px' }}>
        {ui.heroTitle}
      </h1>
      <div style={{ height: 3, width: 64, background: 'var(--c-primary)', marginBottom: 18 }} />

      <button
        onClick={onSearch}
        style={{ width: '100%', minHeight: 'var(--touch)', display: 'flex', alignItems: 'center', gap: 12, border: '2px solid var(--c-line2, var(--c-line))', borderRadius: 'var(--r)', background: 'var(--c-bg2)', color: 'var(--c-ink2)', fontSize: 'var(--t-md)', fontWeight: 600, padding: '0 18px', cursor: 'pointer', marginBottom: 18 }}
      >
        🔍 {ui.kioskSearchBtn}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--gap-card)', marginBottom: 18 }}>
        {tiles.map((t, i) => (
          <button key={i} onClick={() => go(t.route)} style={tile}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--r)', background: 'var(--c-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{t.icon}</div>
            <div style={{ fontFamily: 'var(--font-display, "EB Garamond", serif)', fontWeight: 600, fontSize: 'var(--t-md)' }}>{t.title}</div>
          </button>
        ))}
      </div>

      <button
        onClick={() => go({ name: 'apply' })}
        style={{ width: '100%', minHeight: 'var(--touch)', border: 'none', borderRadius: 'var(--r)', background: 'var(--c-primary)', color: '#fff', fontSize: 'var(--t-md)', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui, "Inter", sans-serif)' }}
      >
        ✚ {ui.kioskApply}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Render KioskHome for the `home` route in `KioskApp.tsx`**

Add `const { route } = useApp()` and a local search state:

```tsx
import { useState } from 'react'
// ...
const { theme, motion, route } = useApp()
const [search, setSearch] = useState(false)
// inside KioskChrome:
{search ? <KioskSearch onClose={() => setSearch(false)} />
 : route.name === 'home' ? <KioskHome onSearch={() => setSearch(true)} />
 : <ScreenRouter />}
```

(`KioskSearch` is created in Task 6; until then render `route.name === 'home' ? <KioskHome onSearch={() => {}}/> : <ScreenRouter/>` and add search wiring in Task 6.)

- [ ] **Step 3: Build** — `cd "V2/app" && npm run build` → PASS.

- [ ] **Step 4: Visual check** — kiosk home shows hero + big search button + 2×2 tiles (Выпускники/Преподаватели/Лауреаты/Ветераны) + «Подать заявку» CTA. Tapping a tile navigates; bottom «Главная» returns.

- [ ] **Step 5: Commit**

```bash
git add "V2/app/src/kiosk/KioskHome.tsx" "V2/app/src/kiosk/KioskApp.tsx"
git commit -m "feat(kiosk): hub home (hero + tiles + search + apply CTA)"
```

---

### Task 4: Gallery-grid styling for browse screens (Concept A) under `[data-kiosk]`

**Files:**
- Modify: `V2/app/src/index.css`

**Interfaces:** none (CSS only; targets existing Collection/Faculty grids rendered inside `[data-kiosk]`).

- [ ] **Step 1: Append kiosk CSS to `index.css`**

```css
/* ---- Kiosk: larger touch rows & gallery grid ---- */
[data-kiosk] button { -webkit-tap-highlight-color: transparent; }
[data-kiosk] .lift:active,
[data-kiosk] .lift-card:active,
[data-kiosk] .lift-lg:active { transform: scale(0.98); }
[data-kiosk] input { font-size: 18px; }
```

(The grids already use `repeat(auto-fill, minmax(...))`; the larger kiosk type tokens enlarge them automatically. Keep this minimal — do not restructure screens.)

- [ ] **Step 2: Build** — PASS.

- [ ] **Step 3: Visual check** — navigate kiosk → Преподаватели / a faculty: cards are large, two-up, comfortable for touch; tapping a person opens the profile.

- [ ] **Step 4: Commit**

```bash
git add "V2/app/src/index.css"
git commit -m "feat(kiosk): touch-friendly grid/press styling"
```

---

### Task 5: Idle hook + Attract overlay

**Files:**
- Create: `V2/app/src/kiosk/useIdle.ts`
- Create: `V2/app/src/kiosk/AttractOverlay.tsx`
- Modify: `V2/app/src/kiosk/KioskApp.tsx`

**Interfaces:**
- Produces: `export function useIdle(ms: number, onIdle: () => void): void`. `export function AttractOverlay(props: { onDismiss: () => void }): JSX.Element`.

- [ ] **Step 1: Create `useIdle.ts`**

```ts
import { useEffect, useRef } from 'react'

/** Fires `onIdle` after `ms` of no pointer/touch/key interaction; resets on activity. */
export function useIdle(ms: number, onIdle: () => void) {
  const cb = useRef(onIdle)
  cb.current = onIdle
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const reset = () => {
      clearTimeout(t)
      t = setTimeout(() => cb.current(), ms)
    }
    const evts = ['pointerdown', 'touchstart', 'keydown', 'wheel'] as const
    evts.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      clearTimeout(t)
      evts.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [ms])
}
```

- [ ] **Step 2: Create `AttractOverlay.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useApp } from '../AppContext'
import { featList, cardGrad, initials } from '../lib/logic'

export function AttractOverlay({ onDismiss }: { onDismiss: () => void }) {
  const { ui, L } = useApp()
  const feats = featList()
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % Math.max(1, feats.length)), 5000)
    return () => clearInterval(t)
  }, [feats.length])
  const p = feats[i] || feats[0]
  if (!p) return null

  return (
    <div
      onPointerDown={onDismiss}
      style={{ position: 'absolute', inset: 0, zIndex: 100, background: cardGrad(p.accent), color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', cursor: 'pointer', animation: 'fadeIn .5s ease' }}
    >
      <div style={{ position: 'absolute', top: '22%', fontFamily: 'var(--font-display, "EB Garamond", serif)', fontWeight: 700, fontSize: 140, opacity: 0.95 }}>
        {initials(p.name)}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(6,12,24,.85))' }} />
      <div style={{ position: 'relative', textAlign: 'center', padding: '0 24px 56px' }}>
        <div style={{ fontFamily: 'var(--font-display, "EB Garamond", serif)', fontWeight: 700, fontSize: 'var(--t-2xl)', marginBottom: 8 }}>{L(p.name)}</div>
        <div style={{ opacity: 0.85, fontSize: 'var(--t-base)', marginBottom: 26 }}>{L(p.pos)}</div>
        <div data-loop="1" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: '1.5px solid rgba(255,255,255,.6)', borderRadius: 999, padding: '14px 26px', fontSize: 'var(--t-base)', fontWeight: 600, animation: 'glowpulse 2s ease-in-out infinite' }}>
          ▶ {ui.kioskTouchStart}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire idle + attract in `KioskApp.tsx`**

```tsx
import { useIdle } from './useIdle'
import { AttractOverlay } from './AttractOverlay'
// ...
const { theme, motion, route, goHome, setListQuery, setListYear } = useApp()
const [attract, setAttract] = useState(false)
const [search, setSearch] = useState(false)
useIdle(60000, () => {
  setSearch(false)
  setListQuery('')
  setListYear('all')
  goHome()
  setAttract(true)
})
// render, after the screen div content:
{attract && <AttractOverlay onDismiss={() => setAttract(false)} />}
```

(Place `<AttractOverlay/>` as a child of the `screen` div so it covers only the kiosk screen.)

- [ ] **Step 4: Build** — PASS.

- [ ] **Step 5: Visual check** — temporarily set `useIdle(4000, …)`; after 4s idle the attract overlay appears (rotating featured person + «Коснитесь, чтобы начать»); a tap dismisses it and lands on Home. Restore to `60000` and commit.

- [ ] **Step 6: Commit**

```bash
git add "V2/app/src/kiosk/useIdle.ts" "V2/app/src/kiosk/AttractOverlay.tsx" "V2/app/src/kiosk/KioskApp.tsx"
git commit -m "feat(kiosk): idle attract overlay + auto-reset"
```

---

### Task 6: On-screen keyboard + keyboard context + KioskSearch

**Files:**
- Create: `V2/app/src/kiosk/keyboard.tsx`
- Create: `V2/app/src/kiosk/OnScreenKeyboard.tsx`
- Create: `V2/app/src/kiosk/KioskSearch.tsx`
- Modify: `V2/app/src/kiosk/KioskApp.tsx`

**Interfaces:**
- Produces:
  - `keyboard.tsx`: `export function KeyboardProvider(p:{children:ReactNode}): JSX.Element`; `export function useKeyboard(): { focus(setter:(u:(v:string)=>string)=>void): void; blur(): void; active: boolean; type(ch:string): void; backspace(): void; layout:'ru'|'en'; setLayout(l:'ru'|'en'): void }`.
  - `OnScreenKeyboard.tsx`: `export function OnScreenKeyboard(): JSX.Element | null` (renders only when `active`).
  - `KioskSearch.tsx`: `export function KioskSearch(p:{onClose():void}): JSX.Element`.

- [ ] **Step 1: Create `keyboard.tsx` (context)**

```tsx
import { createContext, useContext, useRef, useState, type ReactNode } from 'react'

type Setter = (updater: (v: string) => string) => void
interface KB {
  focus(setter: Setter): void
  blur(): void
  active: boolean
  type(ch: string): void
  backspace(): void
  layout: 'ru' | 'en'
  setLayout(l: 'ru' | 'en'): void
}
const Ctx = createContext<KB | null>(null)
export const useKeyboard = (): KB => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useKeyboard outside KeyboardProvider')
  return v
}

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const setter = useRef<Setter | null>(null)
  const [active, setActive] = useState(false)
  const [layout, setLayout] = useState<'ru' | 'en'>('ru')
  const api: KB = {
    focus(s) { setter.current = s; setActive(true) },
    blur() { setActive(false) },
    active,
    type(ch) { setter.current?.((v) => v + ch) },
    backspace() { setter.current?.((v) => v.slice(0, -1)) },
    layout,
    setLayout,
  }
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
```

- [ ] **Step 2: Create `OnScreenKeyboard.tsx`**

```tsx
import type { CSSProperties } from 'react'
import { useKeyboard } from './keyboard'

const RU = ['ЙЦУКЕНГШЩЗХ', 'ФЫВАПРОЛДЖЭ', 'ЯЧСМИТЬБЮ']
const EN = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

export function OnScreenKeyboard() {
  const kb = useKeyboard()
  if (!kb.active) return null
  const rows = kb.layout === 'ru' ? RU : EN

  const key: CSSProperties = { minWidth: 30, height: 52, flex: 1, maxWidth: 56, border: '1px solid var(--c-line)', borderRadius: 'var(--r)', background: 'var(--c-surface)', color: 'var(--c-ink)', fontSize: 18, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui, "Inter", sans-serif)' }
  const wide: CSSProperties = { ...key, maxWidth: 120 }

  return (
    <div style={{ background: 'var(--c-bg2)', borderTop: '1px solid var(--c-line)', padding: '10px 8px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {'1234567890'.split('').map((d) => (<button key={d} style={key} onClick={() => kb.type(d)}>{d}</button>))}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {r.split('').map((c) => (<button key={c} style={key} onClick={() => kb.type(c)}>{c}</button>))}
          {i === rows.length - 1 && (<button style={wide} onClick={kb.backspace}>⌫</button>)}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        <button style={wide} onClick={() => kb.setLayout(kb.layout === 'ru' ? 'en' : 'ru')}>{kb.layout === 'ru' ? 'EN' : 'РУ'}</button>
        <button style={{ ...key, maxWidth: 240 }} onClick={() => kb.type(' ')}>␣</button>
        <button style={key} onClick={() => kb.type('@')}>@</button>
        <button style={wide} onClick={kb.blur}>✓</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `KioskSearch.tsx`**

```tsx
import { useEffect, useState, type CSSProperties } from 'react'
import { useApp } from '../AppContext'
import { ALU } from '../data/records'
import { TEACHERS, LAUREATES, VETERANS } from '../data/records'
import { alumnusToPerson, cardGrad, initials } from '../lib/logic'
import { useKeyboard } from './keyboard'
import { OnScreenKeyboard } from './OnScreenKeyboard'

export function KioskSearch({ onClose }: { onClose: () => void }) {
  const { ui, L, go } = useApp()
  const kb = useKeyboard()
  const [q, setQ] = useState('')
  useEffect(() => () => kb.blur(), [kb])

  const people = [...ALU.map(alumnusToPerson), ...TEACHERS, ...LAUREATES, ...VETERANS]
  const query = q.trim().toLowerCase()
  const results = query ? people.filter((p) => L(p.name).toLowerCase().includes(query)).slice(0, 30) : []

  const field: CSSProperties = { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 'var(--t-md)', color: 'var(--c-ink)', fontFamily: 'var(--font-ui, "Inter", sans-serif)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 'var(--pad)', border: '2px solid var(--c-primary)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
        🔍
        <input autoFocus value={q} placeholder={ui.kioskSearchPh} style={field}
          onFocus={() => kb.focus(setQ)}
          onChange={(e) => setQ(e.target.value)} />
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--c-ink2)', fontSize: 'var(--t-md)', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 var(--pad)' }}>
        {results.map((p) => (
          <button key={p.id} onClick={() => { kb.blur(); onClose(); go({ name: 'alumni', id: p.id }) }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--c-line)', background: 'transparent', padding: '14px 0', cursor: 'pointer' }}>
            <div style={{ width: 52, height: 52, borderRadius: 'var(--r)', background: cardGrad(p.accent), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display, "EB Garamond", serif)', fontWeight: 700 }}>{initials(p.name)}</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display, "EB Garamond", serif)', fontWeight: 600, fontSize: 'var(--t-md)', color: 'var(--c-ink)' }}>{L(p.name)}</div>
              <div style={{ color: 'var(--c-ink2)', fontSize: 'var(--t-sm)' }}>{L(p.pos)}</div>
            </div>
          </button>
        ))}
      </div>
      <OnScreenKeyboard />
    </div>
  )
}
```

> NOTE: confirm `records.ts` exports `TEACHERS, LAUREATES, VETERANS` (it does per ARCHITECTURE). If a single import line is cleaner, combine: `import { ALU, TEACHERS, LAUREATES, VETERANS } from '../data/records'`.

- [ ] **Step 4: Wrap KioskApp content in `KeyboardProvider` and wire search**

In `KioskApp.tsx`: import `KeyboardProvider`, `KioskSearch`; wrap the `screen` children with `<KeyboardProvider>`; render `search ? <KioskSearch onClose={() => setSearch(false)} /> : route.name==='home' ? <KioskHome onSearch={() => setSearch(true)} /> : <ScreenRouter/>`.

- [ ] **Step 5: Build** — PASS.

- [ ] **Step 6: Visual check** — tap the big «Найти выпускника» on home → search screen; focusing the field shows the on-screen keyboard; tapping keys (e.g. ЖУМА) filters results live; EN/РУ toggle switches layout; tapping a result opens the profile; ✓ hides the keyboard.

- [ ] **Step 7: Commit**

```bash
git add "V2/app/src/kiosk/keyboard.tsx" "V2/app/src/kiosk/OnScreenKeyboard.tsx" "V2/app/src/kiosk/KioskSearch.tsx" "V2/app/src/kiosk/KioskApp.tsx"
git commit -m "feat(kiosk): on-screen keyboard + people search"
```

---

### Task 7: Bind the Apply form inputs to the on-screen keyboard in kiosk

**Files:**
- Modify: `V2/app/src/screens/Apply.tsx`
- Modify: `V2/app/src/kiosk/OnScreenKeyboard.tsx` (mount globally — already rendered by KioskSearch; for Apply we mount it in KioskApp)
- Modify: `V2/app/src/kiosk/KioskApp.tsx`

**Interfaces:**
- Consumes: `useKeyboard()` from `keyboard.tsx`.

- [ ] **Step 1: Mount a global keyboard in KioskApp (covers Apply and any screen input)**

In `KioskApp.tsx`, render `<OnScreenKeyboard/>` once just inside the `screen` div, BELOW the scroll/chrome area (it self-hides when inactive). Remove the per-`KioskSearch` mount to avoid two keyboards (or keep KioskSearch's and skip global — choose ONE; recommended: keep the global one in KioskApp and delete the `<OnScreenKeyboard/>` line from KioskSearch).

- [ ] **Step 2: In `Apply.tsx`, bind text inputs to the keyboard when in kiosk**

At top of `Apply()`:
```tsx
import { useKeyboard } from '../kiosk/keyboard'
// inside component:
const kbCtx = (() => { try { return useKeyboard() } catch { return null } })()
```
> Hooks cannot be called conditionally. Instead: always call a safe hook. Implement a `useOptionalKeyboard()` in `keyboard.tsx`:
```tsx
export const useOptionalKeyboard = () => useContext(Ctx)
```
Use `const kbCtx = useOptionalKeyboard()`. On each text input/textarea add: `onFocus={() => kbCtx?.focus(setName)}` (and the matching setter per field: `setFacOther`, `setSpec`, `setPos`, `setContact`, `setBio`). For the year field, focusing still opens the keyboard (digits row present).

- [ ] **Step 3: Build** — PASS.

- [ ] **Step 4: Visual check** — in kiosk, open Apply; focusing each field shows the keyboard and typing fills that field; submit works; success screen shows; idle auto-resets.

- [ ] **Step 5: Commit**

```bash
git add "V2/app/src/screens/Apply.tsx" "V2/app/src/kiosk/keyboard.tsx" "V2/app/src/kiosk/KioskApp.tsx" "V2/app/src/kiosk/KioskSearch.tsx"
git commit -m "feat(kiosk): bind Apply inputs to on-screen keyboard"
```

---

### Task 8: Hidden staff PIN access (long-press logo)

**Files:**
- Create: `V2/app/src/kiosk/StaffPinOverlay.tsx`
- Modify: `V2/app/src/kiosk/KioskApp.tsx`

**Interfaces:**
- Produces: `export function StaffPinOverlay(p:{onClose():void}): JSX.Element`.

- [ ] **Step 1: Create `StaffPinOverlay.tsx`**

```tsx
import { useState, type CSSProperties } from 'react'
import { useApp } from '../AppContext'

const PIN = '2468'

export function StaffPinOverlay({ onClose }: { onClose: () => void }) {
  const { ui, go } = useApp()
  const [val, setVal] = useState('')
  const [err, setErr] = useState(false)

  const press = (d: string) => {
    setErr(false)
    const next = (val + d).slice(0, 4)
    setVal(next)
    if (next.length === 4) {
      if (next === PIN) { onClose(); go({ name: 'access' }) }
      else { setErr(true); setVal('') }
    }
  }

  const padBtn: CSSProperties = { minHeight: 'var(--touch)', fontSize: 'var(--t-lg)', fontWeight: 700, border: 'var(--bw) solid var(--c-line)', borderRadius: 'var(--r)', background: 'var(--c-surface)', color: 'var(--c-ink)', cursor: 'pointer', fontFamily: 'var(--font-ui, "Inter", sans-serif)' }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 120, background: 'rgba(6,12,24,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 320, background: 'var(--c-bg)', border: 'var(--bw) solid var(--c-line)', borderRadius: 'var(--r)', padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-display, "EB Garamond", serif)', fontWeight: 700, fontSize: 'var(--t-lg)' }}>{ui.kioskPinTitle}</div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--c-ink2)', fontSize: 'var(--t-md)', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ textAlign: 'center', letterSpacing: 10, fontSize: 28, minHeight: 34, color: err ? '#c2410c' : 'var(--c-ink)' }}>
          {'•'.repeat(val.length)}{'◦'.repeat(4 - val.length)}
        </div>
        {err && <div style={{ textAlign: 'center', color: '#c2410c', fontSize: 'var(--t-xs)', fontWeight: 600, margin: '6px 0' }}>{ui.kioskPinWrong}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
          {['1','2','3','4','5','6','7','8','9'].map((d) => <button key={d} style={padBtn} onClick={() => press(d)}>{d}</button>)}
          <div />
          <button style={padBtn} onClick={() => press('0')}>0</button>
          <button style={padBtn} onClick={() => setVal((v) => v.slice(0, -1))}>⌫</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire long-press in KioskApp**

In `KioskApp.tsx`: `const [pin, setPin] = useState(false)`; pass `onLogoHold={() => setPin(true)}` to `KioskChrome`; render `{pin && <StaffPinOverlay onClose={() => setPin(false)} />}` inside the `screen` div.

- [ ] **Step 3: Build** — PASS.

- [ ] **Step 4: Visual check** — the kiosk has no visible «Войти»; long-pressing the logo ~2.5s opens the PIN pad; `2468` → access/staff; a wrong code shows «Неверный PIN» and clears; ✕ closes.

- [ ] **Step 5: Commit**

```bash
git add "V2/app/src/kiosk/StaffPinOverlay.tsx" "V2/app/src/kiosk/KioskApp.tsx"
git commit -m "feat(kiosk): hidden staff PIN access via long-press"
```

---

### Task 9: V2 polish + website regression check

**Files:** none new (verification + small fixes only).

- [ ] **Step 1: Build** — `cd "V2/app" && npm run build` → PASS.
- [ ] **Step 2: Full kiosk walkthrough screenshots** — home, a faculty gallery, a profile, search+keyboard, apply+keyboard, attract (temp 4s), PIN. All three languages on home. Light/dark/contrast themes render in kiosk.
- [ ] **Step 3: Website regression** — switch to website (browser) mode: Shell/Frame, scroll-reset, watermark, AppBar mode switch, all screens unchanged.
- [ ] **Step 4: Commit any fixes**

```bash
git add -A "V2/app/src"
git commit -m "fix(kiosk): v2 polish + regression pass"
```

---

### Task 10: Mirror the entire kiosk to V1

**Files (create under `V1/app/src/kiosk/`):** `KioskApp.tsx`, `KioskChrome.tsx`, `KioskHome.tsx`, `KioskSearch.tsx`, `AttractOverlay.tsx`, `StaffPinOverlay.tsx`, `OnScreenKeyboard.tsx`, `keyboard.tsx`, `useIdle.ts`.
**Modify:** `V1/app/src/App.tsx`, `V1/app/src/lib/theme.ts`, `V1/app/src/index.css`, `V1/app/src/data/i18n.ts`, `V1/app/src/screens/Apply.tsx`.

**Interfaces:** identical to V2; only styling differs.

V1 substitution rules (apply to every copied file):
- Fonts: `var(--font-display, …)` → `'Lora, serif'`; `var(--font-ui, …)` → `'Manrope, sans-serif'`.
- Accent: V1 has **no** `--c-accent`/`--c-on-accent`. Replace `var(--c-accent)` → `var(--c-primary)`, `var(--c-on-accent)` → `#fff`, `var(--c-line2, var(--c-line))` → `var(--c-line)`.
- Radii are already token-driven (`var(--r)` = 16 rounded in V1) — keep `var(--r)`. The kiosk top-rule on tiles (`borderTop: '3px solid var(--c-primary)'`) stays.
- `theme.ts`: add the SAME kiosk override block to V1's `vars()` (V1's base scale is similar; reuse the kiosk type values from Task 2 Step 1).
- i18n: add the SAME `kiosk*` keys (Task 2 Step 2) to V1's three blocks.
- `keyboard.tsx`, `useIdle.ts`: copy verbatim (no styling).

- [ ] **Step 1: Copy the 9 kiosk files from V2 to V1**

```bash
cp -r "V2/app/src/kiosk" "V1/app/src/kiosk"
```

- [ ] **Step 2: Apply V1 substitutions** — in `V1/app/src/kiosk/*.tsx`, run the font/accent replacements above (sed per file, then eyeball). Example:
```bash
cd "V1/app/src/kiosk" && for f in *.tsx; do sed -i \
  -e "s/var(--font-display, [^)]*)/'Lora, serif'/g" \
  -e "s/var(--font-ui, [^)]*)/'Manrope, sans-serif'/g" \
  -e 's/var(--c-accent)/var(--c-primary)/g' \
  -e 's/var(--c-on-accent)/#fff/g' \
  -e 's/var(--c-line2, var(--c-line))/var(--c-line)/g' "$f"; done
```
> Verify the sed for the font fallback patterns matched (they use `'EB Garamond', serif` etc. with commas — adjust the regex if needed; safest is a manual replace per file).

- [ ] **Step 3: Add kiosk density to `V1/app/src/lib/theme.ts`** (same block as Task 2 Step 1).

- [ ] **Step 4: Add kiosk i18n keys to `V1/app/src/data/i18n.ts`** (same as Task 2 Step 2).

- [ ] **Step 5: Branch `V1/app/src/App.tsx`** (same as Task 1 Step 3, V1 paths).

- [ ] **Step 6: Append kiosk CSS to `V1/app/src/index.css`** (same as Task 4 Step 1).

- [ ] **Step 7: Bind Apply inputs in `V1/app/src/screens/Apply.tsx`** (same as Task 7, using `useOptionalKeyboard`; V1 Apply has the same fields).

- [ ] **Step 8: Build** — `cd "V1/app" && npm run build` → PASS.

- [ ] **Step 9: Visual check (V1)** — full kiosk walkthrough in V1 heritage style (rounded, navy/gold, Lora/Manrope): home hub, gallery, search+keyboard, apply, attract, PIN.

- [ ] **Step 10: Commit**

```bash
git add "V1/app/src"
git commit -m "feat(kiosk): mirror kiosk mode to V1 (heritage styling)"
```

---

## Self-Review (completed)

- **Spec coverage:** activation/full-screen (T1), tokens/chrome (T2), KioskHome hub-B (T3), gallery-A (T4), attract+auto-reset+useIdle (T5), keyboard+search (T6), apply-on-kiosk (T7), hidden staff PIN (T8), both versions (T10), website-untouched regression (T9). All spec sections mapped.
- **Placeholders:** the only forward references (KioskSearch/StaffPinOverlay used before creation) are explicitly handled with interim `() => {}` placeholders and resolved in their creating task. No "TBD".
- **Type consistency:** `vars(theme, narrow, kiosk?)`, `useKeyboard()`/`useOptionalKeyboard()`, `useIdle(ms, cb)`, component prop names (`onSearch`, `onClose`, `onDismiss`, `onLogoHold`, `onClose`) are consistent across tasks.
- **No-test-runner adaptation:** each task verifies via `npm run build` + dev screenshot + commit, as stated in Global Constraints.
