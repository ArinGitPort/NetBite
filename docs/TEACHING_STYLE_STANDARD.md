# NetBite Teaching Style Standard

## Purpose

This document defines how NetBite teaches networking concepts to beginners. It applies to lesson text, illustrations, examples, hints, explanations, and prerequisite reviews in both Network Foundations and Network Operations.

NetBite may use Jeremy's IT Lab as inspiration for teaching order and plain-language explanation. It must not copy scripts, diagrams, questions, or examples. Every technical claim must be checked against an applicable RFC, IEEE or IANA record, or official vendor documentation.

## Intended learner outcome

A learner should not merely recognize a networking term. After a lesson, the learner should be able to:

1. State the problem the mechanism solves.
2. Name the important term.
3. Explain what happens in the correct order.
4. Read the important address, field, table, or device state.
5. Predict the result of a nearby example.
6. Identify where the behavior stops or what it does not prove.

## Plain-English rules

- Begin with a concrete problem before introducing the formal term.
- Define each technical term the first time it appears.
- Keep sentences short and direct. Prefer one device action per sentence.
- Use familiar verbs: sends, receives, checks, learns, stores, forwards, drops, and replies.
- Use active voice. Write `The switch learns the source MAC address`, not `The source address is learned`.
- Preserve necessary terms such as `DHCPDISCOVER`, `prefix length`, `default gateway`, and `longest-prefix match`.
- Explain an acronym before relying on it.
- Avoid learner-facing phrases such as `deterministic state`, `state mutation`, or `protocol primitive` when a simpler description is accurate.
- Never make the learner infer missing task information from an empty field or a decorative diagram.
- Do not introduce several new concepts in one paragraph.

## Application interface language

Learner-facing controls and status messages describe the learner's task, saved work, or observed result. They do not describe NetBite's implementation.

- Use `Online backup`, not `cloud progress`.
- Use `Pro access`, not `entitlement`.
- Use `Backup of your previous work`, not `recovery copy`.
- Use `Next step`, not `next modeled action`.
- Use a result-specific label such as `Ping result`, `Route check`, or `DHCP exchange` instead of a generic `current evidence` label.
- Use `Educational network simulator` or `practice`, not `deterministic state model` or `bounded model`.
- Explain simulator limits in a complete sentence, such as `This practice does not send real network traffic.`
- Keep schema versions, hydration, snapshots, runtime keys, storage engines, internal IDs, and raw service errors out of normal screens.
- Place necessary support details behind an advanced disclosure and remove personal data, credentials, addresses, and command history.

Accurate networking vocabulary remains visible. Terms such as ARP, frame, route, VLAN, OSPF, prefix length, TCP state, and verification are teaching content rather than implementation jargon.

## Required lesson structure

Every lesson should follow this order.

### 1. The problem

State why the concept is needed in one or two sentences.

Example: `A new PC needs an IPv4 address, prefix, gateway, and DNS server. Entering these values manually on every PC takes time and causes mistakes.`

### 2. The key term

Name and define the technical term immediately.

Example: `Dynamic Host Configuration Protocol, or DHCP, supplies these settings automatically.`

### 3. What happens

Explain the mechanism as three to five ordered actions. Each action should identify:

- The acting device
- The information it already knows
- What it sends or inspects
- What decision or state change follows

### 4. One complete example

Provide all starting information before calculating or predicting anything. Keep one topology, address range, prefix, and terminology throughout the example.

### 5. What the result proves

State the supported conclusion and an important boundary.

Example: `A DHCPACK proves that the server approved this lease. It does not prove that every remote network is reachable.`

### 6. One recall check

Ask the learner to retrieve or apply the main idea. Do not introduce a new fact inside the question.

## Mechanism checklist

For protocols and device behavior, answer these questions in order:

1. What triggers the process?
2. What does each device already know?
3. What exact information is sent?
4. What does each device inspect?
5. What decision does it make?
6. What table, cache, address, or output changes?
7. Where does the behavior stop?

For example, an ARP lesson must distinguish the Ethernet broadcast destination from the ARP target-hardware field and the IPv4 broadcast address. A routing lesson must separate route matching, route selection, next-hop resolution, TTL reduction, and new link-layer framing.

## Prerequisite rule

Before teaching a concept, list the knowledge required to understand it. Then verify that an earlier NetBite lesson teaches each requirement.

If a prerequisite is missing:

- Add or revise a lesson before assessing the new concept.
- Link back to the exact prerequisite lesson.
- Do not hide a prerequisite inside a hint after the learner fails.

When a learner opens a prerequisite from a lab, the lesson route keeps the lab ID as return context. The lesson header reads `BACK / LAB`; Previous and Next preserve the same context; and the final lesson offers `RETURN TO LAB`. If the original navigation entry is unavailable, NetBite reopens the validated lab route so its autosaved session can resume.

Examples:

- DHCP pools require IPv4 addresses, prefix lengths, network and host ranges, and local versus remote delivery.
- ACL wildcard masks require IPv4 matching and traffic tuple knowledge.
- OSPF requires connected routes, route tables, next hops, administrative distance, and metrics.

## Worked-example standard

A worked example must include:

- A labeled starting state
- All supplied values
- Three to five numbered reasoning steps
- A visible result
- A nearby `YOUR TURN` task using different but comparable values

Never jump from `192.168.20.0/24` directly to an answer without explaining that `24` is the prefix length and `255.255.255.0` is the corresponding mask. Never use shorthand such as `.64` until the full IPv4 address is visible and the shorthand is explicitly explained.

## Visual standard

- The visual and the text must show the same addresses, ports, VLANs, interfaces, and device roles.
- Technical labels remain application-rendered text, not text baked into artwork.
- A diagram must explain a relationship, sequence, boundary, or state change.
- Decorative device artwork may support recognition but cannot replace the explanation.
- Every meaningful color state also needs a label, icon, pattern, or written description.
- Complex sequences use learner-controlled stages rather than presenting every state at once.

## Technical consistency review

Before a lesson or lab is released, create one scenario state sheet containing:

- Device names and roles
- Interface and port names
- IPv4 or IPv6 addresses and prefixes
- VLAN membership and trunk allowances
- Gateways and next hops
- Service ports and protocol fields
- Starting tables, caches, and configured exclusions
- Expected forward and return paths

Every lesson paragraph, illustration, question, hint, and simulator default must agree with this sheet.

The DHCP reference lab demonstrates why this matters: clients in `192.168.20.0/24` must receive a pool from `192.168.20.0/24`, even when the DHCP server itself is located in `192.168.10.0/24` and is reached through a relay.

## Author self-review

Before marking a lesson complete, confirm:

- The opening states a real problem.
- Every required term is defined.
- No intermediate decision is skipped.
- Every number is introduced before it is used.
- The example supplies enough information to solve it.
- The visual and text describe the same state.
- The conclusion does not claim more than the evidence proves.
- The recall check tests the lesson's main objective.
- A beginner can explain why the answer is correct, not only repeat it.
