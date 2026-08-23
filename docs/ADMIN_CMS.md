# NetBite Instructor Admin CMS

The instructor portal is a separate React website. It uses the same Supabase project as the Android app, but it is not included in the learner APK.

## Security boundary

- Editors may work with drafts, sources, assessments, and draft images.
- Publishers inherit editor access and may create immutable releases or roll back to a previous release.
- Learners can read only the active published release.
- No screen can grant administrator access. The first role is assigned by the Supabase project owner.
- Simulator engines, CLI grammars, navigation, and code-rendered illustration types remain application code.

Never place a Supabase secret or service-role key in the Android app, the admin portal, Git, screenshots, or chat.

## 1. Apply the database migration

Link the local Supabase directory to the intended project, then review and apply the migrations:

```powershell
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The CMS migration creates the authoring tables, role policies, immutable release records, audit log, and private/public content buckets.

## 2. Assign the first administrator

Find the existing account in Supabase Authentication, copy its user UUID, and run this in the Supabase SQL editor:

```sql
insert into public.content_admin_roles (user_id, role)
values
  ('REPLACE_WITH_AUTH_USER_UUID', 'editor'),
  ('REPLACE_WITH_AUTH_USER_UUID', 'publisher')
on conflict do nothing;
```

One account may hold both roles. Do not build a public administrator-registration screen.

## 3. Deploy the authenticated functions

```powershell
supabase functions deploy validate-content-release
supabase functions deploy publish-content-release
supabase functions deploy rollback-content-release
```

The existing Supabase function secrets provide `SUPABASE_URL`, the publishable/anonymous key, and `SUPABASE_SERVICE_ROLE_KEY`. Confirm them in the Supabase dashboard without copying their values into application environment files.

## 4. Seed the bundled curriculum

Run the seeder once after applying the CMS migration. Supply the service-role key only to the current terminal session:

```powershell
$env:SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = 'YOUR_TEMPORARY_SERVICE_ROLE_VALUE'
npm run content:seed
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
```

The seeder preserves all stable course, chapter, lesson, quiz, flashcard, and lab mappings. Existing lessons are marked `core`; lessons created through the portal default to `supplemental`.

You can validate the local seed input without a secret or database write:

```powershell
npm run content:seed:check
```

## 5. Run the portal locally

The Vite configuration can reuse the root `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` values. It also accepts the equivalent `VITE_` names documented in `admin/.env.example`.

```powershell
npm run admin:dev
```

Open `http://localhost:4174`, sign in with the assigned account, and validate the seeded curriculum before publishing the first release.

## 6. Production build

```powershell
npm run admin:typecheck
npm run admin:test
npm run admin:build
```

The deployable static site is generated in `admin/dist`. Configure the chosen static host with the Supabase URL and publishable key as build-time environment values.

## Publishing workflow

1. An editor changes a draft.
2. The portal validates identifiers, mappings, required fields, assessment answers, and image accessibility metadata.
3. A publisher adds a changelog and minimum Android version.
4. Publishing creates a new immutable release and activates it.
5. Connected Android devices detect, validate, checksum, and store the release in SQLite.
6. Offline devices keep their current local or bundled curriculum until connectivity returns.
7. Rollback republishes an earlier package as a new audited release; history is never rewritten.

## Update limitations

The CMS may update lesson content, existing assessments, source records, supporting images, and supplemental lessons inside existing chapters. These still require a new Android build:

- New courses or chapters
- New simulator and protocol behavior
- New CLI commands
- New navigation or application features
- New code-rendered illustration families
- Bug and security fixes
