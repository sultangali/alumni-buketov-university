# Android Kiosk Resilience Design

**Date:** 2026-09-12  
**Scope:** V3 interface, shared Express/MongoDB backend, and a new Android 12 kiosk APK  
**Status:** Approved direction; implementation requires this specification to be reviewed first

## 1. Goal

Run Alumni Buketov University reliably on the existing Android 12 information kiosk without Chrome UI or additional computer hardware.

The kiosk must:

- fill the portrait screen with the V3 interface;
- prevent visitors from leaving the application;
- start after boot and recover after a WebView or application failure;
- use the physical server when it is reachable;
- retain a last-known-good public catalogue and continue browsing when the server is unavailable;
- accept text-only applications while offline and deliver them exactly once after connectivity returns;
- let a visitor continue an online application on a phone to add photographs and videos;
- support a direct-cable demonstration profile and a later HTTPS production profile;
- expose maintenance controls only after a hidden gesture and administrator authentication.

The design does not expose MongoDB, the backend process port, Android settings, or the corporate network to visitors.

## 2. Chosen approach

Build a small native Kotlin application around Android WebView. Bundle the compiled V3 frontend inside the APK and connect it to a narrow native bridge. The bridge owns networking, the catalogue snapshot, the offline submission outbox, and device status. Express remains the authoritative backend and MongoDB remains the authoritative database.

This is preferable to the alternatives:

1. **Chrome in fullscreen:** quick, but browser chrome and system escape paths remain visible and offline control is weak.
2. **Remote website in a bare WebView:** visually correct, but cannot cold-start when the server is unavailable and relies too heavily on WebView's opaque HTTP cache.
3. **Native shell with bundled V3 and explicit persistence — chosen:** more work, but gives deterministic startup, controlled caching, exactly-once submission semantics, and a real managed-device kiosk mode.

The APK is not a general-purpose browser. It has no address bar, arbitrary navigation, downloads, popups, or external intent handling.

## 3. System architecture

```text
Android 12 kiosk
┌──────────────────────────────────────────────────────┐
│ Device Owner + Lock Task + HOME activity            │
│                                                      │
│ WebView                                              │
│ └── bundled V3 dist (always available)              │
│         │ explicit Alumni bridge calls              │
│         ▼                                            │
│ Native data layer                                   │
│ ├── validated catalogue snapshot (two generations) │
│ ├── bounded media cache                             │
│ ├── encrypted submission outbox                    │
│ └── connection/synchronisation status              │
│         │ HTTPS in production / isolated HTTP demo  │
└─────────┼────────────────────────────────────────────┘
          ▼
Server: nginx ──► bundled web/API routes ──► Express ──► MongoDB
                     └── /media              uploads
```

### Component boundaries

#### Android shell

Owns WebView creation, full-screen policy, URL allowlisting, Device Owner provisioning, Lock Task, boot behaviour, crash recovery, protected maintenance access, and the bridge exposed to V3.

It may call only configured Alumni server origins. It rejects `file:`, arbitrary `http(s):`, popup, download, and external-app navigation requests. The only external navigation shown to visitors is a QR code rendered inside V3; the kiosk itself does not follow the QR destination.

#### Bundled V3 frontend

The same React interface remains usable in an ordinary browser. A runtime adapter selects one of two data transports:

- browser transport: the existing same-origin HTTP API;
- Android transport: a small, versioned bridge implemented by the APK.

Screens do not know which transport is active. The adapter exposes catalogue loading, submission creation, connection status, handoff creation, and media URL resolution.

#### Native data layer

Stores only data needed for kiosk continuity. It does not cache login responses, administrator tokens, moderator pages, mutation responses, or arbitrary requests.

#### Express backend

Remains the single authority for published people and submissions. It gains kiosk-safe snapshot, idempotent submission, and phone-handoff contracts. Existing browser behaviour remains compatible.

## 4. Managed-device kiosk mode

