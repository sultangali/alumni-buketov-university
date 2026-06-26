# Alumni Buketov University — Architecture Reference

> **Purpose of this document.** It describes the architecture of the V1 platform
> so that **V2 can reuse the entire application core unchanged and only replace the
> design layer**. Everything below is split into two parts:
>
> - **🟢 STABLE CORE** — data model, business logic, state, i18n, routing, screen
>   composition. **Copy to V2 as-is.** Do not rewrite.
> - **🎨 DESIGN LAYER** — design tokens, inline styles, gradients, animations,
>   device frame. **This is what you change in V2.**
>
> The codebase was deliberately built so that the design layer is *isolated*: all
> visual decisions flow through a small number of files. Reskinning V2 means
> editing those files, not touching logic.

---

## 1. Tech Stack

| Concern        | Choice                                  |
| -------------- | --------------------------------------- |
| Framework      | React 18.3                              |
| Language       | TypeScript 5.6 (strict)                 |
| Build tool     | Vite 5.4                                |
| Styling        | Inline styles + CSS custom properties   |
| State          | React Context (no external store)       |
| Routing        | In-memory route object (no router lib)  |
| Data           | Static TS modules (mock data)           |
| Dependencies   | `react`, `react-dom` only               |

No CSS framework, no component library, no router, no state library. This keeps
the surface area tiny and the design layer fully under our control.

**Scope:** Front-end only, mock data. All screens (public + moderator + admin)
are working UI over baked-in sample data. No backend/auth, but structured so the
data layer can be swapped for a real API with no changes to screens.

### Scripts

```bash
npm run dev       # vite dev server
npm run build     # tsc -b && vite build
npm run preview   # preview production build
```

### TypeScript project layout (canonical 3-file Vite setup)

- `tsconfig.json` — orchestrator: `{ "files": [], "references": [app, node] }`
- `tsconfig.app.json` — compiles `src/` (composite, `tsBuildInfoFile` set)
- `tsconfig.node.json` — compiles `vite.config.ts`

Strict flags in effect: `noUnusedLocals`, `noUnusedParameters`,
`noFallthroughCasesInSwitch`, `jsx: react-jsx`, `moduleResolution: bundler`.

---

## 2. Directory Map

```
app/
├── index.html
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
└── src/
    ├── main.tsx                 # React root
    ├── App.tsx                  # <AppProvider><Shell/></AppProvider>
    ├── index.css                # 🎨 keyframes, motion prefs, hover helpers
    ├── types.ts                 # 🟢 all domain + UI types
    │
    ├── data/                    # 🟢 STABLE — mock data + strings
    │   ├── records.ts           #    FAC, ALU, TEACHERS, LAUREATES, VETERANS, AUDIT, MODS
    │   └── i18n.ts              #    I18N: ru / kz / en string tables
    │
    ├── lib/
    │   ├── logic.ts             # 🟢/🎨 lookups + helpers + style helpers (mixed — see §7)
    │   └── theme.ts             # 🎨 DESIGN — tokens & per-theme palettes
    │
    ├── AppContext.tsx           # 🟢 STABLE — global state, navigation, breadcrumb
    │
    ├── components/              # chrome / layout
    │   ├── Shell.tsx            # 🎨 outer "demo" page (brand row, kiosk/browser toggle)
    │   ├── Frame.tsx            # 🎨 device frame (browser chrome / kiosk notch)
    │   ├── AppBar.tsx           # 🎨 top bar: logo, lang, theme, staff button
    │   ├── Breadcrumb.tsx       # 🎨 breadcrumb strip
    │   ├── Footer.tsx           # 🎨 footer strip
    │   └── ScreenRouter.tsx     # 🟢 STABLE — route → screen switch
    │
    └── screens/                 # one file per screen (🎨 markup, 🟢 data wiring)
        ├── Home.tsx             #    hero, spotlight, faculties, categories block
        ├── Faculties.tsx        #    faculty grid
        ├── Faculty.tsx          #    faculty detail + alumni listing
        ├── Profile.tsx          #    generic person profile (all 4 kinds)
        ├── Collection.tsx       #    teachers / laureates / veterans collections
        ├── Apply.tsx            #    public self-submission form
        ├── Moderator.tsx        #    moderator panel (list / add / review queue)
        └── Admin.tsx            #    admin panel (overview / audit / moderators)
```

---

## 3. Data Flow (one-glance mental model)

```
data/records.ts ─┐
                 ├─► lib/logic.ts (lookups, person resolver) ─► screens (read)
data/i18n.ts ────┘                                                  ▲
                                                                    │ useApp()
AppContext.tsx ── global state (lang/theme/route/submissions...) ──┘
                                       │
                                       └─► ScreenRouter ─► active screen
```

