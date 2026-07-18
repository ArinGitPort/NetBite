# NetBite Project Handover

## Mobile-readiness pass

- Runtime device, Ethernet, packet, and control-icon artwork now uses generated `-mobile.png` variants; the larger imported source PNGs remain untouched.
- Regenerate those variants with `npm run assets:optimize`.
- Flashcard reviews persist their last card per chapter and clear the saved position after completion.
- Home continuation uses quiz mastery rather than quiz attempt status.
- Completed chapter screens show a compact field-report recap.
- Reading-heavy panels use neutral surfaces with color reserved for borders, labels, and state markers.
- Rendered tests cover flashcard interactions, the complete Ethernet cabling lab path, and chapter recaps.

Last updated: July 18, 2026

## Current repository state

- Branch: `main`
- Current committed HEAD: `658feb6 add features`
- Remote state: committed `main` is aligned with `origin/main`.
- The working tree contains the packet-artwork integration, flashcard flip, July 18 mobile reliability pass, and complete Chapter 2 and Chapter 3 implementations described below.
- `docs/CURRICULUM.md` has been reviewed and rewritten into one consistent learning sequence.

Before transferring through Git, review and commit the intended application, documentation, test, dependency, and asset changes together.

Suggested pre-commit review:

```bash
git status --short
git diff --check
npx tsc --noEmit
npm run lint
npm test
npx expo-doctor
npx expo export --platform android
```

## Environment

NetBite is an Expo SDK 57 application. `AGENTS.md` requires reading the exact Expo 57 documentation before writing Expo-specific code:

<https://docs.expo.dev/versions/v57.0.0/>

Important project versions:

- Expo: `~57.0.7`
- React Native: `0.86.0`
- React: `19.2.3`
- React Native Web: `~0.21.0`
- TypeScript: `~6.0.3`, strict mode
- Expo Router: `~57.0.7`
- React Native Reanimated: `4.5.0`
- React Native Gesture Handler: `~2.32.0`
- React Native SVG: `15.15.4`
- Zustand: `^5.0.14`
- Minimum Node version for Expo 57: Node 22.13.x

The current development shell was verified with Node `v24.13.0` and npm `11.6.2`. A maintained Node LTS release that satisfies Expo's minimum is recommended for another machine.

Dependencies were restored successfully with `npm ci` after the previous `node_modules` directory was found to be incomplete. If `npm ci` fails on Windows with an `EPERM` error involving a native `.node` file, stop the running Expo/Node development server and retry; the dev server may be holding the binary open.

## Setup on another machine

From the repository root:

```bash
npm ci
npx expo start --clear
```

Useful commands:

```bash
npm run web
npm run android
npm run ios
npx tsc --noEmit
npm run lint
npm test
npx expo-doctor
npx expo install --check
npx expo export --platform android
```

`ios` requires macOS. Android requires Expo Go, a development build, or an Android emulator.

The Expo SDK packages were aligned on July 18, 2026. `npx expo-doctor` passes all 20 checks.

## July 18 mobile reliability pass

The application remains an Expo/React Native Android and iOS project. Web is a local preview and testing target, not a release target, and static web output was removed from `app.json`.

Implemented in this pass:

- Durable Zustand progress and topology persistence backed by `expo-sqlite/kv-store` on Android/iOS and browser `localStorage` for the web preview
- Dynamic message-demo routes: two-PC networks select their route automatically; networks with three or more reachable PCs expose compact FROM/TO endpoint selectors
- Splash-screen hydration so persisted progress loads before the first screen appears
- Expo SDK 57 patch alignment plus `expo-sqlite`, `expo-haptics`, and Jest tooling
- Native route guards, a custom not-found screen, and a root error recovery screen
- Unique device labels and restart-safe device IDs
- Best quiz score preservation
- Lab workspace reset no longer revokes earned completion
- Explicit connection outcomes for successful, cancelled, duplicate, and missing-device selections
- Enlarged cable touch targets, cable selection, and confirmed cable removal
- Device-role explanations when a topology node is selected
- Interrupted drag recovery and a 12-device Chapter 1 canvas limit
- Progressive lab hints
- Packet-stage captions, reduced-motion behavior, and restrained success/warning haptics
- Home `Continue` now opens the first unfinished activity
- Improved text contrast, progress accessibility values, quiz announcements, and device-tray labels
- Data-driven Chapter 1 lab definition
- Thirteen unit tests covering validation, progress, persistence migration, and store rules

## Chapter 2 — Ethernet

Chapter 2 is implemented and currently available immediately. Sequential chapter locking is intentionally disabled during development and testing.

