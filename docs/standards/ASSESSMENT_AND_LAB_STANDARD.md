# NetBite Assessment and Guided-Lab Standard

## Purpose

This document defines how NetBite checks understanding. It covers lesson checkpoints, quizzes, active-recall flashcards, guided mini-simulators, hints, feedback, and automated quality tests.

Assessment must measure an idea that NetBite has already taught. A learner should never fail because the prompt omitted an address, prefix, port, topology fact, command format, or prerequisite rule.

## Assessment model

NetBite uses four complementary assessment types:

| Type | Purpose | Penalty | Completion rule |
| --- | --- | --- | --- |
| Pause and Apply checkpoint | Retrieve and apply one lab-critical rule | None | Think, reveal choices, then retry until correct |
| Chapter quiz | Test scenario-based understanding across the chapter | No progression lock | At least 80 percent for mastery |
| Active-recall card | Retrieve an explanation without visible choices | None | Learner selects `GOT IT` after retrieval |
| Guided mini-simulator | Configure, inspect, test, and repair modeled network state | None | Current state and evidence satisfy the objective |

Completion, quiz mastery, and unresolved review items remain separate. NetBite does not combine them into an invented overall score.

## Pause and Apply checkpoint structure

Checkpoints are selective, not an end-of-page ritual. Network Foundations retains its 27 hand-authored misconception checks. Network Operations uses checks only on the 35 lessons linked as prerequisites by a module lab. Other lessons continue normally and are still assessed through quizzes, active recall, guided labs, and adaptive review.

A checkpoint must contain:

1. One prompt tied to the current lesson.
2. Stable choice IDs.
3. One correct choice.
4. Misconception-specific feedback for every incorrect choice.
5. Optional progressive hints.
6. A stable lesson-based review identity and independent checkpoint content version.

Choices are initially hidden. The learner first sees the scenario and `THINK OF THE ANSWER FIRST`, then selects `I HAVE AN ANSWER` to reveal the alternatives. This brief commitment encourages retrieval instead of recognition.

The first incorrect attempt during one lesson visit creates one adaptive-review signal. Immediate correction unlocks the lesson but leaves that signal due for a later review session. A correct first attempt may resolve an older due signal. Incorrect feedback provides `REVIEW THE RULE`, which expands the exact relevant lesson explanation, plus progressive hints where available. Previously completed lessons remain navigable without showing or forcing the checkpoint again.

## Quiz structure

- Map every question to a stable lesson ID, never a numeric lesson position.
- Use short scenarios and decisions instead of definition trivia.
- Cover every major chapter objective across the full quiz.
- Use plausible alternatives based on real beginner misconceptions.
- Explain why the correct answer works and why the relevant alternative does not.
- Define exact values before testing them. Important values may be recalled; decorative values should not be memorized.
- Preserve the chapter's documented question count and an 80 percent mastery threshold.
- Record an incorrect response as an adaptive-review signal for the current content version.
- Keep older results as historical when a materially revised quiz receives a new content version.

### Good distractors

Good alternatives reveal a specific misunderstanding:

- Learning a switch entry from the destination MAC instead of the source MAC
- Resolving a remote host's MAC instead of the local gateway's MAC
- Choosing a route by administrative distance before checking prefix length
- Treating an 802.1Q trunk as if it merges VLAN broadcast domains

Avoid joke answers, wording tricks, and choices that differ only through an unexplained number.

## Active-recall structure

The front of a flashcard must ask an answerable question without revealing the answer. Useful prompts ask the learner to:

- Explain a process in order
- Compare two related ideas
- Predict a device decision
- Interpret a short scenario
- Recall one behavior-changing field or value

The back contains:

- A concise expected answer
- A short explanation or boundary
- A stable lesson ID

After reveal, `REVIEW AGAIN` returns the card later in the same session. `GOT IT` resolves the active review item while retaining historical difficulty. Simply revealing or advancing does not count as retrieval.

## Guided mini-simulator structure

Every lab begins with a replayable `LEARN THE SETUP` section containing:

1. The goal in plain English
2. A labeled fixed topology
3. Device roles and relevant ports
4. What is already configured
5. Required prior knowledge
6. One worked example using different values when calculation is assessed
7. An ordered task checklist
8. Links to exact prerequisite lessons