The device will be factory-reset once. During initial provisioning, the APK is assigned as Android Device Owner using ADB while the device has no user accounts. The APK is then allowlisted for Lock Task and registered as the persistent HOME activity.

Production behaviour:

- immersive edge-to-edge display hides navigation and status bars;
- Lock Task blocks Home, Recents, notifications, settings, and ordinary app exit;
- the activity is the device's HOME destination;
- boot completion restores the kiosk;
- a small sticky watchdog detects a missing foreground activity and relaunches it;
- WebView renderer termination reloads the bundled shell without discarding native cache or outbox state.

Android vendor firmware can modify standard behaviour. Device Owner provisioning, system-bar suppression, boot, crash recovery, and Ethernet recovery must therefore pass on the physical kiosk before the deployment is accepted.

### Administrator exit

A non-obvious long-press gesture opens a native password screen. The password is never embedded in JavaScript or source defaults. Enrollment requires the operator to set it; only a salted verifier is retained using an Android Keystore-protected secret.

After repeated failures, authentication is temporarily rate-limited. A successful login opens a native maintenance panel with:

- connection and cache status;
- manual synchronisation;
- demo/production endpoint selection;
- cache refresh and safe cache reset;
- a time-limited maintenance exit from Lock Task;
- application version and diagnostic export without personal submission content.

The device automatically returns to Lock Task after the maintenance timeout or reboot. A forgotten administrator password requires an authorised ADB recovery or factory reset.

## 5. Runtime configuration and network profiles

Configuration is separated into two concepts:

- **kiosk server origin:** used by the APK for snapshot, submission, media, and health traffic;
- **public application origin:** embedded in the phone QR code and required to be reachable from ordinary mobile internet.

Build-time environment values provide signed APK defaults. An administrator may replace them in the protected maintenance panel. The active values are stored in app-private preferences and validated before use. Visitors cannot edit them.

### Direct-cable demonstration profile

For the Monday demonstration, the server and kiosk form an isolated Ethernet network. They use manually assigned addresses in the same subnet, with no default gateway and no DNS requirement. The current intended addressing is server `192.168.50.1` and kiosk `192.168.50.2`; the web port remains an installation parameter so the package can follow the nginx port actually enabled on the server.

The demo APK build permits cleartext HTTP only through its explicit Alumni-origin allowlist. Because the network has only two devices and no route to the corporate network or internet, no VPN is involved. The public phone handoff is hidden in this profile because a phone cannot reach a cable-only server.

### Production profile

The public website and application form use the university's official HTTPS domain and are reachable from ordinary internet connections. nginx exposes only port 443 and proxies approved paths to Express. MongoDB and the Express listen port remain private.

The kiosk reaches its configured HTTPS origin over an isolated Wi-Fi VLAN or a managed VPN. Firewall policy permits the kiosk only to DNS if required, VPN infrastructure if required, time synchronisation, and the Alumni HTTPS endpoint. It denies access from the kiosk segment to the rest of the corporate network.

The production APK disallows cleartext traffic. Certificate errors fail closed; users are never offered a bypass button.

## 6. Catalogue snapshot and media cache

WebView's browser cache is not the source of offline truth. The native data layer maintains a versioned last-known-good snapshot.

### Snapshot contract

Express provides a public, read-only kiosk snapshot containing:

- schema version and monotonically changing content revision;
- generation time;
- the public bootstrap data needed by V3;
- a media manifest containing stable paths, byte sizes where available, and content hashes;
- an integrity value for the snapshot payload.

The APK sends its current revision. The server may answer “unchanged” without retransmitting the catalogue.

### Atomic update

On a successful response, the APK:

1. validates HTTP status, payload size, schema version, required fields, and integrity;
2. writes a candidate generation to a temporary app-private file;
3. parses the complete candidate before activation;
4. atomically promotes it and retains the previous valid generation;
5. deletes the older generation only after promotion succeeds.

A timeout, malformed payload, partial write, incompatible schema, or storage error never replaces the active snapshot. If the newest generation is damaged, startup falls back to the previous valid generation.