Included:

- Four lessons: frames, NICs, copper/fiber media, and ports/link status
- A compact code-native frame illustration plus theme-matched transparent PNG assets for the NIC, copper cable, fiber cable, and port bank
- A focused Lesson 3 manual-cabling practice covering PC-to-switch, router-to-switch, and switch-to-switch links; the rule is taught immediately before it is assessed
- Lesson 3 includes a three-row device-and-wiring schematic plus a plain-language expansion and explanation of auto-MDIX
- An explicit auto-MDIX note so the manual crossover rule is not presented as universally required on modern hardware
- Five quiz questions with explanations
- Five reversible flashcards
- Data-driven chapter registry and shared chapter/lesson/quiz/flashcard screens
- Per-chapter quiz, flashcard, and lab progress with a version 1 to version 2 persistence migration
- Home-screen unlock state, current-chapter continuation, and Chapter 2 learning-path entry

Chapter 2 content lives primarily in `src/content/chapter-two.ts`. Pure cable validation is in `src/core/network/ethernet-cabling.ts`, and the lab UI is in `src/features/ethernet/components/ethernet-cable-lab.tsx`.

## Chapter 3 — Switching and MAC Addresses

Chapter 3 is implemented as a complete learning unit:

- Four lessons covering MAC address format, source learning, known and unknown unicast, and broadcasts
- Responsive code-native technical illustrations using the existing optimized PC and switch artwork
- A fixed three-PC guided switch desk with four ordered prediction scenarios
- Deterministic source learning, source movement, known forwarding, unknown flooding, broadcast flooding, and ingress-port exclusion in a pure switching engine
- Five scenario questions with 4/5 mastery, seven flashcards, persisted lab completion, home continuation, and a chapter recap
- Accessible endpoint and port-state descriptions, live feedback, reset behavior, and neutral reading surfaces

Chapter 3 content lives in `src/content/chapter-three.ts`. Pure forwarding decisions are in `src/core/network/switching.ts`; the guided lab is in `src/features/switching/components/switch-decision-lab.tsx`. Technical references and scope boundaries are recorded in `docs/references/CHAPTER3_SOURCES.md`.

Technical claim sources are recorded in `docs/references/CHAPTER2_SOURCES.md`.

The generated NetBite branding artwork is stored at `assets/images/branding/netbite-splash.png` and configured through the `expo-splash-screen` plugin. The native splash remains visible while fonts and persisted game state hydrate, then fades into the app.

Product references now live in `docs/product/`:

- `USABILITY.md`
- `ENGAGEMENT.md`
- `ROBUSTNESS.md`
- `IMPLEMENTATION_ORDER.md`

## Product and learning scope

NetBite is a mobile-first networking education game inspired by introductory CCNA concepts. It teaches through short lessons, a visual topology lab, a quiz, and reversible flashcards.

The interface takes high-level inspiration from the engineered programming-game presentation of EXAPUNKS and TIS-100 while keeping its own mobile-first identity:

- Compact hardware-console framing
- Schematic grids, rails, nodes, and connections
- Functional diagnostic hierarchy
- Warm hacker-hardware colors instead of a conventional blue educational UI
- Beginner-friendly explanations instead of dense simulated terminal output

Only Chapter 1 is implemented. Chapter 1 teaches:

- What a computer network is
- Why networks exist
- The roles of PCs, switches, and routers
- Physical connections
- Connected versus disconnected devices
- A simple visual explanation of a PC-to-switch-to-PC data path

NetBite is not a protocol-level simulator. Devices are graph nodes, cables are graph edges, and pure validation/path functions inspect serializable graph state.

The message-path animation in Chapter 1 is deliberately illustrative. It shows a marker moving along a valid `PC -> switch -> PC` path. It does not model packets, Ethernet frames, addressing, ARP, timing, queuing, loss, collisions, or contents.

Do not add IP addressing, CLI configuration, routing, real packet simulation, or later chapters unless explicitly requested.

## Implemented application flow

Routes:

```text
src/app/index.tsx
src/app/chapter/[chapterId].tsx
src/app/lesson/[lessonId].tsx
src/app/lab/[labId].tsx
src/app/quiz/[chapterId].tsx
src/app/flashcards/[chapterId].tsx
```

Completed screens and activities:

- NetBite home screen
- Chapter 1 activity screen
- Four data-driven lesson screens
- One interactive topology lab
- Five-question quiz with explanations
- Five reversible flashcards
- In-memory activity progress

### Navigation reliability