Prerequisite links must include the current lab as validated route context. Leaving the lesson through Close, Back, Previous, Next, or final completion returns to that lab rather than sending the learner to an unrelated chapter. Invalid or inaccessible origins fall back to normal chapter navigation.

The learner then follows this cycle:

`READ PROVIDED FACTS -> CONFIGURE -> SAVE -> TEST -> INSPECT EVIDENCE -> CORRECT OR CONTINUE`

### Configuration field requirements

Every technical input must show:

- A precise label
- What information the learner was given
- What the value represents
- The accepted format
- An example when the task value is not already shown
- A specific validation message

Placeholders alone do not count as instructions because they disappear while typing and may look like saved values.

Examples:

- `Prefix length` explains that `/24` means prefix `24` and accepts both `24` and `/24`.
- `Pool network` identifies whether it describes the client subnet or the server subnet.
- `Excluded address` explains that the address belongs to the pool but must not be leased.

### Input and state behavior

- Malformed input is rejected before mutation.
- Valid but logically incorrect configuration remains saved and editable.
- The simulator must derive its result from current state, not match one expected transcript.
- Incorrect configuration does not advance the objective.
- Undo restores the previous valid snapshot.
- Reset requires confirmation and does not erase earned course completion.
- Unfinished sessions autosave locally.
- Relevant configuration changes clear stale trace conclusions.

### Evidence and feedback

Every test result must show:

1. **Observation:** What the simulator saw.
2. **Rule:** Which networking rule applies.
3. **Supported conclusion:** What the evidence proves.
4. **Next check:** The most useful next action.

Do not invent latency, packet loss, protocol timing, hardware behavior, or universal causes. A failed test should identify only what the modeled state proves.

### Hint progression

Hints remain visible in accumulated history and reveal reasoning one step at a time:

1. Identify the rule or relevant field.
2. Narrow the possible value or device.
3. Show the next calculation step or inspection command.

A hint should not automatically select, enter, or submit the final answer.

## DHCP lab reference

For clients in `192.168.20.0/24`, a small assessed pool may be specified as:

- Pool network: `192.168.20.0`
- Prefix length: `24`
- First pool address: `192.168.20.100`
- Last pool address: `192.168.20.102`
- Excluded address: `192.168.20.100`

The learner can then derive `192.168.20.101` as the first available offer. DHCP1 may reside at `192.168.10.5`; the relay at `192.168.20.1` supplies the client-network context. The server's own subnet must not be mistaken for the client address pool.

## Automated quality-test structure

Each new or materially revised learning activity requires tests in these layers.

### 1. Content integrity

- Unique and stable lesson, question, card, stage, and activity IDs
- Valid prerequisite links
- Complete illustration and source mappings
- No repeated placeholder boilerplate
- No undefined key terms or unexplained assessed values

### 2. Pure engine behavior

- Happy path
- At least four meaningful failure conditions for a simulator
- Boundary and malformed inputs
- Non-mutation after rejected input
- Persistence of valid incorrect configuration
- Forward and return behavior where applicable

### 3. Assessment behavior

- Correct lesson mapping
- Correct mastery threshold
- Misconception-specific feedback
- Retry and adaptive-review behavior
- Content-version history

### 4. Interface behavior

- Required task facts appear before inputs
- Labels, helper text, and accessibility hints are present
- One dominant action per task state
- Buttons grow for wrapped labels and retain at least 44-point targets
- No clipping or horizontal overflow
- Meaning never depends on color alone

### 5. Session behavior

- Autosave and resume
- Undo and confirmed Reset
- Corrupted-session recovery
- Completion persistence
- Isolation from unrelated learning and Sandbox state

### 6. Responsive and accessibility behavior

Render representative states at 360, 390, 430, 500, 768, and 1024 points, including increased font scaling, mobile landscape, reduced motion, screen-reader order, and web keyboard navigation.

### 7. Project validation

Before release, run:

```text
Jest
TypeScript
Expo lint
Expo Doctor
Asset validation
git diff --check
Android and web production exports
```

## Release checklist

A lesson or lab is ready only when:

- A beginner receives all information needed to begin.
- The assessed method was demonstrated first.
- The scenario is technically consistent across text, visuals, defaults, and engine state.
- Correct and incorrect states are both meaningful and repairable.
- Feedback explains reasoning rather than merely saying `wrong`.
- The result is generated from modeled state.
- The activity remains usable offline.
- Automated tests and a manual mobile walkthrough pass.
