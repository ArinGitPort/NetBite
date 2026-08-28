# NetBite

NetBite is an Android-first networking education platform with a separate web portal for administrators and instructors. The repository is an npm-workspace monorepo.

## Repository map

```text
apps/
  mobile/       Expo SDK 57 Android learner application
  portal/       React administrator and instructor portal
packages/
  networking/   Pure networking calculations
  workshops/    Workshop contracts and package-safe helpers
  brand/        Shared NetBite brand artwork
supabase/        Database migrations and Edge Functions
docs/            Architecture, product, standards, runbooks, and references
tooling/         Repository-wide automation and validation
schoolwork/      Coursework sources and generation scripts
deliverables/    Generated submission artifacts
```

Application UI is intentionally not shared: React Native components remain in `apps/mobile`, while React DOM components remain in `apps/portal`.

## Setup

Install all applications and internal packages once from the repository root:

```bash
npm install
```

The repository has one root lockfile and one root install command. npm may place incompatible transitive versions inside a workspace's generated `node_modules` directory; those folders are still managed by the single root dependency graph and must not receive a separate install.

Each application has its own `.env.example`. Create untracked `.env.local` files only in the application that needs the values. Never place a Supabase service-role key in either application.

## Common commands

```bash
npm run android
npm run android:clean
npm run mobile:test
npm run portal:dev
npm run portal:build
npm run test
npm run check
```

`android:clean` clears Metro's cache and starts the Android development flow. It does not rebuild Expo Go itself.

## Validation

```bash
npm run typecheck
npm run lint
npm run test
npm run portal:build
npm exec expo-doctor --workspace=@netbite/mobile
```

The boundary check prevents either application from importing the other, prevents shared packages from importing application code, and keeps browser or React Native dependencies out of Supabase Functions.

See the [documentation index](docs/README.md), [administrator CMS architecture](docs/architecture/ADMIN_CMS.md), and [demo runbook](docs/runbooks/DEMO_RUNBOOK.md).