Flow-exit controls no longer depend on `router.back()`. Directly opening or refreshing a web route can leave no navigation history and previously caused the development warning `GO_BACK was not handled by any navigator`.

The current destinations are deterministic:

- Chapter screen exits to Home with `router.dismissTo('/')`.
- Lesson, lab, quiz, and flashcard flows exit to Chapter 1 with `router.dismissTo('/chapter/1')`.
- `dismissTo` returns to the existing parent route when it is in the stack and safely replaces the current route when it is not.

## Lesson progress and completion

Implementation:

```text
src/app/lesson/[lessonId].tsx
```

Current lesson behavior:

- Dedicated Previous Lesson and Next Lesson buttons
- Previous Lesson is disabled only on Lesson 1
- Moving between lesson IDs uses explicit route replacement, so the Close control is not overloaded as lesson navigation
- Close exits the lesson flow to Chapter 1
- Completing each page records its lesson ID through the Zustand action `completeLesson`
- Completing Lesson 4 opens a success feedback modal instead of immediately navigating away
- The completion modal offers `Start quiz` or `Back to chapter`
- `Start quiz` proceeds directly to `/quiz/1`

## Flashcard review

Implementation:

```text
src/app/flashcards/[chapterId].tsx
```

Current flashcard behavior:

- Previous Card and Next Card controls are always available when a card exists in that direction
- Previous is disabled only on the first card
- Next and Finish Review do not require the learner to flip the card first
- Cards are freely browsable because this activity is for review, not assessment
- The card uses a Quizlet-style 3D Y-axis flip in either direction, powered by the existing Reanimated dependency
- Both faces stay mounted in the same fixed card space, repeated taps are ignored during the 420 ms transition, and reduced-motion preferences skip the animation
- `TERM FIRST` shows the networking term and reveals its definition
- `DEFINITION FIRST` shows the definition and reveals its term
- The chosen direction persists while moving through the deck
- Changing the direction resets the current card to the newly selected front side
- Each newly visited card begins on the selected front side
- The example is shown on the revealed side
- The direction selector uses accessible radio roles and checked states
- The card exposes a dynamic accessibility label explaining what is visible and what tapping will reveal
- Finishing the fifth card marks and persists the flashcard activity as reviewed

## Quiz

Implementation:

```text
src/app/quiz/[chapterId].tsx
```

The quiz remains a five-question activity with single-answer selection, correct/incorrect visual states, explanations, a final score screen, and navigation to Chapter 1 or flashcards.

Navigation and result controls now use the shared PNG icon system, and Close safely returns to Chapter 1 even after a direct web refresh.

## Topology lab

Primary implementation:

```text
src/app/lab/[labId].tsx
src/features/topology/components/topology-canvas.tsx
src/core/network/models.ts
src/store/use-game-store.ts
```

The user can:

- Add PCs, switches, and routers
- Drag devices within the canvas while attached cables follow in real time
- Enter and exit connection mode
- Select two devices to create a cable
- Tap a cable to remove it
- Select and remove a device
- Automatically remove all cables attached to a deleted device
- Reset the entire lab after confirmation
- Validate the Chapter 1 objective
- Run an illustrative packet-path animation after building a valid topology

### Connection and validation behavior

The Chapter 1 objective succeeds when at least two PCs connect to the same switch.

Pure validation remains in:

```text
src/core/network/models.ts
```

`validateTwoPCsToSameSwitch(topology)` returns serializable success, reason, and optional learning-tip data. React components do not contain the validation algorithm.

### Device removal

Device deletion is intentionally explicit:

1. Exit connection mode.
2. Tap a device to select it.
3. Press `Remove device`.
4. Confirm the action in the feedback modal.

The Zustand `removeDevice(deviceId)` action removes the device, removes every incident cable, and clears connection selection if the deleted device was selected for a cable.

Removal selection is also stored in Zustand. Entering connection mode clears removal selection immediately, so the remove-device panel and cable-selection mode cannot be active at the same time.

Reset restores the original three-device topology and removes user-added devices and cables. Reset also clears connection mode and current validation feedback.

### Responsive canvas positioning

The topology canvas reports its measured width to the Zustand store. Existing device X positions shift by half the canvas-width difference, preserving their relative layout while keeping the topology centered during initial layout and responsive resizing. Reset creates a fresh centered topology for the most recently measured canvas width. Newly added devices spawn in a small stagger around the canvas center instead of at the left edge.

Live drag coordinates remain transient component state and drive only cable rendering. Zustand receives the committed device position when dragging ends, preserving the rule that per-frame gestures do not mutate global network state.

