# NetBite portal

The portal is a separate React application for NetBite administrators and instructors. It uses Vite, React Router hash routes, Tailwind CSS, and locally owned Radix-based UI components.

## Commands

```text
npm run dev
npm run typecheck
npm run test
npm run lint
npm run build
```

Run these commands from `apps/portal`, or use the `portal:*` convenience commands from the repository root. The development server prints the local address after startup.

## Source organization

```text
src/
  app/
    router/          Hash routes and compatibility redirects
    providers/       Authentication and authorization state
    route-guards/    Signed-in and role-specific route protection
    navigation.ts    Administrator and instructor navigation definitions
  components/
    layout/          Portal shell and page-level layout
    ui/              Reusable Tailwind and Radix components
  features/          One folder per portal workflow
  lib/               Supabase and content-service access
  styles/            Global theme and browser defaults only
```

Pages do not call Supabase directly when an operation belongs in the shared content service. Reusable interaction and visual behavior belongs in `components/ui`; feature-specific state and composition stays inside its feature folder.

The complete ownership, `@/` import, dependency-boundary, and 500-line target rules are documented in `docs/standards/PORTAL_CODE_ARCHITECTURE_STANDARD.md`.

## Routing and roles

Administrator routes begin with `#/admin/`. Instructor routes begin with `#/instructor/`. Route guards verify the authenticated account's server-provided access level, so changing the URL cannot expose the other workspace.

Old single-hash links such as `#audit` and `#workshops` are translated to their current routes for compatibility.

## Styling rules

- Tailwind utilities own component and page presentation.
- Radix primitives own dialog, alert-dialog, tabs, and selection behavior.
- Feature-level CSS files are not allowed.
- `src/styles.css`, `src/styles/theme.css`, and `src/styles/base.css` are the only global stylesheets.
- Runtime topology coordinates may use inline CSS variables; ordinary visual styling may not.
- Use the shared `Button`, form, panel, feedback, status, and dialog components instead of recreating variants.

`npm run style:check` rejects removed stylesheets, feature CSS imports, and obsolete semantic component classes.
It also rejects relative source imports, prohibited dependency directions, and files that exceed the architecture size limits.
