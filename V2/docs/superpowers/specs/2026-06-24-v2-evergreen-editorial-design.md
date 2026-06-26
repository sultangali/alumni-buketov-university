# V2 Reskin — "Evergreen Legacy" Editorial Archive

**Date:** 2026-06-24
**Scope:** Replace the V1 design layer with a new visual identity. Reuse the entire
application core unchanged (per `ARCHITECTURE.md`). No logic, data-shape, route, or
i18n-contract changes.

---

## 1. Direction

A **Modern Editorial Archive**: strict editorial/Swiss grid, large serif display
type, hairline rules, generous whitespace, tabular figures for stats. Reads as a
serious institutional archive — a deliberate break from V1's parchment / navy /
gold / glossy-gradient "brochure heritage" look.

**Color personality — Evergreen Legacy:** ink-on-warm-white base with a deep
forest-green accent (growth / continuity of the alumni lineage). Distinct hue
family from V1's blue. Three themes, all token-driven: `light`, `dark`, `contrast`.

**Typography:** `EB Garamond` (display / headings / names) + `Inter` (UI / body).
Replaces `Lora` + `Manrope`. EB Garamond is the database's top pick for
university archives.

---

## 2. What stays vs. changes

### 🟢 Untouched core (copy verbatim, already in `V2/app`)
`types.ts`, `data/i18n.ts`, `AppContext.tsx`, `components/ScreenRouter.tsx`,
`main.tsx`, `App.tsx`, all config (`vite`, `tsconfig*`, `package.json`), and the
**logic half** of `lib/logic.ts` (lookups, `person`, `alumnusToPerson`, `makeL`,
`initials`, `nf`, `collectionPeople`).

`data/records.ts` data is untouched **except** the purely-visual `grad` / `accent`
color values (§8.2 of ARCHITECTURE designates these design-layer values that
happen to live in the data file). All names, bios, counts, ids, links unchanged.

### 🎨 Redesigned
1. `lib/theme.ts` — new palettes, type scale, geometry, font tokens, density.
2. `index.html` — swap Google Fonts link to EB Garamond + Inter.
3. `index.css` — editorial motion + hover affordances + fonts on body.
4. presentation half of `lib/logic.ts` — gradient builders, `gallery`,
   `statusMeta`, `tagMeta`, `seg` / `tabSeg` / `ptab` / `chipStyle`.
5. `components/` — `Shell`, `Frame`, `AppBar`, `Breadcrumb`, `Footer`.
6. `screens/*` — re-layout to editorial grid; data wiring (`useApp`, helper
   calls, `go()`) kept exactly.

---

## 3. Design tokens (`theme.ts`)

### Geometry / scale (`base`)
- Sharper, editorial radii: `--r: 6px`, `--r-lg: 10px` (was 16/22).
- `--bw: 1px` hairline. Add `--r-pill: 999px` for the few true pills (toggles).
- Type scale tuned for a serif display (slightly larger top end):
  `--t-2xs 11 / --t-xs 12.5 / --t-sm 13.5 / --t-base 15.5 / --t-md 18 /
   --t-lg 23 / --t-xl 30 / --t-2xl 40 / --t-3xl 54`.
- New font tokens: `--font-display: 'EB Garamond', Georgia, serif`,
  `--font-ui: 'Inter', system-ui, sans-serif`.
- New accent tokens used by helpers: `--c-accent`, `--c-accent2` (hover/strong),
  `--c-accent-weak` (tint bg), `--c-on-accent`.

### Palettes
| token | light | dark | contrast |
|-------|-------|------|----------|
| `--c-bg` | `#FAFAF7` | `#0E1110` | `#000000` |
| `--c-bg2` | `#F2F1EA` | `#141816` | `#0B0B0B` |
| `--c-surface` | `#FFFFFF` | `#171C19` | `#0B0B0B` |
| `--c-ink` | `#14171A` | `#ECEFEA` | `#FFFFFF` |
| `--c-ink2` | `#5B6159` | `#9AA39A` | `#FFE600` |
| `--c-line` | `#E4E3DB` | `rgba(255,255,255,.12)` | `#FFFFFF` |
| `--c-primary` | `#1E5F4B` | `#3FB489` | `#FFE600` |
| `--c-primary2` | `#16493A` | `#5EC8A0` | `#FFE600` |
| `--c-accent` | `#1E5F4B` | `#3FB489` | `#FFE600` |
| `--c-accent-weak` | `rgba(30,95,75,.10)` | `rgba(63,180,137,.16)` | `#FFE600` |
| `--c-on-accent` | `#FFFFFF` | `#06140F` | `#000000` |
| `--c-gold` (kept; muted) | `#9A7B33` | `#D8B873` | `#FFE600` |
| `--shadow` | `0 1px 0 var(--c-line), 0 18px 40px -30px rgba(20,30,25,.5)` | `0 18px 44px -28px rgba(0,0,0,.7)` | `none` |

> Editorial style leans on **hairline borders + whitespace**, not soft shadows.
> Shadows are subtle; cards are defined by `1px var(--c-line)` borders.

`contrast` keeps its accessibility overrides (yellow on black, `--bw: 2px`,
larger type) as in V1.

