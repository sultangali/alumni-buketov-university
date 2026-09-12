# Buketov Alumni Android kiosk

Native Android 12+ shell for the bundled V3 application. The APK opens the local `https://appassets.androidplatform.net/` origin through AndroidX WebViewAssetLoader. JavaScript has no direct network access. A main-frame, origin-checked asynchronous message bridge supplies the catalogue, local submissions, status, and phone handoff. The only maintenance bridge action opens native password authentication.

## Build

Requirements: JDK 17, Android SDK platform 35 and build tools, Android SDK licenses, Node/npm for V3, network access for initial Gradle dependencies. The checked-in Gradle wrapper downloads Gradle 8.9.

From the repository root:

```bash
npm --prefix V3/app ci
npm --prefix V3/app run build
```

From `android-kiosk`, configure `JAVA_HOME`, `ANDROID_HOME`, and optionally copy `.env.example` to `.env`. Environment values override `.env`. Then:

```bash
./gradlew testDemoDebugUnitTest assembleDemoDebug lintDemoDebug
./gradlew assembleProductionRelease
```

`bundleWeb` copies the existing `V3/app/dist` into the APK and fails if it has not been built. Rebuild V3 before rebuilding Android whenever the frontend changes.

Outputs:

- `app/build/outputs/apk/demo/debug/app-demo-debug.apk`: development-signed demonstration APK.
- `app/build/outputs/apk/production/release/app-production-release-unsigned.apk`: production build requiring the university's protected signing key. Do not distribute an unsigned or debug APK as production.
- Unit reports: `app/build/reports/tests/testDemoDebugUnitTest/index.html`.
- Lint report: `app/build/reports/lint-results-demoDebug.html`.

Keep the same application ID and signing key for updates; uninstalling or clearing app data destroys the Keystore-encrypted pending applications. The generated development key used for a local demo must be retained separately if that demo installation will receive updates.

## Profiles and configuration

`demo` permits HTTP only to an exact configured RFC1918 IPv4 origin, for example `http://192.168.50.1:8083`. It also accepts HTTPS. DNS names, loopback, unusual numeric IP spellings, credentials, paths, queries, fragments, and redirects are refused for demo HTTP. HTTP is permitted by the demo Android manifest but all native requests still use this validator and exact origin; the WebView cannot perform network requests.

`production` requires HTTPS and disables cleartext in the manifest. Invalid certificates fail closed, with no bypass. The initial production origin is deliberately empty unless supplied during the build or enrolled by the administrator.

Settings:

```dotenv
KIOSK_SERVER_ORIGIN=http://192.168.50.1:8083
PUBLIC_APP_ORIGIN=
```

`PUBLIC_APP_ORIGIN` is independent and must be an HTTPS origin reachable from the phone. Keep it empty for the isolated-cable demo. A successful server-created token yields `/u/apply#handoff=TOKEN`; no applicant information is placed in the URL. Configuring a public URL alone does not establish public connectivity to the same backend: verify the public reverse proxy before enabling handoff.

An enrolled administrator can change these settings. A server change is refused while any unacknowledged or corrupt outbox record exists. Each record also retains its original origin, and catalogue/media directories are separated by server-origin hash. Cache clearing never clears applications. The production restriction cannot be relaxed by runtime configuration.

## Durability and bounds

The outbox uses Android Keystore AES-256-GCM, a unique IV for each write, and encrypted app-private files. Successful local submission returns only after data flush, atomic rename, and directory flush. An existing `clientSubmissionId` returns its original local receipt and refuses changed payloads; retry after a lost server response sends the same UUID. Accepted applications are validated as text-only before being stored. The limits are 128 KiB per application, 500 undelivered records, and a 32 MiB free-space reserve.

An acknowledgement is encrypted and made durable before its application payload is deleted. Receipt cleanup verifies the authenticated receipt and binding before suppressing/removing a surviving payload. Damaged encrypted records remain available for operator recovery and appear as needing attention. Transient errors retry; validation/conflict/authentication errors are retained as needing attention. The maintenance UI exposes counts, not application content. It does not edit or discard problem records; recovery requires an authorized operator with access to the original device/server. Compact receipt retention is 90 days.

Snapshots retain two generations and validate schema, required bootstrap arrays, SHA-256 payload identity, timestamp, and bounded media manifest before promotion. The real server HTTP ETag is stored separately from the payload revision, so media-only changes refresh correctly. Snapshot transport is capped at 10 MiB; the payload at 8 MiB. Atomic persistence uses `FileDescriptor.sync`, same-filesystem `Files.move(ATOMIC_MOVE)`, and directory `force(true)` rather than Android `AtomicFile`. Failed promotion leaves the previous verified generation available. Power-loss behavior of the device filesystem must still be tested on hardware.

Media accepts only safe server `/media/` paths in the verified manifest, a maximum 25 MiB per object, streamed length/hash verification, and a 200 MiB LRU quota per server. Active profile photographs have eviction priority. Three missing profile images are prefetched per synchronization; gallery images/videos download on first use. The WebView's I/O interceptor waits for an on-demand download so the initial image load can succeed. Missing files fail closed with 404; the frontend provides its normal unavailable-media presentation. On a slow/offline connection, first use can wait for the native timeout. Media failures cannot evict catalogue/outbox files. Old server caches remain separately recoverable and can be cleared after returning to their origin; the 32 MiB reserve always applies to new submissions.

