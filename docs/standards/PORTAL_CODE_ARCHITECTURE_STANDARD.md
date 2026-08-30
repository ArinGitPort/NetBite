# NetBite Portal Code Architecture Standard

## Purpose

This standard keeps the administrator and instructor portal maintainable as its curriculum, workshop, topology, assessment, and class-management features grow. It applies to maintained TypeScript and TSX under `apps/portal/src`, including tests.

The portal uses feature-based, component-oriented React architecture. A large page is not considered component-based merely because it imports a few controls. State, data access, interaction logic, and presentation must be separated by responsibility.

## Approved structure

```text
src/
  app/                  Routing, providers, guards, and navigation
  components/
    ui/                 Reusable Radix and Tailwind controls
    layout/             Shared page and workspace layouts
  features/
    feature-name/
      pages/            Route-level composition
      components/       Feature-specific presentation
      hooks/            Feature state and orchestration
      services/         Feature data access
      types.ts          Feature-only contracts
      index.ts          Small public feature surface
  lib/                  Truly portal-wide infrastructure
```

Folders should be introduced when a feature needs them; empty structural folders are not required.

## Ownership rules

- Pages compose a workflow. They do not contain reusable editors, topology engines, or direct Supabase queries.
- Components receive data and actions through typed props. Shared UI components contain no curriculum, workshop, topology, or Supabase knowledge.
- Hooks own feature selection, loading, draft, dialog, and orchestration state.
- Services own Supabase queries and Edge Function calls. They map service failures into safe portal errors.
- Feature-specific types stay with their feature. A type moves to `lib` or a workspace package only when more than one feature or application genuinely owns it.
- Cross-feature imports use the target feature's public `index.ts`. Deep imports into another feature's internal folders are prohibited.
- Files use task-focused names such as `connection-editor.tsx` or `use-workshop-data.ts`; generic dumping grounds such as `helpers.ts`, `utils.ts`, or oversized `page.tsx` files are avoided.

## Import rules

- Every portal source import uses the `@/` alias, including same-folder imports, dynamic imports, re-exports, and test mocks.
- `@/` resolves to `apps/portal/src` in TypeScript, Vite, and Vitest.
- External dependencies and npm-workspace packages use their package names.
- Portal code never imports from `apps/mobile`. Shared packages never import portal code.
- Direct Supabase imports are limited to approved authentication and service infrastructure.

Examples:

```ts
import { Button } from "@/components/ui/button";
import { useWorkshopData } from "@/features/workshops/hooks/use-workshop-data";
import type { WorkshopRow } from "@/features/workshops/types";
```

## File-size rules

- Target: 500 physical lines or fewer per maintained `.ts` or `.tsx` file.
- Files from 501 through 600 lines require a top-level comment in this exact form:

  ```ts
  // @architecture-size-exception: concise reason the cohesive file should not be split
  ```

- Files above 600 lines are prohibited without exception.
- The exception is not a permanent waiver. It records a reviewed tradeoff and should be removed when the file can be divided safely.
- Generated files are excluded only when their generated ownership is explicit and they are not manually maintained.

Line count is a guardrail, not a design goal. Files should be split earlier when they contain unrelated responsibilities.

## React and data-flow rules

- Route components load a feature page through the router and role guard.
- Page components receive session and access context from providers.
- Hooks coordinate service calls and expose explicit state and actions.
- Editors keep unsaved form state local unless multiple sibling components must share it.
- Services return typed domain records and safe errors; presentation components never display raw Supabase failures.
- Mutations expose busy, success, error, and retry states and prevent accidental duplicate submissions.
- Feature tests exercise behavior through public components or hooks rather than private implementation details.

## Styling and component rules

- Tailwind owns portal presentation. Feature-level CSS is prohibited.
- Radix primitives provide accessible interaction behavior; locally owned UI components provide NetBite styling.
- Repeated controls use shared components rather than copied class strings.
- Runtime topology coordinates may use inline style values. Ordinary layout and visual styling may not.
- The portal UX standard remains authoritative for spacing, typography, responsive behavior, and interaction design.

## Required validation

Before portal work is complete:

1. Run `npm run lint --workspace=@netbite/portal`.
2. Run `npm run test --workspace=@netbite/portal`.
3. Run `npm run build --workspace=@netbite/portal`.
4. Confirm the architecture check reports no relative imports, forbidden dependencies, feature-level CSS, or file-size violations.
5. When shared contracts change, also run shared-package and mobile TypeScript/tests.

