# NetBite Instructor Administration

The instructor portal is a separate React website for approved NetBite administrators. It shares the Supabase project used by the Android learner application but is not included in the APK.

The visual and language standards are documented in [`ADMIN_WEB_UX_STANDARD.md`](./ADMIN_WEB_UX_STANDARD.md).

Instructor-created class material is documented separately in [`INSTRUCTOR_WORKSHOPS.md`](./INSTRUCTOR_WORKSHOPS.md). The same website hosts both tools, but their permissions and data remain separate:

- approved instructors manage only their own workshops and classes;
- administrators manage official NetBite curriculum and approve instructors;
- publishing a workshop never changes an official course release.

The portal sections **My Workshops**, **Classes**, **Workshop Assessments**, and **Gradebook** provide structured lesson authoring, read-only topology composition, private enrollment, and recorded assessment results. Android instructors can monitor and share; full editing remains on this website.

## Security boundary

- Only accounts listed in `public.content_admins` may open curriculum drafts.
- Every approved administrator may edit, check, publish, restore, and review sanitized activity history.
- The portal cannot register administrators or grant access to itself.
- Learners receive only the active public curriculum package and published supporting images.
- Draft images remain private and use expiring preview links.
- Simulator engines, CLI behavior, application navigation, and supported technical visuals remain Android application code.

Never place a Supabase secret or service-role key in the Android app, portal, repository, screenshots, or chat. The browser uses only the project URL and publishable key; RLS enforces access.

## Apply the database changes

Review and apply the migrations to the intended Supabase project:

```powershell
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The security-hardening migration automatically copies all existing editor and publisher accounts into the single administrator list.

## Approve the first administrator

Find the existing account in Supabase Authentication, copy its user UUID, and run this once in the Supabase SQL editor:

```sql
insert into public.content_admins (user_id)
values ('REPLACE_WITH_AUTH_USER_UUID')
on conflict do nothing;
```

Do not add a public administrator-registration screen.

## Deploy the protected functions

Set `ADMIN_ALLOWED_ORIGINS` as a comma-separated list containing the deployed portal origin. Local development on port `4174` is allowed automatically.

```powershell
supabase functions deploy validate-content-release
supabase functions deploy publish-content-release
supabase functions deploy rollback-content-release
```

Supabase supplies the project URL and server secrets to the functions. Confirm secrets in the dashboard without copying their values into browser environment files.

## Import the current curriculum

Validate the local input before performing a database write:

```powershell
npm run content:seed:check
```

For the one-time import, provide the server credential only to the current terminal session and remove it immediately afterward:

```powershell
$env:SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = 'YOUR_TEMPORARY_SERVER_VALUE'
npm run content:seed
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
```

Existing lessons remain core requirements. Lessons created in the portal are supplemental.

## Run the portal locally

Run `npm run portal:configure` once to create `apps/portal/.env.local` from the existing local Android configuration, or create it from `apps/portal/.env.example`. The command copies only the project URL and publishable key, prints no values, and does not make the portal read Android variables at build time.

```powershell
npm run portal:dev
```

Open `http://localhost:4174` and sign in with an approved administrator account.

## Publishing workflow

1. Prepare lesson, assessment, reference, or supporting-image drafts.
2. Check required fields, lesson relationships, answer mappings, URLs, and image metadata.
3. Describe the changes and publish one complete curriculum version.
4. Connected Android devices verify the checksum and save the update in SQLite.
5. Offline devices continue using their current downloaded or bundled curriculum.
6. Restoring an older version creates a new published version; history is never rewritten.

## Production requirements

```powershell
npm run portal:typecheck
npm run portal:test
npm run portal:build
```

The deployable site is generated in `apps/portal/dist` without public source maps. Configure HTTPS and these response headers on the selected static host:

- `Content-Security-Policy` restricted to the portal, Supabase project, and published image origin.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`.
- `Permissions-Policy` disabling capabilities the portal does not use.

## Update limitations

The portal may update lesson text, assessments, references, supporting images, and supplemental lessons inside existing chapters. These changes still require a new Android build:

- New courses or chapters.
- New simulator or protocol behavior.
- New CLI commands.
- New navigation or application features.
- New technical visual families.
- Bug and security fixes.
