# Adaptive Review, Saved Learning, and Local Research

## Learning model

NetBite reports three independent learning states:

- Activity completion records which lessons, labs, quizzes, and flashcard reviews were finished.
- Quiz mastery compares the learner's best current-version score with that chapter's published requirement.
- Adaptive review contains unresolved current-version quiz misses and flashcards marked `Review Again`.

These states must never be combined into an invented grade, XP value, or mastery percentage.

## Adaptive review

An incorrect quiz response immediately creates or updates a due signal keyed by question and content version. A correct response resolves the current signal without discarding its historical miss count. Flashcards use the same rule through `Review Again` and `Got It`.

The mixed review session preserves the original interaction: scenarios remain multiple choice and flashcards remain reveal-first active recall. Incorrect items move behind the other due items. The session has no score or penalty. Signals from obsolete content versions remain historical and are excluded from the active queue.

## Saved learning

Learners may save lessons, lesson illustrations, flashcards, and canonical CLI command families. Personal notes are plain text with a 1,000-character limit. A saved item with a note requires confirmation before removal. Deletions synchronize as timestamped tombstones so an older offline copy cannot recreate the item.

Resetting learning progress preserves saved learning. Deleting saved items is a separate confirmed operation.

## Contextual guidance and explanations

First-arrival guides are versioned, short, skippable, and replayable from Settings. The primary task remains first in focus order. Simulation explanations use four authored fields:

1. Observation
2. Networking rule
3. What the result proves
4. Next useful check

These explanations describe deterministic modeled state and never claim live packet timing or dynamically generated protocol conclusions.

## Research mode

Research mode is available only when both conditions are true:

```text
__DEV__
EXPO_PUBLIC_NETBITE_RESEARCH_MODE=1
```

The learner must explicitly consent. NetBite then preserves separate game and Sandbox snapshots, pauses cloud synchronization, and records only fixed-task timing, completion or abandonment, help use, and aggregate simulation-error counts. It never records notes, commands, addresses, email, taps, account identifiers, or screen contents.

Completing or canceling a session restores the exact snapshots. A crash leaves the snapshot in local persisted storage so the session can be resumed or restored.

## Diagnostics privacy boundary

The Settings support screen reports runtime version, platform, store hydration, schema status, general connectivity, cloud/authentication status, and Sandbox device/link counts. It excludes and defensively redacts URLs, keys, tokens, email addresses, IP configuration, note content, and command history. ADB, Metro, emulator, and host-port checks remain in `npm run demo:check` because application code cannot inspect them reliably.