### Packet-path demonstration

`findPacketDemoPath(topology)` is a pure graph helper in `src/core/network/models.ts`. It returns the first valid path containing two PCs connected to the same switch.

The `Send demo message` control is disabled until such a path exists. When enabled, React Native Reanimated moves a small marker:

```text
source PC -> intermediary switch -> destination PC
```

Current animation details:

- Two legs at 700 ms each
- The marker fades after reaching the destination
- Repeated sends cancel and restart the previous marker animation
- The marker uses the transparent folder artwork at `assets/images/packets/packet.png`
- Its 18 px layout slot produces an approximately 14-15 px visible folder silhouette
- The animation follows current graph positions when it starts
- It is labeled as a conceptual message-path demonstration rather than a protocol simulation

### React Native SVG web fix

Cable removal uses a platform-specific event mapping:

- Web: `onClick`
- Android/iOS: `onPress`

Using SVG `onPress` on web caused `react-native-svg` to forward unsupported responder properties such as `onResponderTerminate` to a browser SVG `<line>`. The platform mapping removes that console error while preserving native tapping.

## Feedback modal system

Reusable implementation:

```text
src/shared/components/feedback-modal.tsx
```

The modal supports neutral, warning, and success treatments; optional status icons; a dedicated close-icon control; readable eyebrow/title/message/detail content; primary and secondary actions; Android back handling; and an accessible modal alert surface.

Modal visibility is kept separate from its result data. This prevents content from changing to fallback warning text while the native fade-out animation is still visible.

Current uses:

- Confirm lab reset
- Show failed network validation and a learning tip
- Show successful network validation with `Return to lab` and `Back to chapter` actions
- Confirm device removal
- Prompt the learner to start the quiz after completing all four lessons

Routine Previous, Next, and normal navigation actions remain immediate to avoid modal fatigue.

## Navigation icon system

Integrated artwork:

```text
assets/images/icons/icon-arrow-left.png
assets/images/icons/icon-arrow-right.png
assets/images/icons/icon-check.png
assets/images/icons/icon-close.png
assets/images/icons/icon-lock.png
assets/images/icons/icon-reset.png
```

Centralized components:

```text
src/shared/components/app-icon.tsx
src/shared/components/icon-button.tsx
src/shared/components/app-button.tsx
```

The assets are used for back, close, reset, next, completion, and locked states. Controls retain React Native labels, pressed states, minimum 44 px touch targets, disabled states, and accessibility labels.

Icon sizing:

- `AppIcon` default size is controlled in `src/shared/components/app-icon.tsx`.
- Icons inside full-width `AppButton` controls are explicitly rendered at 20 px in `src/shared/components/app-button.tsx`.
- Individual status, activity, and lock icons may pass an explicit `size` prop at their call site.

## Visual design

Full design specification:

```text
docs/THEME.md
```

Current direction:

- Compact retro-industrial training console
- High-level EXAPUNKS and TIS-100 inspiration without copying their assets or interface
- Warm plum-black background rather than blue
- Charcoal work surfaces and machine-gray borders
- Muted red for commands, navigation, selection, cables, and progress
- Warm orange for connection mode, attention, and the packet marker
- Desaturated sage for confirmed success
- Fira Code throughout the active application
- 16 px maximum heading size
- 11-13 px application text
- Square corners
- No UI shadows, blur, glow, glass, or decorative terminal noise
- Saturated color communicates state rather than decoration
- Useful instructions and feedback only

Theme tokens:

```text
src/shared/theme.ts
```

Shared UI primitives:

```text
src/shared/components/app-button.tsx
src/shared/components/app-icon.tsx
src/shared/components/console-text.tsx
src/shared/components/feedback-modal.tsx
src/shared/components/grid-background.tsx
src/shared/components/icon-button.tsx
src/shared/components/progress-bar.tsx
src/shared/components/screen.tsx
```

Fira Code is loaded in `src/app/_layout.tsx` through `@expo-google-fonts/fira-code` and `expo-font`.

Theme consistency note: `docs/THEME.md` currently says icon glyphs remain at or below 16 px, while the implementation uses 20-32 px icon layout sizes. Resolve this documentation mismatch before treating the icon scale as final. A useful distinction would be between the touch/layout slot and the visible symbol size.

The written no-gradient rule should be interpreted as applying to UI panels and effects. Existing raster device/icon artwork contains dimensional shading. If that shading is intentional, document a narrow artwork exception instead of weakening the UI rule.

## Device artwork

Integrated transparent isometric PNGs:

```text
assets/images/devices/device-pc.png
assets/images/devices/device-switch.png
assets/images/devices/device-router.png
```

Centralized renderer:

```text
src/features/devices/components/device-glyph.tsx
```

The PNG files contain different amounts of transparent padding. Visible artwork zoom is controlled with:

```ts
export const DEVICE_IMAGE_SCALE = {
  pc: 1.65,
  switch: 1.1,
  router: 1.2,
};
```

`size` controls the component layout slot. `imageScale` controls artwork zoom inside that slot.

## Responsive lesson illustrations

Implementation:

```text
src/features/lessons/components/lesson-illustration.tsx
```

The component measures its actual card width rather than using phone/tablet breakpoints. It calculates one continuous proportional scale for the complete device arrangement.

Current fitting allowance:

```ts
const usableWidth = contentWidth * 0.88;
```

- Increase `0.88` to use more horizontal space.
- Reduce it to create more separation.

The proportional fit is clamped between `0.3` and `1`. It includes `DEVICE_IMAGE_SCALE`, so changing device artwork zoom is considered on narrow screens. Cables render behind the artwork and connect device-slot centers.

## Data-driven content

All Chapter 1 lessons, quiz questions, flashcards, and content interfaces live in:

```text
src/content/chapter-one.ts
```

Do not hardcode new lesson or quiz content inside route components.

## Architecture rules

```text
src/
|-- app/          Expo Router routes and screen composition
|-- content/      Lesson, quiz, and flashcard data
|-- core/         Framework-independent networking models and validation
|-- features/     Feature-specific visual components
|-- shared/       Reusable UI, typography, background, and theme primitives
`-- store/        Zustand state and actions
```

Maintain these boundaries:

- Networking validation and graph-path logic stays out of React components.
- Store mutations go through typed Zustand actions.
- Content remains data-driven.
- Pure validation/path functions accept and return serializable data.
- UI animations and rendering do not belong in the validation engine.
- TypeScript remains strict; do not introduce `any`.
- Cross-platform event differences must be handled deliberately rather than silencing web warnings.

## Verification status

The latest implementation state passed:

```bash
npx tsc --noEmit
npm run lint
npm test
npx expo-doctor
npx expo export --platform all
```

The Chapter 3 verification pass completed successfully across Web, iOS, and Android production exports. TypeScript, Expo lint, all 31 automated tests, and `git diff --check` pass; Git only reports expected Windows LF-to-CRLF conversion warnings. The new switch desk was also rendered at a 500 px mobile viewport and 800×430 mobile landscape. Its flex layout has no fixed content width and is structured for the planned 360, 390, and 430 px native device checks.

Manual checks recommended before committing:

- Open every route through the app and through a native deep link, including an invalid identifier.
- Complete all four lessons and verify the quiz prompt actions.
- Browse flashcards forward and backward without flipping them.
- Switch between Term First and Definition First on multiple cards.
- Add and delete a device with attached cables.
- Confirm reset cancellation and reset completion.
- Validate an incomplete and a complete topology.
- Send the packet marker after connecting two PCs to one switch.
- Interrupt a device drag and confirm it returns to a valid stored position.
- Restart the app and confirm progress and topology restoration.
- Repeat the core flow with TalkBack or VoiceOver, large text, and reduced motion.

## Known limitations and deferred work

- Supabase synchronization is not implemented.
- Chapter unlocking is visual only.
- Chapter 4 and later networking systems are intentionally not implemented.
- CLI, IP addressing, routing, and real packet/protocol simulation remain out of scope.
- Packet path selection currently uses the first valid two-PC/shared-switch path.
- The packet marker now uses final folder artwork; its scale can still be tuned after device testing.
- The packet animation has not been extended to multiple paths, routers, failures, acknowledgements, or packet contents.
- App accessibility has improved, but a full screen-reader and keyboard-navigation audit has not been completed.

## Packet artwork

The final packet asset is integrated at:

```text
assets/images/packets/packet.png
```

It is a transparent isometric orange folder rendered inside the existing animated container. The Reanimated shared-value path, two-leg timing, cancellation, restart, and fade behavior remain unchanged. `PACKET_SIZE` in `src/features/topology/components/topology-canvas.tsx` controls its 18 px layout slot.

## Primary documentation

Read these before expanding the implementation:

```text
AGENTS.md
docs/AI_DEVELOPER_GUIDE.md
docs/CHAPTER1.md
docs/CONTENT_GUIDE.md
docs/GAME_DESIGN.md
docs/NETWORK_SCOPE.md
docs/THEME.md
```