- Screens never import data directly for cross-cutting concerns; they call
  helper functions from `lib/logic.ts` and read state from `useApp()`.
- The only writable runtime state of interest is `submissions` (public
  applications), which flows from `Apply.tsx` → context → `Moderator.tsx`.

---

## 4. 🟢 Domain Model (`types.ts`) — STABLE

Localized string primitive used everywhere:

```ts
export type Lang = 'ru' | 'kz' | 'en'
export type Loc  = Partial<Record<Lang, string>>   // always carries `ru`
```

Core entities:

| Type         | Meaning                                                        |
| ------------ | ------------------------------------------------------------- |
| `Faculty`    | Faculty. Holds `depts: Dept[]` (used only for headcount math). |
| `Dept`       | Department. **Not navigable** in V1 — retained only so faculty alumni counts add up. |
| `Alumnus`    | Original alumni record (9 seeded). Untouched legacy shape.     |
| `Teacher`    | Lightweight mentor link `{ name, role, id? }`.                 |
| `Person`     | **Unified superset** used by the generic profile + collections. |
| `Submission` | A public self-submitted application awaiting moderation.       |
| `AuditEntry` | Admin audit-log row.                                           |
| `Moderator`  | Moderator account row.                                         |

### The `Person` abstraction (key design decision)

There are four *kinds* of people: `'alumnus' | 'teacher' | 'laureate' | 'veteran'`.
Rather than four profile screens, V1 normalizes all of them into one `Person`
shape and renders them with a single `Profile.tsx`:

```ts
export interface Person {
  id: string
  kind: PersonKind
  fac: string; year: number; accent: string
  name: Loc; pos: Loc; bio: Loc
  org?: Loc; spec?: Loc; awards?: Loc[]
  badge?: Loc      // overrides year pill   (e.g. "Лучший преподаватель 2023")
  highlight?: Loc  // headline distinction  (scholarship/prize/honorary title)
  meta?: Loc       // small secondary line  ("На службе с 1978 · 44 года стажа")
  tag?: string     // sub-filter key inside a collection ('scholarship'|'prize')
  video?: boolean
  mentors?: string[]; students?: string[]  // alumni continuity links
}
```

- **Teachers / laureates / veterans** are authored directly as `Person[]` in
  `records.ts`.
- **Alumni** are converted on the fly via `alumnusToPerson()` so the 9 legacy
  records did not need rewriting.
- `person(id)` resolves *any* id: tries `ALU` first, falls back to the merged
  `[...TEACHERS, ...LAUREATES, ...VETERANS]` list.

This is why adding more people categories later is cheap: author a `Person[]`,
add a `CollectionKind`, register a route.

---

## 5. 🟢 Data Layer (`data/`) — STABLE

### `records.ts`

Exports the full mock dataset. **Swapping this module for real API calls is the
intended backend integration point** — screens won't change.

| Export      | Type           | Notes                                            |
| ----------- | -------------- | ------------------------------------------------ |
| `FAC`       | `Faculty[]`    | Faculties with nested `depts` (headcount only).  |
| `ALU`       | `Alumnus[]`    | 9 alumni (`a1`–`a9`).                            |
| `TEACHERS`  | `Person[]`     | `t1`–`t6`, `kind:'teacher'`, honor-roll badges.  |
| `LAUREATES` | `Person[]`     | `l1`–`l6`, `kind:'laureate'`, `tag` scholarship/prize. |
| `VETERANS`  | `Person[]`     | `v1`–`v5`, `kind:'veteran'`, long-service meta.   |
| `TEACH`     | `Record<...>`  | mentor→alumnus link map.                          |
| `AUDIT`     | `AuditEntry[]` | admin audit log.                                  |
| `MODS`      | `Moderator[]`  | moderator accounts.                              |

### `i18n.ts`

```ts
export type UIStrings = Record<string, string>
export const I18N: Record<Lang, UIStrings>   // ru / kz / en
```

Every visible UI label is a key here, read as `ui.<key>` from `useApp()`.
`UIStrings` is an open `Record`, so adding keys never breaks types. To add copy:
add the same key to all three language blocks.

**i18n contract:** localized *content* (names, bios) lives in `Loc` objects and
is resolved with `L(obj)`; localized *UI chrome* (button labels, headings) lives
in `I18N` and is read as `ui.key`. Keep that split in V2.

---

## 6. 🟢 State & Navigation (`AppContext.tsx`) — STABLE

A single context (`useApp()`) holds everything. No Redux/Zustand.

### Settings state
`lang`, `theme`, `preview` (`'kiosk' | 'browser'`), plus derived `narrow`,
`ui = I18N[lang]`, and `L = makeL(lang)`.

### Routing (hand-rolled, no router lib)

