# NetBite Project Handover

Last updated: July 18, 2026

## Repository state

- Branch: `main`
- Latest committed work: `58ff34b add function`
- The working tree was clean before this handover file was created.
- Commit and push `docs/HANDOVER.md` before moving to the laptop if the transfer is through Git.

## Environment

NetBite is an Expo SDK 57 application. The repository instruction in `AGENTS.md` requires checking the exact Expo 57 documentation before writing Expo-specific code:

<https://docs.expo.dev/versions/v57.0.0/>

Important versions:

- Expo: `~57.0.6`
- React Native: `0.86.0`
- React: `19.2.3`
- TypeScript: `~6.0.3`, strict mode
- Minimum Node version for Expo 57: Node 22.13.x
- Recommended laptop setup: current Node 22 LTS

The original development machine was using Node `v25.8.2` and npm `11.11.1`, but Node 22 LTS is the safer laptop choice.

## Laptop setup

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

`ios` requires macOS. Android requires either Expo Go, a development build, or an Android emulator.

## Product scope

NetBite is a mobile-first networking education game inspired by introductory CCNA concepts. It teaches through short lessons, visual labs, quizzes, and flashcards.

It is intentionally not a protocol-level simulator. Devices are graph nodes, cables are graph edges, and pure validation functions inspect network state.

Only Chapter 1 has been implemented. Do not add IP addressing, CLI configuration, routing, packet simulation, or later chapters until explicitly requested.

Chapter 1 teaches:

- What a computer network is
- Why networks exist
- PCs, switches, and routers
- Physical connections
- The difference between connected and disconnected devices

## Completed work

### Application flow

- NetBite home screen
- Chapter 1 activity screen
- Four data-driven lesson screens
- One interactive topology lab
- Five-question quiz with explanations
- Five flashcards
- In-memory activity progress

Routes:

```text
src/app/index.tsx
src/app/chapter/[chapterId].tsx
src/app/lesson/[lessonId].tsx
src/app/lab/[labId].tsx
src/app/quiz/[chapterId].tsx
src/app/flashcards/[chapterId].tsx
```

### Topology lab

The user can:

- Add PCs, switches, and routers
- Drag devices
- Enter connection mode
- Connect two devices with a cable
- Tap a cable to remove it
- Reset the lab
- Validate the beginner objective

The Chapter 1 objective succeeds when at least two PCs connect to the same switch.

Networking models, factories, and validation:

```text
src/core/network/models.ts
```

Zustand topology and progress state:

```text
src/store/use-game-store.ts
```

Topology UI:

```text
src/features/topology/components/topology-canvas.tsx
```

### Data-driven content

All Chapter 1 lessons, quiz questions, flashcards, and content interfaces live in:

```text
src/content/chapter-one.ts
```

Do not hardcode new lesson or quiz content inside route components.

## Architecture

The current structure follows feature-driven separation:

```text
src/
├── app/          Expo Router routes and screen composition
├── content/      Lesson, quiz, and flashcard data
├── core/         Framework-independent networking models and validation
├── features/     Feature-specific visual components
├── shared/       Reusable UI, typography, background, and theme primitives
└── store/        Zustand state and actions
```

Important rules:

- Networking logic stays out of React components.
- Store mutations go through Zustand actions.
- Content remains data-driven.
- Pure validation functions accept and return serializable data.
- UI animations and rendering do not belong in the validation engine.
- TypeScript remains strict; do not introduce `any`.

## Visual design

The full design specification is in:

```text
docs/THEME.md
```

Current direction:

- Compact retro-industrial hardware console
- Warm plum-black background, not blue
- Charcoal panels and machine-gray/green borders
- Muted red for actions, links, selection, cables, and progress
- Warm orange for connection mode
- Desaturated sage for success
- Fira Code throughout the active application
- Maximum heading size of 16 px
- Body text between 11 and 13 px
- Square corners
- No shadows, gradients, blur, glow, or decorative terminal noise
- Keep only useful navigation, real progress, instructions, and learning feedback

Theme tokens:

