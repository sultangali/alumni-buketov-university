# Resilient kiosk implementation plan

**Goal:** Deliver a buildable Android 12 managed kiosk, resilient V3 frontend and compatible server contracts.
**Spec:** ../specs/2026-09-12-android-kiosk-resilience-design.md
**Architecture:** bundled V3 via WebViewAssetLoader; native asynchronous request bridge; encrypted outbox and atomic public snapshots; same-origin browser fallback.

## Global constraints

Preserve existing uncommitted V1/V2/server/V3 work. Work on codex/android-kiosk-resilience. Do not reset the physical device, deploy, change firewall, seed databases, or publish. Physical acceptance remains a documented installation check. User requests Astra for development.

## Task 1: Server contracts

Files: server/src/routes/kiosk.ts, server/src/services/kiosk.ts, server/src/models/KioskHandoff.ts, server/src/models/Submission.ts, server/src/routes/submissions.ts, server/src/index.ts, server/test/kiosk.test.ts.

- [x] Write regression tests for concurrent identical submissions and conflicting reuse, snapshot integrity/private fields, expiring handoffs.
- [x] Implement POST /api/submissions accepting optional clientSubmissionId UUID. SHA-256 fingerprint canonical editable payload; unique sparse index; duplicates return same record, changed payload 409. Hide internal fields from public serialization. Keep old clients compatible.
- [x] GET /api/kiosk/snapshot returns {schemaVersion:1,revision,generatedAt,payload:string,sha256,media:[{path,sha256,size,kind}]}. Payload is serialized public bootstrap. revision=sha256 is opaque content identity, not a monotonic number. ETag/304 supported. Exclude private contact/staff/creation fields. Media only safe local /media paths; avoid fetching arbitrary remote URLs.
- [x] POST /api/kiosk/handoffs accepts {draft}; GET /api/kiosk/handoffs/:token returns {draft,expiresAt}; POST /api/kiosk/handoffs/:token/submit accepts completed application and submits once. Token 32 random bytes, hash stored, 30 minute expiry checked on every access. Validate drafts, bound body/rate limits, no PII logging. A consumed token cannot read draft again; submission retries return receipt without PII. No cookie dependency.
- [x] Restrict CORS to configured origins while retaining same-origin/native requests; bind server privately by configurable host; health distinguishes DB readiness. Rate limits protect submission/handoff/auth/upload routes without trusting arbitrary forwarded headers.
- [x] Run isolated Mongo integration tests and TypeScript build; document exact results and limitations.

## Task 2: V3 transport and UX

Files: V3/app/src/lib/kiosk.ts, lib/api.ts, AppContext.tsx, screens/Apply.tsx, kiosk/KioskApp.tsx, tests/kiosk-frontend.test.mjs.

- [x] Native bridge window.AlumniNative.request(id,method,payloadJson) responds through window.__alumniNativeResponse(id,responseJson). Response envelope {ok:true,data} or {ok:false,error,status}. Methods bootstrap,submit,status,handoff. Native bootstrap returns bootstrap object, submit returns {id,status:'queued',submittedAt}. status returns {online,cachedAt,pending,needsAttention,publicOrigin}. handoff receives {draft}, returns {url,expiresAt}.
- [x] Use promise bridge with timeout, native receive handlers scoped to bundled origin. Browser retains HTTP. Force kiosk preview for native app; remove persisted staff and previous visitor form state; no visitor staff administration in native transport.
- [x] Native submit persists before returning success. Show local receipt, not server-delivery promise. Hide kiosk upload fields; allow optional text-only application. Phone-only media remain supported. Expose QR only with public origin and successful server-created handoff; include in-progress draft; reset abandons previous visitor data.
- [x] Phone handoff route reads token from URL fragment; loads draft with expiry states and consumes via server submit, not ordinary submission. Reuse media upload and form; never store token or PII in browser persistence.
- [x] Poll native status/bootstrap safely; preserve current view and form when cache refreshes. First-run/no-cache screen permits retry and maintenance.
- [x] Build V3 and run existing plus new targeted tests.

## Task 3: Android client

Files: android-kiosk/ Gradle project and Kotlin sources, android-kiosk/README.md.

- [x] Android 12 minimum, Kotlin, AndroidX WebKit and WorkManager. Bundle built V3 assets. Async narrow bridge; no network access from untrusted web content. Serve media from app-private cache under local secure origin.
- [x] Endpoint validation demo private HTTP exact origin, production HTTPS only. Explicit demo/production build profiles, admin runtime endpoint change with queued-data server binding (never send an old outbox to a different server). Public origin independent. Reject redirects, certificate bypasses, arbitrary intents and file pickers.
- [x] Atomic rename/fsync two-generation SHA-verified catalogue; bounded streamed downloads and quota media; no false online flag based on INTERNET_VALIDATED. Foreground scheduled sync plus WorkManager with backoff.
- [x] Keystore AES-GCM encrypted persistent outbox, durable receipt then remove PII; bounded queue, disk-full failure before success, retry same UUID, 409/validation needs attention, single writer. Never drop queued entries on cache clear.
- [x] DeviceAdminReceiver, persistent HOME, LOCK_TASK_FEATURE_NONE, boot, renderer recreation, recoverable native maintenance panel with enrolled password and rate limiting. No default password. Autostart depends on device-owner provisioning; describe physical verification limits.
- [x] Build demo APK and unit tests; produce installation checklist without executing device changes.

## Task 4: Integration and review

- [x] Verify server/native/frontend response contracts; test cable loss, duplicate sends, malformed cache, missing media, public handoff and offline receipt flows at software layer.
- [x] Independent review of security and reliability changes, then fixes and focused reruns.
- [x] Provide APK, configuration examples, rollback/backup and physical acceptance instructions. Report untested device behavior explicitly.

## Decisions and progress

- Existing V3 and backend changes are required context, so development stays in current checkout on a new branch rather than starting from stale committed code.
- Server address 192.168.50.1 is provisional; default demo port 8083 matches existing V3 nginx example and remains configurable.
- Android SDK/JDK not preinstalled; network access needed for toolchain and dependencies.
- Spec watchdog is subject to Android background execution limits; implement managed HOME/boot/renderer recovery and verify on actual hardware instead of claiming a sticky service guarantees restart.
- Task interfaces reviewed: Task 1 snapshot consumed by Task 3; Task 3 bridge consumed by Task 2; Task 1 handoffs consumed by Task 2/3. Receipts contain no user payload. Media uploads stay phone-only.

### Progress

- Tasks 1–4 implemented and reviewed at the software layer. Final server build and all 15 isolated Mongo tests pass; both frontend test files pass, V3 build succeeds, seven browser scenarios pass with a mock native bridge.
- Android demo and unsigned production APKs built. 14 JVM tests pass; lint has 0 errors and 14 documented warnings. Demo signature verified and embedded V3 bundle matches current dist.
- Independent reviews found and resolved nullable snapshot fields, QR/local-submit overlap, no-cache maintenance access, and native fallback hotspot overlap with EN. Final scoped review has no outstanding findings.
- Durable demo APK and reports: outputs/android-kiosk-2026-09-12/. Deployment guide: docs/KIOSK-DEPLOY-RU.md.
- Physical-device installation, Device Owner provisioning, boot/escape/power-loss tests, public domain configuration, production signing and deployment remain operator acceptance steps, not completed work.
- Existing user changes preserved; no blanket commit, deployment, device reset or real database mutation performed.
