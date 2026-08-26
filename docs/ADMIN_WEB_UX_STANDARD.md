# NetBite Instructor Portal UX Standard

## Purpose

The Instructor Portal is a professional authoring and publishing tool. It shares NetBite's identity with the Android learner app, but it does not copy the mobile console interface literally. The portal prioritizes scanning, editing, comparison, validation, and safe administrative actions on larger screens.

This standard applies to the responsive website under `admin/`. It does not change the learner application's theme or interaction model.

## Design principles

1. **Editorial clarity before decoration.** Page titles, current status, and the next useful action must be recognizable without reading every panel.
2. **Familiar web controls.** Navigation, forms, tabs, buttons, dialogs, tables, and disclosures should behave like conventional administrative software.
3. **One dominant action per task.** Save, Validate, Publish, or Upload may be primary for the current task. Supporting actions remain visually quieter.
4. **Progressive disclosure.** Advanced release metadata appears only where it helps the current decision. Raw database records and audit payloads never appear in the portal.
5. **Error prevention.** Destructive and publishing actions require clear wording and confirmation. Disabled controls explain the missing prerequisite nearby.
6. **State is never color-only.** Labels, icons, wording, borders, and color work together for draft, valid, warning, published, archived, and unavailable states.
7. **Responsive reflow instead of shrinking.** Columns stack or recompose before labels, inputs, and technical values become unreadable.

## Visual language

### Typography

- **Inter** is the primary interface typeface for headings, navigation, buttons, forms, help text, and prose.
- **Fira Code** is reserved for permanent lesson codes, abbreviated checksums, technical values, and small system labels.
- Large headings use compact letter spacing and short line lengths. Body copy uses comfortable line height and avoids all-uppercase paragraphs.
- Controls and explanatory text must remain readable under browser zoom and operating-system text scaling.

### Surfaces and borders

- Major panels use a restrained neutral surface, one-pixel border, and an 11–15px corner radius.
- Inputs, buttons, tabs, list selections, and compact cards use an 8px radius.
- Pills are reserved for short statuses and roles; ordinary cards must not become pill-shaped.
- Shadows communicate elevation sparingly. Borders and spacing remain the primary grouping tools.
- Nested panels should not repeat heavy borders when spacing or a divider already communicates the relationship.

### Color

- Neutral white and gray establish information hierarchy.
- Red preserves NetBite identity and marks destructive or selected emphasis where appropriate.
- Orange indicates review, validation, or attention.
- Sage green indicates valid, published, connected, or complete states.
- Full saturated backgrounds are avoided except for compact feedback and status treatments.

## Page anatomy

Every authenticated page uses:

1. Persistent sidebar navigation on wide screens.
2. Off-canvas navigation with a dismissible backdrop on smaller screens.
3. Sticky workspace header showing the current section and connection state.
4. Page introduction containing a section label, clear title, one-sentence purpose, and at most one primary action.
5. Responsive content panels organized by task rather than by database table alone.

The selected section is represented in the URL hash. Browser refresh, history navigation, and Supabase token refresh must preserve the learner's current administrative section.

## Components

### Buttons

- Primary buttons use a high-contrast neutral fill and describe the result: `SAVE DRAFT`, `CHECK CURRENT DRAFT`, or `PUBLISH VERSION`.
- Secondary buttons use a quieter outlined treatment.
- Tertiary buttons support nearby actions such as moving or editing.
- Destructive buttons use explicit verbs and a danger treatment.
- Every interactive target is at least 44px tall or wide.

### Forms

- Labels remain visible above fields; placeholders are examples, never the only instruction.
- Help text explains constraints before submission.
- Validation appears close to the affected field or task.
- Inputs keep readable padding, clear focus rings, and sufficient contrast.
- Related fields may share a two-column row only when both remain comfortable at the measured width.

### Panels and lists

- Panels group one recognizable task or information set.
- Lists use consistent row height, selection treatment, and alignment.
- Long lesson codes and URLs may wrap inside their own bounded region. Release identifiers and abbreviated checksums belong inside a collapsed Technical details section.
- Empty states explain what is missing and, when possible, identify the action that creates it.

