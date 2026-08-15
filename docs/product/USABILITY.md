# Mobile Usability and Accessibility

## Interaction baseline

- Design Android and iOS first. Web support is optional.
- Keep every primary touch target at least 44 by 44 points.
- Never make a thin cable, small icon, drag gesture, color, or animation the only way to perform or understand an action.
- Keep one obvious primary action per section.
- Preserve the learner's work when they leave the app.
- `Continue` resumes the first unfinished activity instead of only opening a chapter menu.

## Topology canvas

- A normal device tap selects the device and explains its role. Removal remains a separate labeled action with confirmation.
- Connection mode always states which device is selected and what the learner should tap next.
- Invalid or ignored actions explain why: same device, duplicate cable, or unavailable target.
- Cables use an enlarged invisible touch target and an accessible labeled removal control.
- Interrupted drags restore a valid stored position.

## Feedback

- Success, warning, and incorrect states use both text and color.
- Feedback explains what happened, why it happened, and the next useful action.
- Quiz and lab feedback is announced to screen readers.
- Progress controls expose a numeric accessibility value.
- Respect reduced-motion settings. Haptics are subtle reinforcement, never required information.
- Resume an interrupted flashcard review at the learner's last card and clear that position only after the review is completed.
- `Continue learning` returns to a below-mastery quiz before recommending later review activities; it never locks chapter access.
- Completed chapters show a compact field report describing what the learner built, learned, and will encounter next.

## Adaptive learning and personal reference

- Keep completion, current-version quiz mastery, and unresolved review items separate; do not compress them into a fictional score.
- Missed scenarios and cards marked `Review Again` enter one retry-until-correct queue without penalties.
- Bookmarks support lessons, technical visuals, flashcards, and canonical CLI command families. Personal notes remain plain text and are limited to 1,000 characters.
- Removing a saved item that contains a note requires confirmation. Resetting learning progress does not delete personal notes.
- Contextual guides are short, skippable, replayable, and placed after the task's primary action in reading order.
- Simulation explanations separate observation, networking rule, supported conclusion, and the next useful check.

## Local research and diagnostics

- Usability recording is development-only, explicitly consented, local, and reversible.
- Record only task timing, completion or abandonment, help use, and aggregate validation errors. Never record notes, commands, addresses, taps, account identifiers, or screen contents.
- Pause cloud synchronization while temporary research data is active and restore the exact prior game and sandbox stores afterward.
- Diagnostic reports exclude endpoints, keys, tokens, email addresses, note contents, IP configuration, and command history.

## Visual readability

- Normal text must meet a 4.5:1 contrast ratio against its actual surface.
- Test screens with large system font sizes before release.
- Technical uppercase labels may remain compact; educational sentences remain sentence case.

## Navigation and command consistency

- Back and Close occupy the physical top-left safe area on phones, tablets, and web. They do not align to the center of a capped content column.
- A task presents one primary action. Help, Reset, Save, Undo, history, and advanced inspection remain secondary or utility controls.
- CLI labs begin with the objective, setup support, topology, and selected-device inspector. Opening a console is deliberate and always uses the shared full-screen CLI.
- Closing a console returns to the same overview, device, transcript, evidence, and configuration state.
- Routed topology cables display the derived network and prefix in a midpoint lane. Endpoint port labels stay beside their devices; addresses never return to device cards.
