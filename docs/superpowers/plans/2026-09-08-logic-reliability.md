# V1/V2 reliability implementation plan

Goal: fix reproduced application logic without changing the visual direction or working data.
Architecture: retain both independent Vite frontends and Express API; synchronize shared behavioural changes. Test mutations against an isolated Mongo database only.

- [x] Reproduce live-data lookup and request error bugs with Node/Vite regression tests.
- [x] Fix API failure propagation, confirmed submission state, private contact capture and upload pending states in both frontends.
- [x] Fix URL parsing/history, role gates, logout, expired sessions and explicit API-unavailable/retry state.
- [x] Fix live category lookup, counts, empty featured/slideshow, kiosk idle reset and search/keyboard interactions.
- [x] Backend agent: current account authorization, private contact, submission validation/publication, isolated integration tests.
- [x] Run frontend regressions, server tests/build, V1 and V2 production builds; inspect changes and desktop/portrait browser scenarios.
- [x] Report tested coverage, deployment/LAN limitations, and business decisions. No push, deploy, seed or V3/V4.

Frontend touch points: AppContext.tsx, App.tsx, lib/api.ts, lib/logic.ts, new lib/navigation.ts, screens/Apply.tsx and SubmissionReview.tsx, AppBar, ScreenRouter and kiosk components. Tests: tests/frontend.test.mjs loads actual modules through each version's Vite SSR loader. Backend changes confined to server/ by the assigned agent.
