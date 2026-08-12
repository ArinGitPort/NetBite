# Week 4 — Sandbox Device CRUD

## Project and data entity

NetBite uses **Sandbox Device** as its Week 4 CRUD entity. A device is a PC, switch, or router placed in the Network Sandbox. Each record has a stable ID, editable display name, type, interfaces, addressing, gateway, VLAN configuration, routes, and connection count.

The stable ID is never changed during an update. This protects cable endpoints, routing state, simulator references, Undo/Redo history, and existing saved workspaces.

## CRUD operations

| Operation | NetBite feature | Result |
| --- | --- | --- |
| Create | Choose `ADD`, then select PC, switch, or router. | A device record and its default interfaces are created. NetBite reports `DEVICE CREATED / SAVED LOCALLY`. |
| Read | Select a device, then open `CONFIGURE`. | `DEVICE RECORD` displays the ID, name, type, interface count, attached connection count, addressing, gateway, VLANs, and routes. |
| Update | Edit the device name or use its addressing, interface, VLAN, and route controls. | The existing record is updated without replacing its stable ID. NetBite reports the specific saved change. |
| Delete | Choose `REMOVE DEVICE`, review the confirmation, then choose `DELETE DEVICE`. | The device and its attached cables are deleted. The confirmation identifies the device and cable count. |

## Validation and error prevention

Device names are trimmed and must contain 1–24 letters, numbers, spaces, hyphens, or underscores. Names are compared without case, so `PC-A` and `pc-a` cannot coexist. Invalid or duplicate names do not mutate the workspace.

Existing network validation remains active for IPv4 addresses, prefixes, gateways, VLAN IDs, routes, subinterfaces, and interface state. Malformed input is rejected. A syntactically valid but logically incorrect network configuration remains editable so the learner can inspect and repair it.

Delete uses a destructive confirmation instead of acting immediately. It states how many attached cables will also be removed. The deletion can be undone during the active session.

## Persistent local storage

The Sandbox Zustand store is persisted through Expo SQLite key-value storage under `netbite-sandbox-state-v1`. Topology and configuration survive app restart without Supabase or internet access. Undo and Redo snapshots remain session-local, while the current workspace is autosaved.

Primary implementation files:

- `src/core/network/sandbox.ts`
- `src/features/sandbox/components/sandbox-screen.tsx`
- `src/features/sandbox/components/sandbox-inspector.tsx`
- `src/store/use-sandbox-store.ts`

## Demonstration sequence

1. Open `NETWORK SANDBOX` and choose `ADD` → `PC`.
2. Observe the `DEVICE CREATED / SAVED LOCALLY` message.
3. Select the PC and open `CONFIGURE` to show the complete `DEVICE RECORD`.
4. Change the name to `OFFICE-PC`, select `SAVE NAME`, and show the update feedback.
5. Select `REMOVE DEVICE` and show the named destructive confirmation and attached-cable count.
6. Delete the record, reopen the application, and show that remaining workspace data persists.

## Verification

Automated tests cover creation, readable records, rename validation, duplicate rejection, deletion, attached-link cleanup, Undo/Redo, and persisted hydration. The feature works offline and does not depend on an account or Pro entitlement.