### Density (`vars()`)
Slightly more generous editorial padding: `--pad` `18px` (narrow) / `48px`
(wide); `--gap-card` `12 / 18`; `--gap-ctrl` `6 / 10`. Add `--maxw` content
measure if needed per screen.

---

## 4. `index.css`

- Set `body { font-family: var(--font-ui); color: var(--c-ink); }`.
- Keep keyframes (`fadeUp`, `fadeIn`, `scaleIn`, `shimmer`) but soften
  `fadeUp` translate to `12px`. Drop reliance on `floaty`/`glowpulse` decorative
  loops in the editorial chrome (keep defined for motion-pref compatibility).
- Hover affordances become editorial: `.lift` / `.lift-card` use a smaller
  translate + hairline-tinted border/`--shadow` instead of big colored glows.
  `.lift-row` keeps the 4px nudge. Add `.u-link` underline-grow affordance for
  the accent links/CTAs. Recolor hover shadows to neutral ink, not navy.
- Respect existing `[data-motion]` + `prefers-reduced-motion` handling verbatim.

## 5. `lib/logic.ts` (presentation half)

- **Gradient builders** (`cardGrad`, `profileGrad`, `avGrad`): editorial avatars
  become flat tinted monogram tiles. Rebuild as a soft 2-stop using the new
  evergreen-dark base: `color-mix(in srgb, accent X%, #0d1b16)`. Lower contrast,
  no glossy 150° sheen — closer to a calm tonal block. Keep signatures
  `(accent: string) => string` so call sites are unchanged.
- **`gallery`**: keep deterministic seeding; shift HSL toward green/neutral
  family (hue base in green range, lower saturation) to match.
- **`statusMeta`**: keep keys (`published/draft/review/active/pending`); restyle
  pill to squared editorial chip (radius `--r`), hairline border + weak tint,
  semantic colors kept accessible (green published/active, amber review/pending,
  neutral draft). Labels unchanged (i18n contract).
- **`tagMeta`**: recolor to the evergreen-harmonized set (greens / muted gold /
  neutral) instead of blue/purple.
- **`seg` / `tabSeg` / `ptab` / `chipStyle`**: switch font to `var(--font-ui)`;
  editorial treatment — squared (radius `--r`, except language/theme toggles stay
  pill via `--r-pill`), active = accent fill or accent underline, hairline
  borders, tighter tracking.

## 6. `records.ts` color values

Recolor the per-faculty `accent` + `grad` strings from the blue/purple/gold/teal
set to an **evergreen-harmonized accent family** (e.g. forest, pine, moss, sage,
muted gold, slate-green) so avatars/headers read as one calm palette. Data,
ids, counts, names — all unchanged.

## 7. Components (chrome)

- **Shell**: outer demo page background → warm paper (light) / editorial dark;
  brand row in EB Garamond; kiosk/browser toggle restyled (`tabSeg`).
- **Frame**: device frame — quieter browser chrome dots, kiosk notch; surface bg
  via tokens. Hairline borders over heavy shadow.
- **AppBar**: editorial top bar — `alumni` wordmark in EB Garamond (lowercase),
  hairline bottom rule, lang/theme as small pill toggles, staff button as
  outlined editorial button. One primary action only.
- **Breadcrumb**: thin rule strip, `Inter` small caps / chevrons, accent on
  current.
- **Footer**: minimal hairline-topped strip.

## 8. Screens (re-layout, keep wiring)

Apply the editorial system per screen, preserving every `useApp()` call,
`logic.ts` helper call, and `go()/back()/goHome()` navigation:

- **Home**: large EB Garamond hero headline with accent underline; stat row as
  tabular figures separated by hairlines; spotlight as an editorial feature
  block; faculties + categories as bordered grid cards (no glossy gradients).
- **Faculties / Faculty**: bordered grid; faculty hero as editorial masthead +
  stats; alumni listing with hairline search + squared year chips.
- **Profile**: monogram tile (flat tonal) + EB Garamond name; badge/highlight/
  meta as editorial labels; awards list; gallery grid; mentor↔student links as
  editorial rows.
- **Collection / Apply / Moderator / Admin**: same data flows; editorial tables,
  squared tabs (`ptab`), hairline cards, accessible form fields with visible
  labels and inline errors (Apply / Moderator add-forms).

---

## 9. Constraints / contracts kept

- Domain model, route shape, i18n contract, `person()` resolver, data-layer
  boundary — unchanged.
- Trilingual ru/kz/en; all three themes; kiosk (narrow 440×880) + browser (wide).
- Strict TS (no unused locals/params; exhaustive switches) — build must pass
  `tsc -b && vite build`.
- Accessibility: text contrast ≥ 4.5:1 in light & dark; visible focus rings;
  `prefers-reduced-motion` respected; color never the sole signal (status chips
  carry text labels).

## 10. Verification

- `npm install && npm run build` passes clean.
- `npm run dev` — smoke-check each route in browser + kiosk, all 3 themes, all
  3 languages, light/dark contrast.
- Compare against V1 screenshots to confirm a genuinely distinct identity.
