# Kiosk Mode — "Hybrid A+B" Visitor Touch-Stand

**Date:** 2026-06-25
**Applies to:** BOTH V1 (`V1/app`) and V2 (`V2/app`). Shared structure and behaviour;
styling per version (V1 heritage navy/gold + Lora/Manrope + rounded; V2 strict
azure + EB Garamond/Inter + square). V2 is the reference implementation; V1 mirrors
it with its own tokens/fonts.

---

## 1. Goal & context

A **vertical 9:16 touchscreen stand for visitors** in the university foyer/museum.
Primary job: let passers-by browse the Hall of Fame (alumni, teachers, laureates,
veterans, faculties); secondary: search for a specific person and submit an
application on-site. It must feel different from the responsive website — immersive,
full-screen, large touch targets, no hover reliance, self-running (attract loop +
auto-reset).

Chosen interface concept: **Hybrid A+B** — Home is a hub (hero + big section tiles +
search + apply CTA, concept B); inside sections the browse view is an immersive
large-portrait gallery grid (concept A).

The website/kiosk **mode switch already exists** in the AppBar (built 2026-06-24),
wired to `preview` (`'browser' | 'kiosk'`) in `AppContext`. Today `preview==='kiosk'`
only narrows the device mock. This spec makes kiosk a **distinct full-screen mode**.

---

## 2. Architecture

Reuse the entire core unchanged: `data/*`, `lib/logic.ts`, routes/`AppContext`
(state, `go/back/goHome`, submissions), i18n. Kiosk is an **alternative chrome +
home + overlays** layer selected by `preview==='kiosk'`.

Selection point: `App` / `Shell`. When `preview==='kiosk'`, render `<KioskApp/>`
(full-viewport vertical column, dark surround, no demo stage / browser chrome)
instead of the demo `Shell → Frame`. When `'browser'`, render the existing
responsive Shell/Frame (unchanged).

```
App
 ├─ preview==='browser' → Shell → Frame → AppBar + ScreenRouter + Footer   (unchanged)
 └─ preview==='kiosk'   → KioskApp
        ├─ KioskChrome (top bar + bottom nav)
        ├─ ScreenRouter            (reused; route 'home' → KioskHome)
        ├─ AttractOverlay          (idle screensaver)
        ├─ OnScreenKeyboard        (mounted when an input is focused)
        └─ StaffPinOverlay         (hidden access)
```

`KioskApp` renders a centred 9:16 column sized to viewport height
(`height: 100dvh; aspect-ratio: 9/16; max-width: 100vw`) on a dark backdrop, so on a
desktop preview it reads as the kiosk screen; on a real portrait display it fills it.

`ScreenRouter` gains a kiosk branch for `home`: when kiosk, render `<KioskHome/>`
instead of the website `<Home/>`. Other routes (`faculty`, `alumni`, `teachers`,
`laureates`, `veterans`, `faculties`, `apply`, `access`, `mod`, `admin`) reuse the
existing screens, styled up for kiosk via kiosk tokens + a `data-kiosk` flag on the
root (CSS hooks for larger gallery grid, bigger rows). No new routes.

---

## 3. Components (each: purpose · interface · deps)

1. **`KioskApp`** — full-screen vertical container; provides kiosk tokens + idle
   manager; composes chrome, router, overlays. Deps: `useApp`, `useIdle`.
2. **`KioskChrome`** — top bar (logo with long-press staff gesture, compact language
   switch, optional clock) + bottom nav (large «Главная» / «Подать заявку», «Назад»
   when `showCrumb`). A discreet website/kiosk toggle stays for the prototype
   (removed/locked in production). Deps: `useApp`.
3. **`KioskHome`** — Hybrid-B hub: hero headline + accent rule + big «Поиск» button
   (opens search) + 2×2 section tiles (`teachers/laureates/veterans/faculties` →
   `go(...)`; plus Выпускники → `faculties`) + «Подать заявку» CTA (`go('apply')`).
   Deps: `useApp`, `featList`/`FAC` for counts.
4. **`KioskSearch`** — full-screen search: big field + live results list (large rows)
   over the on-screen keyboard. Searches people by name (`L(name)`), tap → `alumni`
   profile. Deps: `ALU`/category people via `logic`, `OnScreenKeyboard`.
