# NetBite Content Guide

`CURRICULUM.md` is the canonical source for chapter order, lesson scope, practice alignment, quizzes, and flashcards.

This file records the content rules that apply across the curriculum:

- Introduce concrete device behavior before abstract models.
- Define a term before it appears in a quiz or flashcard review.
- Keep lessons short, but include enough context to explain why the concept matters.
- Use one opening explanation, one or two titled detail sections, a concrete example, and one concise key idea. Aim for roughly 100â€“160 words of lesson explanation.
- Split a missing prerequisite into its own lesson instead of hiding it inside a dense paragraph.
- Add a retryable checkpoint only for a decision or misconception worth practicing. It must explain every choice and record no penalty.
- Use one concrete example or useful distinction instead of decorative text.
- Give every worked example an explicit starting state and conclusion. When reasoning has several dependencies, show three to five numbered steps with stable labels.
- Use an example-before-practice sequence for novice calculations: demonstrate one complete method, then label a nearby problem as `YOUR TURN`.
- Keep one address, prefix, topology, or protocol state consistent across an explanation. If a practice item changes it, announce the new scenario.
- Do not use final-octet shorthand such as `.64` until the complete IPv4 address is visible and the abbreviation has been explained.
- Optional hints reveal the next intermediate value or comparison, never the final selected answer. Hints carry no score or penalty.
- Every incorrect choice explains its misconception and leaves learned or configured state unchanged.
- In configuration labs, distinguish invalid input from valid but incorrect state. Invalid or wrong-mode commands do not mutate state; accepted configuration remains until the learner corrects it with the supported inverse command, Undo, or Reset.
- Simulated diagnostic output must state only what deterministic state proves. Never invent latency, packet loss, timing, vendor behavior, or one universal cause for a failed ping.
- Add practice only when it directly reinforces an identified lesson skill.
- Label simplified visualizations so learners do not mistake them for protocol-accurate simulations or physical pinouts.
- Use plausible quiz alternatives that test understanding rather than obvious joke answers.
- Treat a quiz below 80 percent as attempted, not mastered. Never lock later content because of the score.
- Record technical sources in `docs/references/` before a chapter is considered complete.

Future chapter planning and the current sequence live only in `CURRICULUM.md` to prevent competing chapter orders.
