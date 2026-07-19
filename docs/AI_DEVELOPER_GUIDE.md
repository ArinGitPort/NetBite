# NetBite: AI Developer Guide

## Overview

NetBite is a mobile-first networking education game inspired by CCNA fundamentals.

Its goal is to teach networking through interactive lessons, visual labs, quizzes, flashcards, and simplified simulations.

NetBite is **not** a replacement for Cisco Packet Tracer. It prioritizes conceptual understanding and visual learning over protocol-level accuracy.

The standalone Network Sandbox follows the same rule. It provides bounded, port-aware free play through deterministic state and structured explanations; it does not broaden the project into a live protocol emulator.

---

# Core Philosophy

**Do not build a full TCP/IP simulator.**

NetBite uses a **State-Based Graph Validator**.

- Devices are graph nodes.
- Connections are graph edges.
- CLI commands modify device state.
- The validation engine evaluates the network state.
- The UI visualizes the results.

Prefer simple implementations that accurately teach networking concepts.

---

# Architecture

The application consists of three independent layers.

```
User Interface

↓

Simulation Engine

↓

Network State
```

## UI

Responsible for:

- Rendering
- Gestures
- Animations
- User interaction
- Displaying explanations

Never place networking logic inside UI components.

---

## Simulation Engine

Responsible for:

- Validation
- Pathfinding
- Routing rules
- Networking logic

The engine must be framework-independent.

Use pure functions that accept serializable data and return serializable results.

---

## Network State

The Zustand store is the application's source of truth.

All mutations must occur through store actions.

---

# Technology Stack

- React Native (Expo)
- TypeScript (Strict Mode)
- Zustand
- react-native-svg
- react-native-gesture-handler
- react-native-reanimated
- expo-sqlite
- Supabase

---

# Project Structure

```
src/

├── app/
├── core/
├── content/
├── features/
├── services/
├── shared/
└── store/
```

Use Feature-Driven Architecture.

Avoid generic component folders.

Keep lessons, quizzes, flashcards, and labs data-driven.

---

# State Management

Example device model.

```ts
interface InterfaceConfig {
  enabled: boolean;
  ip?: string;
  subnet?: string;
  connectedTo?: string;
}

interface DeviceNode {
  id: string;
  type: "pc" | "switch" | "router" | "server";

  config: {
    ip?: string;
    subnet?: string;
    gateway?: string;
    interfaces: Record<string, InterfaceConfig>;
  };

  ui: {
    x: number;
    y: number;
  };
}
```

Provide helper factories.

```ts
createPC()

createSwitch()

createRouter()

createServer()
```

---

# Core Systems

## Topology Canvas

Responsible for:

- Device placement
- Dragging
- Cable connections
- Packet animations

Requirements

- react-native-svg
- react-native-gesture-handler
- Store positions only after dragging ends
- Memoize expensive components

---

## CLI Emulator

Use a mobile-friendly command palette instead of unrestricted text input.

```
>

enable

show

ping
```

The CLI should follow:

```
Command

↓

Parser

↓

Action

↓

Store Update
```

Never modify the Zustand store directly from UI components.

---

## Validation Engine

Validation should verify networking concepts rather than simulate protocols.

Return structured results.

```ts
interface ValidationResult {
  success: boolean;

  reason: string;

  explanation?: string;

  learningTip?: string;

  path?: string[];
}
```

Example validations

- Graph connectivity
- Interface status
- IP addressing
- Same subnet
- Default gateway
- Static routing

Return useful explanations instead of simple booleans.

---

## Animation Layer

The validation engine should never perform animations.

Instead it returns events.

```ts
[
  {
    type: "packet",
    from: "PC1",
    to: "SW1"
  }
]
```

The UI consumes these events.

---

## Lab System

Labs should be data-driven.

```ts
interface Lab {
  id: string;
  title: string;
  description: string;

  startingTopology: NetworkState;

  objectives: Goal[];

  hints: string[];
}
```

Avoid hardcoded lab logic.

---

# Coding Standards

- TypeScript Strict Mode
- No `any`
- Prefer pure functions
- Explicit typing
- Add JSDoc for networking logic
- Use React.memo, useMemo, and useCallback where appropriate
- Keep networking logic independent from UI
- Avoid unnecessary abstraction
- Design for modularity and future expansion

---

# Offline First

Always save locally before syncing.

```
SQLite

↓

Background Sync

↓

Supabase
```

Cloud synchronization must never block the user interface.

---

# Educational Philosophy

Every interaction should reinforce learning.

Whenever possible:

- Show instead of tell.
- Visualize instead of describing.
- Let the learner discover concepts through interaction.

Failures should explain:

- Why it failed
- How to fix it
- What networking concept is involved

---

# Development Workflow

Implement the project incrementally.

Wait for an explicit phase before generating code.

## Phase 1

- Zustand
- Device factories
- Topology canvas
- Device dragging
- Cable rendering

## Phase 2

- CLI
- Command parser
- Device configuration

## Phase 3

- Graph algorithms
- Connectivity
- IP validation
- Routing validation

## Phase 4

- SQLite
- Progress saving
- Background synchronization
- Supabase

---

# AI Directives

When generating code:

- Prefer simplicity over realism.
- Prioritize conceptual understanding.
- Keep UI and networking logic independent.
- Keep all educational content data-driven.
- Avoid implementing future chapters unless requested.
- Build only what is required for the current phase.

The objective of NetBite is to become the easiest and most engaging way for beginners to understand networking fundamentals through interactive learning.