```ts
type Route =
  | { name: 'home' } | { name: 'faculties' }
  | { name: 'faculty'; fac: string }
  | { name: 'alumni'; id: string }          // generic profile
  | { name: 'teachers' } | { name: 'laureates' } | { name: 'veterans' }
  | { name: 'apply' } | { name: 'mod' } | { name: 'admin' }
```

- `go(route)` pushes the current route onto an internal history stack and navigates.
- `back()` pops it. `goHome()` resets to home and clears history.
- Entering a `faculty` route auto-resets the alumni-list filters.
- `ScreenRouter` is a single `switch (route.name)` that renders the matching screen.

> The `alumni` route name is historical — it now carries **any** person id and
> renders `Profile.tsx`. Don't rename it in V2 unless you update all `go({name:'alumni'})` callers.

### Screen-local UI state held in context
`featIdx` (spotlight carousel), `listYear` / `listQuery` (faculty alumni filter),
`media` (`photos|videos` toggle), `modTab`, `adminTab`.

### Breadcrumb
Derived (memoized) from the current route into `{ showCrumb, crumb }`.

### Submissions (the one live data path)
```ts
submissions: Submission[]
addSubmission(payload)   // stamps id `subN`, status:'review', submittedAt timestamp
```
`Apply.tsx` calls `addSubmission`; `Moderator.tsx` reads `submissions` and shows
them in the review queue with a live count badge. In-memory only (resets on reload).

### Configurable defaults (`PROPS`)
`motion` (`full|subtle|off`), `defaultTheme`, `defaultLang`, `autoplaySeconds` —
mirror the prototype's data-props. Spotlight autoplay honors `motion`.

---

## 7. 🟢/🎨 `lib/logic.ts` — MIXED (read carefully before reskin)

This file has **two halves**. Keep the first; expect to retheme the second.

### 🟢 Logic half — STABLE (copy as-is)
- Lookups: `fac`, `dept`, `alu`, `facAlumni`, `facAlumniCount`, `featList`,
  `collectionPeople`.
- Person model: `alumnusToPerson`, `person`.
- Localization: `makeL` / `Localize`.
- Formatting: `initials`, `nf` (ru-RU thousands).

### 🎨 Presentation half — DESIGN (retheme in V2)
- **Gradient builders:** `cardGrad`, `profileGrad`, `avGrad` — all build
  `linear-gradient(... color-mix(in srgb, accent X%, dark))`. Change the angle /
  mix % / base dark color here to restyle every avatar and header at once.
- **`gallery(L, seed)`** — deterministic placeholder gallery tiles (HSL math).
- **Status / tag styling:** `statusMeta(L, key)` returns a localized label + pill
  style; `tagMeta(key)` returns an accent color. Status keys: `published`,
  `draft`, `review`, `active`, `pending`.
- **Button/chip style helpers:** `seg`, `tabSeg`, `ptab`, `chipStyle` — return
  `CSSProperties` for the various pill/tab/chip shapes.

> For V2: if the new design keeps the token system (§8), you mostly edit the
> *values* inside these helpers, not their call sites. If V2 moves to CSS classes,
> these helpers become the natural seam to delete.

---

## 8. 🎨 DESIGN LAYER — the part V2 replaces

The entire visual identity is concentrated in a few places. Reskinning V2 =
editing these.

### 8.1 `lib/theme.ts` — design tokens (start here)

`vars(theme, narrow)` returns a `CSSProperties` bundle of CSS custom properties.
It's spread onto the `Frame` root, so **every screen reads tokens via `var(--…)`.**
Change a token once → it propagates everywhere.

**Token groups:**
- Geometry/scale (`base`): `--bw`, `--r`, `--r-lg`, type scale `--t-2xs … --t-3xl`.
- Per-theme palettes (`themes.light/dark/contrast`): `--c-bg`, `--c-bg2`,
  `--c-surface`, `--c-ink`, `--c-ink2`, `--c-line`, `--c-primary`, `--c-primary2`,
  `--c-gold`, `--shadow`. (Contrast theme also overrides geometry for accessibility.)
- Density (depends on `narrow`): `--pad`, `--gap-card`, `--gap-ctrl`.

Three themes (`light` / `dark` / `contrast`) and two densities (kiosk `narrow`
440×880 / browser `wide`).

> **V2 fastest path to a new look:** rewrite the palettes and the type/geometry
> scale in `theme.ts`. Because screens use tokens (not hardcoded colors *most* of
> the time), a large part of the reskin is just new token values.

### 8.2 Hardcoded style values (where tokens *don't* reach)

Some visuals are intentionally literal and live in component markup:
- **Gradients** via the `cardGrad/profileGrad/avGrad` builders (§7) and the
  per-faculty `grad` strings in `records.ts`.
