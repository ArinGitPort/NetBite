# NetBite Project Handover

Last updated: July 18, 2026

## Current repository state

- Branch: `main`
- Current committed HEAD: `d0f1611 add handover`
- Remote state: `main` is aligned with `origin/main` before the work described below is committed.
- Implementation baseline before this work: `58ff34b add function`
- The working tree is intentionally not clean. The navigation, feedback, lesson, flashcard, topology, and packet-demo improvements described in this document are currently uncommitted.

Modified tracked files:

```text
docs/HANDOVER.md
src/app/chapter/[chapterId].tsx
src/app/flashcards/[chapterId].tsx
src/app/index.tsx
src/app/lab/[labId].tsx
src/app/lesson/[lessonId].tsx
src/app/quiz/[chapterId].tsx
src/core/network/models.ts
src/features/topology/components/topology-canvas.tsx
src/shared/components/app-button.tsx
src/store/use-game-store.ts
```

New untracked files and directories:

```text
assets/images/icons/
src/shared/components/app-icon.tsx
src/shared/components/feedback-modal.tsx
src/shared/components/icon-button.tsx
```

Before transferring through Git, review the diff and commit all of these files together. Do not commit only this handover because it documents implementation that is still in the working tree.

Suggested pre-commit review:

```bash
git status --short
git diff --check
npx tsc --noEmit
npm run lint
npx expo export --platform web
```

## Environment

NetBite is an Expo SDK 57 application. `AGENTS.md` requires reading the exact Expo 57 documentation before writing Expo-specific code:

<https://docs.expo.dev/versions/v57.0.0/>

Important project versions:

- Expo: `~57.0.6`
- React Native: `0.86.0`
- React: `19.2.3`
- React Native Web: `~0.21.0`
- TypeScript: `~6.0.3`, strict mode
- Expo Router: `~57.0.6`
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
npx expo install --check
npx expo export --platform web
```

`ios` requires macOS. Android requires Expo Go, a development build, or an Android emulator.

At the time of this handover, `npx expo install --check` may recommend newer SDK 57 patch releases for Expo-related packages. Treat those as a separate dependency-maintenance change rather than mixing them into the current feature commit without review.

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

The packet animation added to Chapter 1 is deliberately illustrative. It shows a marker moving along a valid `PC -> switch -> PC` path. It does not model Ethernet frames, addressing, ARP, timing, queuing, loss, collisions, or packet contents.

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
- The card can be flipped in either direction
- `TERM FIRST` shows the networking term and reveals its definition
- `DEFINITION FIRST` shows the definition and reveals its term
- The chosen direction persists while moving through the deck
- Changing the direction resets the current card to the newly selected front side
- Each newly visited card begins on the selected front side
- The example is shown on the revealed side
- The direction selector uses accessible radio roles and checked states
- The card exposes a dynamic accessibility label explaining what is visible and what tapping will reveal
- Finishing the fifth card marks the flashcard activity reviewed in memory

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
- Drag devices within the canvas
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

Reset restores the original three-device topology and removes user-added devices and cables. Reset also clears connection mode and current validation feedback.

### Packet-path demonstration

`findPacketDemoPath(topology)` is a pure graph helper in `src/core/network/models.ts`. It returns the first valid path containing two PCs connected to the same switch.

The `Send demo packet` control is disabled until such a path exists. When enabled, React Native Reanimated moves a small marker:

```text
source PC -> intermediary switch -> destination PC
```

Current animation details:

- Two legs at 700 ms each
- The marker fades after reaching the destination
- Repeated sends cancel and restart the previous marker animation
- The marker is currently a code-drawn 14 px orange square with a light border
- The animation follows current graph positions when it starts
- It is labeled as a packet-path demonstration rather than protocol simulation

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

The modal supports neutral, warning, and success treatments; optional icons; readable eyebrow/title/message/detail content; primary and secondary actions; Android back handling; and an accessible modal alert surface.

Current uses:

- Confirm lab reset
- Show failed network validation and a learning tip
- Show successful network validation with `View topology` and `Back to chapter` actions
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
npx expo export --platform web
```

The web export generated all eight static routes successfully. `git diff --check` also passed; Git only reported expected Windows LF-to-CRLF conversion warnings.

No automated unit tests exist yet. The pure graph helpers and Zustand removal behavior are good candidates for the first test suite.

Manual checks recommended before committing:

- Open every route directly in the browser and confirm Close/Back does not produce a `GO_BACK` warning.
- Complete all four lessons and verify the quiz prompt actions.
- Browse flashcards forward and backward without flipping them.
- Switch between Term First and Definition First on multiple cards.
- Add and delete a device with attached cables.
- Confirm reset cancellation and reset completion.
- Validate an incomplete and a complete topology.
- Send the packet marker after connecting two PCs to one switch.
- Confirm cable removal has no `onResponderTerminate` warning on web.

## Known limitations and deferred work

- Progress is stored only in memory and resets after restarting the app.
- SQLite persistence is not implemented.
- Supabase synchronization is not implemented.
- Chapter unlocking is visual only.
- There are no automated tests.
- Chapter 2 and future networking systems are intentionally not implemented.
- CLI, IP addressing, routing, and real packet/protocol simulation remain out of scope.
- Packet path selection currently uses the first valid two-PC/shared-switch path.
- The packet marker is a temporary code-drawn square, not final artwork.
- The packet animation has not been extended to multiple paths, routers, failures, acknowledgements, or packet contents.
- App accessibility has improved, but a full screen-reader and keyboard-navigation audit has not been completed.

## Next asset task: packet artwork

No packet PNG has been imported yet. The intended location is:

```text
assets/images/packets/packet.png
```

Recommended source requirements:

- Transparent 256 x 256 PNG
- Symmetrical data token rather than a directional arrow
- Strong diamond, octagonal, or compact data-cartridge silhouette
- Artwork fills roughly 75-80% of the canvas
- Recognizable at 14-18 px
- Main color: warm orange `#D18B5A`
- Dark inset colors: `#342118` and `#151216`
- Optional light highlight: `#DDD8DA`
- Optional machine-gray detail: `#3A3F3D`
- Two or three broad color planes with hard edges
- No text, logo, background panel, cast shadow, glow, blur, motion trail, or fine circuitry
- High-level vintage diagnostic/hacker-hardware character without copying EXAPUNKS or TIS-100 symbols

When the file is available, replace the temporary `Animated.View` packet marker in `src/features/topology/components/topology-canvas.tsx` with an animated image while preserving the existing shared-value path animation and 14-18 px rendered size.

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