```text
src/shared/theme.ts
```

Shared UI primitives:

```text
src/shared/components/app-button.tsx
src/shared/components/console-text.tsx
src/shared/components/grid-background.tsx
src/shared/components/progress-bar.tsx
src/shared/components/screen.tsx
```

Fira Code is loaded in `src/app/_layout.tsx` through `@expo-google-fonts/fira-code` and `expo-font`.

## Device artwork

Three transparent isometric PNGs are integrated:

```text
assets/images/devices/device-pc.png
assets/images/devices/device-switch.png
assets/images/devices/device-router.png
```

The centralized renderer is:

```text
src/features/devices/components/device-glyph.tsx
```

The PNG files contain different amounts of transparent padding. Visible artwork zoom is controlled here:

```ts
export const DEVICE_IMAGE_SCALE = {
  pc: 1.65,
  switch: 1.1,
  router: 1.2,
};
```

`size` controls the component's layout slot. `imageScale` controls the artwork zoom inside the slot. Most callers use `DEVICE_IMAGE_SCALE` automatically.

Example per-use override:

```tsx
<DeviceGlyph type="pc" size={64} imageScale={1.8} />
```

## Responsive lesson illustrations

Lesson diagrams are implemented in:

```text
src/features/lessons/components/lesson-illustration.tsx
```

The component does not use phone/tablet breakpoints. It measures its actual card width and calculates one continuous proportional scale for all three devices.

The calculation includes `DEVICE_IMAGE_SCALE`, so increasing the PC zoom will also be accounted for on narrow screens.

Current fitting allowance:

```ts
const usableWidth = contentWidth * 0.88;
```

- Increase `0.88` to use more horizontal space.
- Reduce it to create more separation.

The proportional fit is clamped between `0.3` and `1`. Cables are rendered behind the artwork and anchored between device-slot centers, so modifying image zoom does not create visible connection gaps.

Device labels such as `PC`, `SWITCH`, and `ROUTER` are rendered by the app, not embedded in the PNGs.

## Learning path

The home screen learning path is a vertical circuit schematic:

- 1 px data rail
- 12 × 12 px chapter nodes
- Current node uses `#C04848`
- Locked node is outline-only

Implementation:

```text
src/app/index.tsx
```

## Where work stopped

The last completed change was continuous responsive scaling for lesson device diagrams. TypeScript and Expo lint passed afterward.

The next discussed task was navigation icon artwork. No button icon PNGs have been imported or connected yet.

Proposed first icon set:

```text
icon-back.png
icon-close.png
icon-reset.png
icon-next.png
icon-lock.png
icon-check.png
```

Recommended asset requirements:

- Transparent PNG
- 256 × 256 master
- Identical canvas and padding
- Solid hardware red `#C04848`, or solid white if runtime tinting is desired
- Sharp geometric construction
- No text, button frame, shadow, glow, gradient, or background
- Recognizable at 20 × 20 px

Keep button frames, labels, pressed states, 44 px touch targets, and accessibility in React Native. Only the symbol should be an asset.

Current text controls such as `[X]`, `[ BACK / HOME ]`, and `[ RESET ]` are placeholders until icon assets are available.

## Known limitations and deferred work

- Progress is in memory and resets after restarting the app.
- SQLite persistence is not implemented.
- Supabase synchronization is not implemented.
- Chapter unlocking is visual only.
- There are no automated unit tests yet.
- Chapter 2 and future networking systems are intentionally not implemented.
- CLI, IP addressing, routing, and packet simulation are intentionally out of scope.

## Verification status

The following checks passed during the latest implementation work:

```bash
npx tsc --noEmit
npm run lint
npx expo install --check
npx expo export --platform web
```

Run at least TypeScript and lint after making changes on the laptop.

## Primary documentation

Read these before expanding the implementation:

```text
docs/AI_DEVELOPER_GUIDE.md
docs/CHAPTER1.md
docs/CONTENT_GUIDE.md
docs/GAME_DESIGN.md
docs/NETWORK_SCOPE.md
docs/THEME.md
```
