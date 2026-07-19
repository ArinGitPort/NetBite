# NetBite CLI Simulation Guide

## Purpose

NetBite CLI is a mobile-first educational state simulator used only where command interaction strengthens the lesson: interpreting diagnostic evidence, configuring static routes, and configuring VLAN access/trunk state.

It is not Cisco IOS, a terminal emulator, or a live packet simulator. Commands use a small Cisco-like subset for skill transfer. Prompts and outputs are original NetBite conventions, and all results are derived deterministically from serializable configuration and topology state.

## Interaction standard

- Native React Native `TextInput`, `ScrollView`, and views; no WebView or xterm dependency.
- Free typing and wrapping suggestion chips are both supported.
- Input is case-insensitive and repeated whitespace is collapsed.
- Only documented aliases are accepted: `en`, `conf t`, `int`, and `sh` forms. Arbitrary prefix abbreviation is intentionally unsupported.
- Valid configuration changes persist in the active lab even when they are not the objective. Learners correct them with an exact `no` command, Undo, or Reset.
- Invalid syntax and wrong-mode commands never mutate configuration.
- Undo retains 20 configuration snapshots; history retains 50 commands; each device transcript retains 200 entries.
- The first CLI lab shows a persistent three-part guide. Help reopens it at any time.
- Suggestions reduce mobile typing but never submit automatically. Hints have no score penalty.
- Controls remain at least 44 points high, text wraps, operating-system font scaling remains enabled, and status never depends on color alone.

## Modes and prompts

| Mode | Prompt ending | Entry |
| --- | --- | --- |
| User EXEC | `>` | Initial router/switch mode |
| Privileged EXEC | `#` | `enable` |
| Global configuration | `(config)#` | `configure terminal` |
| Interface configuration | `(config-if)#` | `interface <name>` |
| VLAN configuration | `(config-vlan)#` | `vlan <id>` |

`exit` moves outward one mode. `end` returns to privileged EXEC. NetBite hosts expose a limited EXEC prompt for evidence commands such as `ping`.

## Supported command subset

Common:

- `help`, `?`
- `enable`, `disable`
- `configure terminal`
- `exit`, `end`
- `show running-config`

Diagnostics and routing:

- `show ip interface brief`
- `show ip route`
- `ping <IPv4 address>`
- `ip route <network> <contiguous mask> <next hop>`
- `no ip route <network> <contiguous mask> <next hop>`

VLANs:

- `vlan <1–4094>`
- `interface <known interface>`
- `switchport mode access`
- `switchport access vlan <id>`
- `no switchport access vlan`
- `switchport mode trunk`
- `switchport trunk allowed vlan <comma-separated ids>`
- `no switchport trunk allowed vlan`
- `show vlan brief`
- `show interfaces trunk`

## Lab contracts

### Chapter 8 — `ping-diagnostic-desk`

Four isolated scenarios require an evidence command before a conclusion. A failed command result reports only the deterministic failure found by the model. A successful ping says only that the modeled Echo request/reply round trip succeeded.

### Chapter 9 — `static-route-board`

R1, R2, and R3 begin with connected routes. Completion requires exactly four specified static routes and successful verification from PC-A to PC-C and back. The path engine distinguishes no route, unreachable next hop, loop, and missing return path.

### Chapter 10 — `vlan-port-desk`

SW-A and SW-B derive port/trunk status directly from configuration. Completion requires VLAN 10 and 20, the required access membership, both trunk endpoints allowing both VLANs, and two evidence-based reachability predictions. Trunks preserve VLAN separation; Layer 3 forwarding is outside this lab.

## Architecture

- `src/core/network/cli-simulator.ts` owns parsing, typed state transitions, route/path derivation, ping evidence, and VLAN reachability.
- `src/features/cli/cli-lab-definitions.ts` owns fixed lab states and state-based objectives.
- `src/features/cli/components/cli-lab.tsx` owns mobile interaction, transcript/history/snapshots, assistance, and completion.
- `src/features/practice/lab-registry.tsx` registers the three stable lab IDs.

Unfinished CLI state is intentionally session-only. Existing lab completion persists, along with the `cli-guide-v1` acknowledgement represented by the store’s `cliGuideSeen` flag.

Technical references and modeled boundaries are recorded in `references/CLI_SIMULATION_SOURCES.md`.