5. **Gallery grid (A)** — shared kiosk styling for Collection/Faculty people lists:
   2-col large portrait tiles (`cardGrad(accent)` + initials + name). Implemented by
   styling existing screens under `data-kiosk` (no logic change).
6. **`AttractOverlay`** — full-screen idle screensaver: rotating featured people
   (`featList()`), big portrait block + name + role + pulsing «Коснитесь, чтобы
   начать». Visible while idle; any pointer/touch dismisses → `goHome()` + clear
   search/filters. Honors `prefers-reduced-motion` (cross-fade only / no motion).
7. **`useIdle(onIdle, ms)`** — hook tracking last interaction (pointerdown, touchstart,
   keydown). Fires `onIdle` after `ms` idle; resets on interaction. Used for attract.
8. **`OnScreenKeyboard` + `useKeyboard`** — touch keyboard: ЙЦУКЕН ⇄ QWERTY toggle,
   number/`@`/`.` row, space, backspace, enter, layout(RU/EN) switch. Mounts when a
   kiosk input is focused; writes into the focused controlled input via a small
   keyboard context (`useKeyboard` exposes `bind(value, setValue)` for inputs).
9. **`StaffPinOverlay`** — numeric PIN pad shown after a 2.5s long-press on the logo;
   correct PIN → `go('access')` (or directly `mod`). Demo PIN: **2468** (shown only
   in this spec, not on screen). Replaces the visible «Войти» in kiosk.

---

## 4. Behaviours & parameters

- **Attract idle:** 60s of no interaction → `AttractOverlay`; showing it also resets
  the underlying app to a clean Home (`goHome()` + clear `listQuery/listYear/search`).
  This single rule covers both "attract" and "auto-reset to fresh state".
- **Dismiss:** first touch on the attract overlay hides it and lands on Home.
- **Staff access:** long-press logo 2500ms → PIN pad; 4-digit PIN `2468` (demo) →
  staff area; wrong PIN shakes + clears. No visible staff button in kiosk.
- **Keyboard:** appears on focus of search/apply inputs; RU default, toggle to EN;
  numeric/email row for year/email. Enter confirms; tapping outside dismisses.
- **Touch sizing:** all targets ≥48px; kiosk type scale ~1.3–1.5× the website narrow
  scale; generous spacing.
- **No hover dependence:** all states reachable by tap; press feedback via
  scale/opacity (not hover).

---

## 5. Tokens & styling

Add a **kiosk density layer** to `lib/theme.ts` `vars(theme, narrow, kiosk?)`: when
`kiosk`, enlarge type scale (`--t-*`), `--pad`, gaps, and add `--touch: 56px`. Keep
each version's palette/geometry identity (V2 square/azure, V1 rounded/heritage).
Kiosk-specific layout (gallery grid columns, bottom nav, overlays) lives in the new
kiosk components + a few `index.css` rules scoped under `[data-kiosk]`.

---

## 6. Reuse / boundaries (do NOT change)

Domain model, routes, i18n contract, `person()` resolver, data layer, and the
existing browser Shell/Frame remain untouched. Kiosk adds components and a render
branch; it does not modify website rendering. New i18n keys (kiosk labels: search
placeholder, «Коснитесь, чтобы начать», section tiles, PIN prompt, etc.) added to
ru/kz/en — additive only.

---

## 7. Per-version plan

V2 first (reference), then V1 mirrors with its tokens/fonts/rounded style. Shared
component structure; differences isolated to styles (tokens, radii, fonts) and the
two `records.ts`/`theme.ts` already diverge per version.

---

## 8. Verification

- `npm run build` clean in V1 and V2.
- Manual/screenshot per version: kiosk Home, section gallery, search + keyboard,
  profile, apply + keyboard, attract overlay (idle), auto-reset, staff PIN.
- Idle timing, keyboard input, long-press PIN, prefers-reduced-motion all checked.
- Website mode unchanged (regression check on the responsive Shell/Frame).

## 9. Open / deferred

- Exact kiosk type scale multipliers tuned during implementation.
- Real production hardening (lock mode switch, real auth, fullscreen API) deferred;
  this is a prototype-grade kiosk mode.