### Dense authoring collections

- Assessments and other repeated editable records default to a master-detail workspace instead of rendering every form at once.
- The left navigator identifies each record by position, title or prompt, and its parent lesson. The right pane displays one complete editor.
- The selected navigator row uses its own surface and outline. Do not add a colored side rail when the selected card treatment is already sufficient.
- This no-side-rail rule also applies to selected lessons in curriculum navigation.
- The master-detail workspace remains visually flat inside its parent panel; avoid wrapping the editor in another full border when a column divider provides enough grouping.
- A clearly labeled alternate view may display all records for bulk review, but it is not the default working mode.
- Unsaved edits must not disappear when another record, chapter, content type, or view is selected. Selection controls remain unavailable until the current record is saved.
- Record-specific Save and Delete actions belong in a toolbar above the selected editor. Use explicit labels such as `SAVE CHANGES` and `DELETE QUESTION`; never use an unexplained X for record deletion.
- On narrow screens, the navigator becomes a bounded list above the editor so the interface retains the same mental model without horizontal page scrolling.
- Course navigation uses an accordion: one course expands at a time, its header reports the chapter count, and opening another course selects its first chapter so the lesson and editor panes remain synchronized.

### Feedback and status

- Routine success and validation messages appear inline without covering the workspace.
- Loading preserves context whenever possible instead of replacing the whole application.
- Published, archived, draft, and validation states always include readable text.
- Authentication refresh for the same user must not remount the workspace or reset navigation.
- The login submit action must remain visually distinct from its busy state. Authentication requests are bounded and always restore an actionable control after timeout or failure.
- The sidebar account area uses the primary interface font and permits long email addresses to wrap. Permission roles stay out of this compact identity block and appear only where they affect an administrative task.

## Responsive behavior

- **Above 1280px:** persistent sidebar and full multi-column authoring workspace.
- **1081–1280px:** narrower sidebar and reduced content gutters; technical editor columns remain usable.
- **901–1080px:** off-canvas navigation gives the workspace the full viewport width.
- **681–900px:** curriculum navigation and lesson list share the upper row; the editor moves below them.
- **680px and below:** panels and form groups become a single vertical flow.
- **420px and below:** metrics, validation summaries, and action groups stack individually.

Horizontal page scrolling is not an accepted responsive strategy. A bounded technical value or code panel may scroll internally when wrapping would damage meaning.

## Accessibility requirements

- Keyboard focus is visible and follows the visual order.
- Navigation exposes `aria-current="page"` for the selected section.
- Off-canvas navigation has an accessible label, backdrop dismissal, and a clear close action.
- Form fields have persistent labels and errors use appropriate live or alert semantics.
- Icons are decorative when adjacent text already communicates their meaning.
- Motion respects `prefers-reduced-motion`.
- Color contrast and control sizes remain usable at browser zoom up to 200 percent.

## Approved terminology

- Use **Quizzes and flashcards**, not “active-recall content.”
- Use **Permanent lesson code**, not “stable lesson ID.”
- Use **Section label**, not “eyebrow.”
- Use **Lesson visual**, not “illustration ID.”
- Use **Publishing workflow**, not “authoring pipeline.”
- Use **Published version**, not “immutable release.”
- Use **Restore previous version**, not “rollback.”
- Use **Import current curriculum**, not “seed bundled curriculum.”
- Keep RFC, IEEE/IANA, IPv4, OSPF, VLAN, and other necessary networking terms.
- Never display table names, policy names, storage paths, raw service errors, raw audit JSON, tokens, keys, or administrator UUIDs.

## Acceptance checklist

- The primary action is identifiable within a few seconds.
- No page resets to Overview after an ordinary token refresh or browser-tab change.
- No content panel creates page-level horizontal overflow at supported widths.
- All fields, buttons, rows, panels, and status badges use the shared radius and border hierarchy.
- Technical data remains complete and selectable.
- Loading, empty, warning, error, success, disabled, selected, and published states are distinguishable without relying only on color.
- Desktop, tablet, narrow mobile, keyboard, and increased-text layouts are reviewed before release.
