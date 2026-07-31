# NetBite Presentation Runbook

## Before the demonstration

1. Open Android Studio and cold-start the emulator. Wait for the Android home screen.
2. From the NetBite project, run `npm run demo:check`. It checks public configuration without printing values and builds temporary Android/web bundles.
3. If presentation mode is needed, set `EXPO_PUBLIC_NETBITE_DEMO_MODE=1` in `.env.local`. This capability works only in development.
4. Run `npm run android` (or the equivalent `npm run demo:android`). Keep that terminal open. This launcher warms Expo Go, opens the project route, establishes `adb reverse tcp:8081`, and restores the tunnel if the emulator reconnects.
5. Confirm the NetBite account welcome or main menu appears. Expo Go's blue spinner means JavaScript has not loaded yet; NetBite's dark bootstrap screen means the app is running and identifies the phase being restored.

## Presentation mode

Open **Settings → Start Presentation Session**. NetBite saves one local snapshot, pauses cloud sync, completes Chapter 1, exposes Chapter 2 as the continuation, and loads the routed sandbox preset. The persistent banner says `DEMO ACCESS / NOT PURCHASED`.

Use **Restore My Data** in the banner or Settings when finished. Starting presentation mode twice cannot replace the original snapshot.

## Recovery

- White or blue Expo Go screen: stop the command, verify the emulator is online, then run `npm run android:clean`. The same guarded launcher clears Metro when starting a new server, warms Expo Go before the project deep link, and verifies the reverse tunnel.
- Broken ADB connection: run `adb kill-server`, cold-start the emulator, and rerun `npm run demo:android`.
- Port 8081 occupied: close the known process yourself. The demo launcher deliberately refuses to kill unrelated processes.
- Cloud or DNS outage: choose **Continue locally**. Lessons, labs, quizzes, flashcards, and the development presentation session do not require Supabase.
- Android remains unavailable: run `npm run demo:web` and present from the browser. Resize once before the presentation to verify the intended viewport.

## Expected offline sequence

Main Menu → Browse Chapters → Chapter 2 → lesson/lab/quiz/flashcards. For the simulator: Main Menu → Network Sandbox → routed preset → Test → Ping. Account and payment demonstrations should be omitted while the service is unavailable.
