# Robustness and Validation

## Mobile-readiness checks

- Preserve imported source artwork and generate explicitly sized `-mobile.png` runtime assets with `npm run assets:optimize`.
- Keep rendered interaction tests outside `src/app`; Expo Router treats every file in that directory as a route.
- Test the complete manual-cabling selection path, flashcard flip/mode/progress behavior, chapter recaps, quiz mastery routing, store migration, and network rules.
- Run TypeScript, Expo lint, Jest, and an Expo web export before extending the curriculum.

## Durable state

Persist only learner-owned durable data:

- Completed lessons
- Lab topology and completion
- Best quiz score
- Flashcard review completion
- Last flashcard position for interrupted reviews

Do not persist temporary interface state such as open dialogs, active animations, removal selections, or half-finished cable selections.

## Validation engine

- Keep network rules in framework-independent pure functions.
- Every validator returns a reason and a useful learning tip.
- Test success, missing-device, missing-switch, wrong-switch, extra-device, and disconnected cases.
- Duplicate and self-connections are rejected with visible feedback.
- Device labels remain unique after add/remove cycles.

## Navigation and recovery

- Validate every dynamic route identifier, including native deep links.
- Unknown content routes offer a clear return action.
- Route-level failures provide retry and home actions.
- Leaving a lab clears temporary connection and selection state without deleting the topology.
- Resetting a workspace does not revoke an earned completion record.

## Release checks

- TypeScript strict check
- ESLint
- Project unit tests
- Expo Doctor
- Android development or preview build
- iOS build when a macOS signing environment is available
- Manual checks with screen reader, large text, reduced motion, interrupted gestures, rotation, background/resume, and process restart

Web export is not a mobile release requirement.