### Read strategy

- Startup renders the bundled UI immediately with the active local snapshot.
- A background refresh begins when the server is reachable.
- Fresh server data replaces the view only after validation and atomic promotion.
- Loss of connectivity changes a small status indicator; it does not navigate visitors to an error page.
- With no valid snapshot, the APK shows a bundled branded emergency screen and continues retrying.

### Media

Profile photographs are prefetched after each accepted snapshot. Other images and videos are cached after use, then prefetched only while power, storage, and connectivity allow. Each file is downloaded to a temporary name, verified against its manifest, and atomically renamed.

The cache has a configurable quota and least-recently-used eviction. Active profile photographs have priority over gallery media and videos. The interface identifies media that is unavailable offline instead of displaying broken controls. A full disk must not delete the active catalogue or offline submission outbox.

## 7. Offline application outbox

Kiosk applications may be accepted without a server connection. This is an explicit outbox, not a replay of arbitrary HTTP traffic.

### Local record

Before showing success, the APK writes the complete text application to an encrypted app-private record with:

- a cryptographically random client submission identifier;
- creation time and schema version;
- normalised form payload;
- state: pending, sending, acknowledged, or needs attention;
- attempt count and last non-sensitive error classification.

Android file-based device encryption protects the application sandbox. The payload is additionally encrypted with an AES-GCM key held by Android Keystore. Diagnostic exports exclude names, contacts, biographies, and other application content.

### Synchronisation

Android WorkManager runs on connectivity restoration and with bounded retry backoff. The flow is:

1. atomically mark one record as sending;
2. send it with its client submission identifier;
3. let the server insert or return the existing submission for that identifier;
4. persist the acknowledgement;
5. remove the encrypted payload only after the acknowledgement is durable.

The server enforces a unique index on the client submission identifier. If the server commits a submission but the response is lost, the retry returns the same result rather than creating a duplicate. Validation errors move the record to “needs attention” and remain visible only in the maintenance panel. Transient network and server errors return it to pending.

Offline applications contain text fields only. The kiosk has no camera and removable-media ingestion is deliberately excluded for usability and security. A missing photograph never blocks a kiosk application; all applications still enter moderation before publication.

## 8. Phone handoff for photographs and video

The V3 application entry screen offers two explicit choices:

1. **Continue on phone — photo and video available.**
2. **Fill in here — media can be added later.**

When the public application origin and server are reachable, the kiosk requests a short-lived, high-entropy handoff token. The QR code contains only the public handoff URL and opaque token, never the applicant's form fields. The phone loads the draft, permits camera/gallery selection, uploads media, and submits through the normal moderation flow. Tokens expire, cannot be enumerated, and are invalidated after completion.

When the public origin is absent or the kiosk is offline, “Continue on phone” is hidden or clearly unavailable. “Fill in here” remains functional and enters the encrypted outbox. It does not promise that media were attached. A moderator may later contact the applicant or add approved media through the staff workflow.

Uploads from phones have server-side type, size, and count limits. They retain the existing inert-media restrictions and gain request rate limiting. Video is never stored in the kiosk outbox.

## 9. Frontend behaviour

V3 gains explicit connectivity states without changing its visual identity:

- online;
- synchronising a newer catalogue;
- offline using a dated local copy;
- no local copy available;
- application saved locally and awaiting delivery;
- application delivered;
- application requires administrator attention.

Visitor language avoids technical terms such as API, VPN, cache, request, and response. An offline submission success screen says that the application is safely stored on this kiosk and will be delivered automatically when the connection returns. It must not falsely claim that the university server has received it.

Staff login, moderator actions, administrator actions, and media upload remain online-only. Their controls are disabled with a clear explanation while offline. Public browsing and text application entry remain available.

## 10. Server hardening

nginx is the only exposed server process. Express and MongoDB bind privately. Required controls include:

- HTTPS and HSTS in production;
- strict upload type, size, and count limits;
- rate limits for login, handoff, submission, and upload endpoints;
- request body limits and timeouts;
- a unique database index for client submission identifiers;
- no permissive cross-origin policy; only configured official origins;
- no secrets, database credentials, or administrator schedules in APK or frontend bundles;
- structured logs that omit application bodies and authentication secrets;
- database and upload backups with a tested restore procedure.

The public web surface may expose catalogue reads, application creation, handoff, and constrained media upload. Moderator and administrator endpoints continue to require authentication; production may additionally restrict the administration surface through VPN or an allowlisted network.

## 11. Recovery behaviour

| Failure | Visitor-visible result | Recovery |
|---|---|---|
| Server unavailable at startup | Bundled V3 opens with last valid catalogue | Background retry; refresh after validation |
| Cable/Wi-Fi drops while browsing | Current page remains usable; offline indicator appears | Automatic reconnect |
| Connection drops during application send | Application remains in encrypted outbox | Idempotent retry |
| Server commits but response is lost | No duplicate is created | Retry receives existing acknowledgement |
| New snapshot is corrupt or incomplete | Previous catalogue remains active | Candidate discarded and logged |
| Media file is missing offline | Clear unavailable state; no broken navigation | Download after reconnect |
| WebView renderer crashes | Native activity recreates WebView | Bundled UI reloads from local state |
| APK process crashes | HOME/watchdog relaunches it | Outbox and cache survive |
| Device reboots | Kiosk starts in Lock Task | Sync resumes after network |
| Disk reaches quota | Nonessential media are evicted first | Catalogue and outbox protected |
| Administrator password is repeatedly guessed | Maintenance login is rate-limited | Normal visitor kiosk continues |

## 12. Verification and acceptance

### Automated verification

- V3 browser-mode regression tests and production build;
- adapter contract tests for browser and Android transports;
- server tests for snapshot validation fields, handoff expiry, upload limits, and submission idempotency;
- Android unit tests for two-generation snapshot promotion, corrupt-cache fallback, encryption, outbox state transitions, retry, and eviction priorities;
- Android instrumented tests on API level 31 for WebView bridge allowlisting, offline cold start, renderer restart, boot restoration, Lock Task, and protected exit.

### Physical-kiosk failure drill

Acceptance requires a test on the actual Android 12 kiosk:

1. provision Device Owner after factory reset;
2. verify portrait full-screen touch operation and on-screen keyboard;
3. reboot ten times and confirm automatic kiosk restoration;
4. disconnect the patch cable before boot and browse the saved catalogue;
5. submit three offline applications, reconnect, and verify exactly three server records;
6. disconnect immediately after the server commit and verify retry creates no duplicate;
7. terminate WebView and the APK process and verify automatic recovery;
8. fill media storage to the cache threshold and verify catalogue/outbox survival;
9. confirm Home, Recents, notifications, system settings, external links, USB file selection, and ordinary gestures cannot escape the kiosk;
10. authenticate through the hidden administrator gesture and verify the timed maintenance exit;
11. switch to production configuration and verify HTTPS, public QR handoff from a phone on mobile data, and rejection of certificate errors.

### Demonstration acceptance

For the direct-cable demonstration, success means V3 starts automatically, fills the screen, loads from the server, survives a deliberate cable removal, accepts an offline text application, and synchronises it once the cable is restored. QR phone handoff is not part of the cable-only demonstration because the phone has no route to that server.

## 13. Delivery sequence

Implementation is one coordinated feature delivered in testable slices:

1. server idempotency and snapshot contracts;
2. V3 transport abstraction and truthful offline states;
3. Android shell with bundled V3 and strict navigation policy;
4. native snapshot/media persistence;
5. encrypted outbox and synchronisation;
6. Device Owner, Lock Task, boot, watchdog, and maintenance panel;
7. phone handoff and production HTTPS profile;
8. automated tests, physical-kiosk drills, and deployment runbook.

The direct-cable demonstration slice is usable before the public-domain and VPN slice, without creating a separate application architecture.