The process has one serial network scheduler, independently responsive bridge work, and synchronized outbox writes. Foreground sync runs every 20 seconds while the activity is resumed. WorkManager runs every 15 minutes with exponential retry backoff. Neither `INTERNET_VALIDATED` nor a public-internet connectivity constraint gates requests; successful contact with the configured snapshot endpoint establishes online status. Android can defer background work while idle. Local success means saved on the kiosk, not delivered to the server.

## Administrator enrollment and managed installation

No password is built into the APK. First launch requires the operator to enroll a 12–256 character password before public use. Its salted PBKDF2-HMAC-SHA256 verifier is encrypted with the Android Keystore key. Five failed attempts start increasing time-based lockouts, persisted across process restarts. Keep the password in the university password manager. Hold the top-right corner for maintenance; the no-cache page also offers a maintenance entry.

The native panel offers current status, endpoint configuration, manual sync, catalogue/media reset, a diagnostics copy with no application content, and a two-minute exit to Android settings. The panel itself expires after two minutes. Forgotten passwords require authorized device recovery; there is no visitor-accessible reset.

The following commands are an installation checklist, **not commands executed during development**. Assign Device Owner only on a properly prepared device without accounts; do not factory reset an existing kiosk without a separate backup/recovery authorization.

```bash
adb install -r app/build/outputs/apk/demo/debug/app-demo-debug.apk
adb shell dpm set-device-owner kz.buketov.alumni.kiosk/.KioskAdminReceiver
adb shell am start -n kz.buketov.alumni.kiosk/.MainActivity
```

After enrollment, the app registers its activity as persistent HOME, allowlists itself for Lock Task, and sets `LOCK_TASK_FEATURE_NONE` when it is Device Owner. It restores on boot through HOME and a boot receiver. An unmanaged install remains escapable and is not an accepted kiosk deployment. Keep Android System WebView current: both secure WebMessageListener and document-start-script support are required; unsupported versions display a maintenance recovery screen.

There is deliberately no claim that a sticky watchdog bypasses Android background-launch restrictions. Device Owner/HOME/boot restore and renderer recreation provide the recovery mechanisms. A deliberate `am force-stop`, vendor process killer, lost HOME configuration, or disabled app can require operator intervention. The two-minute settings-return timer needs the app process alive; HOME or restarting the app restores Lock Task after process loss. Hardware controls, power menu, OEM gestures, keyboard, USB policies, and accessibility escape routes need managed-device policy and physical testing.

## Physical acceptance (not yet performed)

### WebView compatibility recovery

The kiosk reported a WebView 91 provider on its first physical launch. The original
1.0.0 incompatibility page incorrectly used a `data:` URL rejected by the app's
own resource allowlist. An Android version number alone is not a WebView feature
guarantee. Updating a provider in Google Play must finish before selecting the
updated provider and reopening the kiosk. Do not factory reset or uninstall the
kiosk to resolve this message. The correction uses native Android diagnostics,
retains feature checks and does not introduce an insecure legacy bridge.

1. Confirm the APK signature, Android 12+ version, current WebView, and Device Owner status. Enroll the password. Verify portrait layout, keyboard, touch targets, and bundled SVG/logo/font assets.
2. Set the isolated Ethernet addresses using the kiosk's actual Android/OEM network settings. A sample is server `192.168.50.1`, kiosk `192.168.50.2`, `/24`, no gateway. Confirm nginx's actual port; the demo default is 8083.
3. Synchronize once, remove the cable, cold-start, and browse the saved catalogue. With no saved catalogue, confirm the recovery screen and protected maintenance still work.
4. Enter three text applications offline. Reconnect and confirm exactly three server records. Interrupt a send after the server commit; verify the retry returns the same record.
5. Exercise cache corruption/fallback and storage pressure on a test device. Never fill the actual kiosk filesystem or alter its private data without a separate authorized test plan.
6. Reboot ten times. Kill the WebView renderer, then the app process through appropriate test tooling. Confirm the actual OEM's HOME and recovery behavior. Distinguish process kill from force-stop.
7. Try Home, Recents, notification gestures, external URLs, downloads, file selection, physical keys, USB, and accessibility paths. Confirm no public escape. Test password failures and maintenance timeout, including background/process-loss limitations.
8. For production, sign and install the HTTPS build, validate certificates and failed-certificate refusal, and scan the handoff QR using a phone on mobile data. Finish a photo/video application and verify one server record.
9. Verify same-signed update preserves cache/outbox and rehearse rollback with a higher version-code build from known-good sources. Never use uninstall or app-data clear as rollback while applications remain queued.

## Backup and recovery

Android automatic app backup is disabled to avoid exporting visitor information. Keystore keys are device-bound; copying encrypted files to another device is not a usable outbox backup. Keep the original installed app and device available until pending and attention counts are zero and server delivery is confirmed. Back up server MongoDB and media through the server runbook. Keep release signing material and the enrolled administrator password separately in approved protected storage. Catalogue/media can be rebuilt from the server; unacknowledged applications cannot be recovered by re-downloading the catalogue.

Automated JVM tests exercise real files, encryption/tamper behavior, duplicate retries, server binding, invalid forms, corrupt receipts, disk-full refusal, snapshot fallback, real local HTTP redirect/size handling, ETag/304, and media quota/hash behavior. They do not prove hardware Keystore operation, WebView rendering/security on the installed provider, Ethernet routing, boot, Lock Task, or power-loss durability. Those require the physical acceptance drill above.
