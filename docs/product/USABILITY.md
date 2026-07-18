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

## Visual readability

- Normal text must meet a 4.5:1 contrast ratio against its actual surface.
- Test screens with large system font sizes before release.
- Technical uppercase labels may remain compact; educational sentences remain sentence case.
