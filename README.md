# NetBite

NetBite is a mobile-first networking education game built with Expo and React Native.

## Setup

```bash
npm install
```

Start the intended target:

```bash
# Android Studio emulator: localhost with ADB forwarding
npm run android

# Android emulator after dependency, Reanimated, or Worklets changes
npm run android:clean

# Physical iPhone on the same network
npm start

# Browser preview
npm run web

# Full laptop presentation preflight
npm run demo:check

# Automated emulator launch, Metro tunnel, and Expo Go open
npm run demo:android

# One-command browser fallback
npm run demo:web
```

The Android commands deliberately use localhost because an emulator may not be able to reach the Windows LAN address printed by Metro. The default `npm start` remains in LAN mode so a physical iPhone can scan the Expo Go QR code.

## Startup troubleshooting

- A white Expo Go screen with a blue spinner means Expo Go is waiting for the JavaScript bundle. It appears before NetBite code runs. Stop stale Metro processes, use `npm run android:clean`, and confirm `adb reverse --list` includes `tcp:8081`.
- NetBite's own startup uses the dark branded splash. If that remains visible, inspect font loading, SQLite hydration, and authentication initialization instead of Metro connectivity.
- Keep `react-native-worklets` at the exact version recorded in `package.json`; the current Android Expo Go binary was verified with that patch.
- Route “missing default export” warnings can be secondary to an earlier dependency crash. Resolve the first runtime error before changing route files.

See [docs/DEMO_RUNBOOK.md](docs/DEMO_RUNBOOK.md) for the presentation checklist, reversible development-only demo mode, and recovery sequence.

## Validation

```bash
npx tsc --noEmit
npm run lint
npm test
npx expo-doctor
npx expo export --platform all
```
