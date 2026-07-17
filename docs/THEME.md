# NetBite Mini-Hardware Console Design System

## Direction

NetBite is a compact network training console. It should feel engineered, quiet, and functional rather than like a conventional course or SaaS application. The visual reference is warm industrial hardware: plum-black work areas, machine-gray framing, muted sage metal, and restrained red controls.

The interface borrows schematic framing and mechanical typography from hardware programming games while preserving mobile accessibility and beginner-friendly explanations.

## Typography

Fira Code is the application typeface across Android, iOS, and web. Font files are bundled with the application; learning content must never depend on a remote font request.

### Scale

| Role | Size | Line height |
| --- | --- | --- |
| Screen title | 16 px | 24 px |
| Section heading | 13 px | 20 px |
| Body | 12–13 px | 20–21 px |
| Label, button, status | 11 px | 16 px |

- No text may exceed 16 px. Icon glyphs also remain at or below 16 px.
- UI labels, button text, technical headings, and system statuses are uppercase with `letterSpacing: 1.5`.
- Educational paragraphs and answer explanations remain sentence case for readability.
- Weight comes from bundled Fira Code variants, not oversized text.

## Layout Grid

- Structural dimensions and spacing follow an 8 px base grid.
- Major groups use 16, 24, or 32 px gaps.
- Small internal gaps use 8 px.
- Interactive targets remain at least 44 px tall even when their visible treatment is compact.
- Content stays within a 720 px maximum width on large displays.

## Framing

- Every corner uses `borderRadius: 0`.
- Panels use solid 1 px borders in `#3A3F3D`.
- Active or semantic states may replace the neutral border color, but should not add thickness unless accessibility requires it.
- No shadows, blurs, gradients, glow, glass, or animated CRT effects.
- A faint 24 px grid may appear behind content as atmosphere. Content panels remain opaque.

## Color Roles

| Role | Value | Usage |
| --- | --- | --- |
| Background | `#151216` | Plum-black screen background |
| Grid | `#272027` | Faint warm schematic grid |
| Surface | `#1D191F` | Standard panels |
| Raised surface | `#272329` | Focused work areas |
| Border | `#3A3F3D` | Machine-gray panel divisions |
| Primary text | `#C9C5C7` | Essential content |
| Secondary text | `#898387` | Supporting content |
| Control red | `#C04848` | Commands, links, progress |
| Active red | `#C04848` | Current circuit node only |
| Warm orange | `#D18B5A` | Cable connection mode |
| Muted sage | `#71958B` | Confirmed success and secondary hardware state |
| Error red | `#D94A50` | Incorrect or destructive state |

Saturated color communicates state. It is not general decoration.

## Components

### Command buttons

- Dark background matching the console
- 1 px control-red border for the primary action
- Minimum 44 px touch target
- 11 px centered uppercase label with 1.5 tracking
- No fill animation, shadow, or scale animation

### Learning path circuit

- A vertical 1 px data rail connects chapter rows.
- Each chapter uses a 12 × 12 px terminal node.
- The current node is solid `#C04848`.
- Locked nodes use a neutral 1 px outline and no fill.
- Chapter metadata appears as compact uppercase system labels.

### Panels and feedback

- Standard panels use one neutral border and no shadow.
- Control red indicates navigation, progress, or selection.
- Orange indicates connection mode or attention.
- Muted sage indicates confirmed success.
- Red indicates an incorrect answer or error.
- Every colored state must also include readable text so color is never the only signal.

## Content Restraint

- One clear primary command per screen.
- No fake terminal logs, decorative metrics, or status noise.
- Do not invent labels, counters, uptime values, or technical copy merely to make a screen look more like a console.
- Keep only navigation, real progress, learning instructions, and feedback that helps the player act.
- Paragraphs remain short and sentence case.
- Dense framing should organize the lesson, never compete with it.

The final interface should resemble a small piece of training hardware: compact at first glance, predictable after one interaction, and comfortable throughout a lesson.
