# Release 26 — Detector v2.1 (UNBLOCKED — build when ready)

Release 25 LIVE ON PRODUCTION 2026-08-13 3:01PM (promoted from internal track).
Aug 31 target-API deadline met. Detector v2.1 below ships as release 26.
NEEDS A FULL NATIVE BUILD (new local module modules/steady-wakelock) — old dev
clients/APKs won't have it. Before 26: fire a test BEACON on the live 25 and
confirm a family phone receives the push (projectId fix, still unverified E2E).

## Detector v2.1 — why (user-reported + adversarial review findings)

- KJ: violent 2-hand shaking did NOT trigger. Root causes: fixed 1.2g line invisible
  when force floor stays above it; >8 Hz hard-reset the counter.
- Review (3 attack agents, verified where session limits allowed): NO WAKELOCK anywhere
  (CPU suspends overnight → sensor silent — the core use case!), vehicle engine
  vibration aliased into the band (tricycle idle fired a BEACON in 2.6s in sim),
  sideways-to-gravity shaking quadratically suppressed (0.7g orthogonal ≈ invisible),
  <15 samples/s delivery = silent permanent blindness, jogging cadence false-fired.

## What was built

- modules/steady-wakelock — local Expo module (Kotlin): PARTIAL_WAKE_LOCK held while
  monitoring (WAKE_LOCK permission already declared). Acquired/released in
  backgroundMonitor start/stop. Graceful no-op if native module absent.
- seizureDetector v2.1: per-axis gravity-residual (orientation-free, true frequency),
  ~14 Hz anti-alias LPF, robust MAD statistics, median inter-crossing frequency
  (no quantization), time-based scoring (rate-invariant), effectiveRateHz telemetry,
  dt clamp [8,250]ms (clumped-timestamp defense). Band 3.2–13 Hz, σ≥0.15g, 2s sustain.
- backgroundMonitor: 100 Hz sampling (resolves engine vibration for the LPF),
  hardware sensor timestamps, degraded-rate FGS notification warning, wakelock.
- useAccelerometer: 50 Hz, hardware timestamps, ref-based double-start guard.
- Disclaimer copy: phone placement guidance (on patient / on mattress; nightstand no).

## Validation — 16/16 synthetic scenarios (5 runs each)

quiet ✓: rest, walk 2Hz, jog 2.8Hz, run 3.0Hz, engine 26Hz (100Hz + 50Hz delivery),
  engine 45Hz, phone drop, mattress-damped 0.12g (KNOWN LIMIT, disclosed in UI)
fire ✓ (~3.1–3.5s): seizure 5Hz parallel, 5Hz ORTHOGONAL, realistic clonus 7→4Hz
  decaying, violent 10Hz shake, degraded 67ms + 100ms delivery, clumped timestamps
tsc clean. Sim harness: scratchpad detector-sim.ts.

## Also in release 26 — edge-to-edge UI fixes (KJ-reported on live 25)

- Tab bar was overlapped by the system nav bar (targetSdk 36 forces edge-to-edge
  on Android 15+): tabBarStyle now inset-aware via useSafeAreaInsets
  ((tabs)/_layout.tsx). Falls back to the original 24px on older devices.
- patient-select.tsx had no SafeAreaView at all → wrapped (was under status bar).
- All other screens verified: SafeAreaView from react-native-safe-area-context.

## Release 26 steps (when 25 is approved)

1. eas build --profile preview --platform android → install → REAL-WORLD test:
   violent shake, slow rhythmic shake, walk/jog with phone in pocket, overnight
   battery + reliability run, tricycle/vehicle ride if possible.
   UI check: tab bar clear of nav bar on this phone; patient-select header/footer;
   eyeball every screen's bottom edge.
2. If good: eas build --profile production --platform android → submit.
   No new Play declarations needed (no new permissions — WAKE_LOCK already present).
3. Watch first-night battery reports (wakelock cost ~2–5%/night expected).

---

# Release 25 — Foreground Service + targetSdk 36 (one EAS build)

Goal: all code done so a single `eas build` produces release 25 with:
background monitoring (foreground service), targetSdkVersion 36, accelerometer sensitivity fix.

## Plan — ALL CODE COMPLETE

- [x] 1. Recon: map monitoring/alert flow + research FGS library + Play policy
- [x] 2. Design: react-native-background-actions + FGS type "health" (spec below)
- [x] 3. Implement: deps + config plugins (health service type, gradle suppression)
- [x] 4. Implement: lib/seizureDetector.ts + lib/backgroundMonitor.ts
- [x] 5. Implement: monitor toggle wiring, re-arm, persistence, battery tip
- [x] 6. Implement: headless detect→countdown→BEACON path + notification navigation
- [x] 7. Verify: tsc clean · introspect: health service + all permissions + SDK 36
- [x] 8. Adversarial review workflow (5 dimensions, 21 agents, 15 confirmed findings)
- [x] 9. ALL 15 confirmed findings fixed (see Review below)
- [ ] 10. KJ: dev-test on device, then `eas build` + Play Console steps (see handoff)