- **Device chrome** in `Frame.tsx` / `Shell.tsx` (browser dots, kiosk notch,
  outer page background) — these are demo-shell decoration, not app UI.
- **Inline layout** inside each screen (flex/grid, paddings). Spacing usually
  references `var(--pad)` / `var(--gap-card)`, but fixed pixel values appear for
  fine layout.

### 8.3 `index.css` — animation & motion

- Keyframes: `fadeUp`, `fadeIn`, `scaleIn`, `floaty`, `shimmer`, `ringspin`,
  `glowpulse`.
- Motion preference handling via `[data-motion='off'|'subtle']` (set on the
  Frame root) and `prefers-reduced-motion`.
- Hover affordance classes — the **only** CSS classes in the app:
  `.lift`, `.lift-lg`, `.lift-row`, `.lift-card`, `.press`.
- Scrollbar styling.

> Inline styles are used for everything *except* `:hover` and `@keyframes`
> (which inline styles can't express), so those live here. In V2 keep this split:
> static styling inline/tokens, interactive/animated styling in `index.css`.

### 8.4 Typography
Two font families referenced inline throughout: **`Lora, serif`** (display /
headings / names) and **`Manrope, sans-serif`** (body / UI). Loaded via
`index.html`. Swapping fonts = change these two families + the `<link>`.

---

## 9. Screen Catalogue

| Screen          | Route(s)                         | Purpose                                                        |
| --------------- | -------------------------------- | ------------------------------------------------------------- |
| `Home`          | `home`                           | Hero, auto-rotating Hall-of-Fame spotlight, faculty grid, **Categories block** (Teachers / Laureates / Veterans / Apply). |
| `Faculties`     | `faculties`                      | All faculties as cards (`est` + alumni count).                |
| `Faculty`       | `faculty`                        | Faculty hero + stats + history + gallery + **alumni listing** (search + year chips). |
| `Profile`       | `alumni` (any person id)         | Generic profile for all 4 kinds; badge/highlight/meta, awards, photo/video gallery, mentor↔student links. |
| `Collection`    | `teachers` / `laureates` / `veterans` | Reusable collection grid; faculty filter + (laureates) type filter. |
| `Apply`         | `apply`                          | Public no-auth form → `addSubmission` → moderation queue.     |
| `Moderator`     | `mod`                            | Faculty-scoped panel: records list / add form / review queue (incl. live submissions). |
| `Admin`         | `admin`                          | Overview cards + bars + recent activity / audit table / moderators list. |

### Adding a new "category" feature (the established pattern)
1. Author a `Person[]` dataset in `records.ts`.
2. Add the kind to `CollectionKind` and wire `collectionPeople()`.
3. Add a `Route` variant + `ScreenRouter` case (reuse `Collection` if it's a grid).
4. Add a card to the Home "Categories" block + i18n keys (ru/kz/en).
5. (If it feeds moderation) call `addSubmission` and surface in `Moderator`.

---

## 10. Conventions (follow these in V2)

- **Styling:** inline styles + `var(--token)`; CSS classes only for hover/keyframes.
- **Colors:** prefer tokens; gradients via the `*Grad` builders; `color-mix(in srgb, …)`
  for tints.
- **Text:** never hardcode user-facing strings — `ui.key` for chrome, `L(loc)` for content.
- **Numbers:** `nf()` for thousands grouping.
- **Navigation:** always `go()` / `back()` / `goHome()`; never mutate `route` directly.
- **New data:** add to `data/records.ts`; keep screens reading via `lib/logic.ts` helpers.
- **Types are strict:** no unused locals/params; switch cases must be exhaustive.

---

## 11. V2 Reskin Checklist (TL;DR)

**Copy verbatim (🟢 core):**
`types.ts`, `data/records.ts`, `data/i18n.ts`, `AppContext.tsx`,
`components/ScreenRouter.tsx`, and the **logic half** of `lib/logic.ts`
(lookups, `person`, `alumnusToPerson`, `makeL`, `initials`, `nf`,
`collectionPeople`).

**Re-design (🎨 design):**
1. `lib/theme.ts` — new palettes, type scale, geometry, density. *(biggest lever)*
2. `index.css` — new animations / hover behavior / fonts.
3. The **presentation half** of `lib/logic.ts` — gradient builders, `gallery`,
   `statusMeta`, `tagMeta`, and the `seg/tabSeg/ptab/chipStyle` style helpers.
4. `components/` chrome — `Shell`, `Frame`, `AppBar`, `Breadcrumb`, `Footer`.
5. `screens/*` — re-lay-out markup. Keep the data wiring (`useApp`, helper calls,
   `go(...)`); change the structure/visuals.

**Don't change:** the domain model, the route shape, the i18n contract, the
`Person`/`person()` resolver, or the data-layer boundary. Those are what make V2
"the same platform, different design."