## Review — 15 findings confirmed by skeptic verification, all fixed

CRITICAL (all fixed):
- Monitor OFF during a pending countdown couldn't stop the BEACON → armed gate +
  countdown abort handle in stop() (backgroundMonitor.ts)
- app.json "targetSdkVersion" is NOT a real Expo key — builds were silently
  targeting API 35, missing the Aug 31 Play deadline → expo-build-properties
  plugin (compileSdk/targetSdk 36) + suppressUnsupportedCompileSdk plugin
- Stale activeSeizureLogId → every background alert failed silently → 404/403
  one-retry recovery with fresh PASSIVE log (fromStorage guard prevents loops)
- Logout left the service armed with a broken alert path → logout stops monitor;
  clearSession clears active-log keys

MAJOR (all fixed):
- start() reentrancy (double-tap / rearm race → ghost duplicate monitors) →
  serialized op chain + monitorBusy UI guard + idempotent task teardown
- iOS monitor latched dead after one detection → rearmAfter() cooldowns
  (60s false alarm / 5min confirmed) mirroring the background service
- activeSeizureStartedAt never cleared → multiRemove everywhere the log id is
  cleared; AURA/BEACON also write it so notification taps get the real timer
- Countdown notification body-tap destroyed the cancel button → autoDismiss:false
- Days-old notification tap replayed on app open → clearLastNotificationResponseAsync

KNOWN LIMITATIONS (accepted, documented):
- If Android kills the process under extreme memory pressure, the system restarts
  the service but the JS task can't resume (RNBA restart limitation) — monitoring
  re-arms on next app open. Idempotent-task guard prevents ghost duplicates.
- Edge-to-edge is forced on Android 16 devices under targetSdk 36; app uses
  SafeAreaView everywhere but screens should be eyeballed on an API 36 device.
- Background alert leg is server push only (SMS needs the composer, by design).

## Design spec (locked — as built)

- FGS: react-native-background-actions@4.1.0, foregroundServiceType "health"
  (no runtime timeout; prerequisite satisfied by install-time HIGH_SAMPLING_RATE_SENSORS)
- Sensors: react-native-sensors@7.3.6 (works in background; expo-sensors stops on
  activity pause — verified in SDK 53 source). Units normalized m/s² → g.
- Flow: detect → vibrate + 30s cancellable countdown notification → PASSIVE log
  → server BEACON push → "family alerted" notif → 5-min cooldown. Cancel → 60s.
- Monitor persists (@steady/monitorEnabled), re-arms on app open, stops on logout.
- New permissions: FOREGROUND_SERVICE, FOREGROUND_SERVICE_HEALTH,
  HIGH_SAMPLING_RATE_SENSORS, WAKE_LOCK. ACTIVITY_RECOGNITION stays blocked.
- Bonus fix: push-token projectId derived from app config (old hardcoded id was a
  different EAS project — family push alerts were likely broken; TEST after build).

## Handoff for KJ (in order)

1. `eas logout` then `eas login` as **hindiakokj1** (currently logged in as
   hindiakokj3, which has no access to the Steady project).
2. Dev-test build first (new native modules — old dev client won't work):
   `eas build --profile development --platform android`
   Test: monitor ON → screen off → shake phone rhythmically ~3s → countdown
   notification → let it fire → check family device gets push. Also test
   "I'M OK" cancel, Monitor OFF, logout-stops-monitor, battery-tip alert.
3. Production: `eas build --profile production --platform android`
   (autoIncrement bumps versionCode to 25)
4. Play Console before/with submission:
   a. App content → Foreground service permissions declaration (FOREGROUND_SERVICE_HEALTH):
      user-initiated, user-stoppable on-device movement monitoring for epilepsy
      safety; custom use case (preset list is fitness-flavored); link a demo video
      showing toggle-on → notification → countdown → cancel → toggle-off.
   b. VERIFY Data safety form still accurate (same data categories as foreground
      flow — health info + precise location sent to same endpoints; update only
      if something is missing).
   c. Do NOT add a background-location declaration (no ACCESS_BACKGROUND_LOCATION).
   d. Health apps declaration — already done from prior releases, re-check only.
5. If review drags past Aug 31: file the target-API extension in Play Console
   BEFORE the deadline (extends to Nov 1, 2026).
