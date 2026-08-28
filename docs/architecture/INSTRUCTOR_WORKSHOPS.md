# NetBite Instructor Workshops

## Purpose

Instructor Workshops let an approved teacher prepare private learning material on the NetBite website and deliver a fixed published version to enrolled students in the Android application. Workshops supplement the official NetBite curriculum; they cannot silently modify courses, certificates, Sandbox workspaces, or simulator progress.

This first release supports structured text, supporting images, references, flashcards, multiple-choice assessments, and read-only network topologies. A topology can explain configuration and troubleshooting evidence, but it does not execute packets or arbitrary Cisco commands. New simulation behavior still requires application development and a new Android build.

## Roles

| Role | Main responsibilities | Security boundary |
|---|---|---|
| Student | Join classes, download lessons, save lessons, study, and submit graded work | Can read only joined published versions and their own submissions |
| Instructor | Author workshops, publish versions, create classes, share enrollment details, and review grades | Must be approved by an administrator; can manage only owned workshops |
| Administrator | Approve instructors and manage official NetBite curriculum | Official curriculum remains separate from instructor workshops |

An account cannot assign itself instructor or administrator access. The `instructors` record is created only after administrator approval and can be revoked without deleting historical classes.

## Authoring and publication

1. The instructor signs in to the responsive instructor website.
2. **My Workshops** creates a private draft.
3. Lessons are assembled from typed blocks: heading, paragraph, callout, example, image, or topology.
4. The topology editor places up to 12 PCs, switches, routers, or servers at normalized coordinates. The instructor may add interface details, addresses, routes, VLAN information, link context, and notes.
5. **Workshop Assessments** creates either Practice or Graded multiple-choice work.
6. Publication validates the complete draft and creates an immutable `workshop_versions` record. Existing versions are never edited in place.
7. A private class is created from one published version. Its students and grades remain pinned to that version even after a newer workshop version is published.

The learner package contains only published, allowlisted fields. Graded correct answers and explanations are placed in `workshop_assessment_keys`, which is inaccessible to browser and Android clients.

## Classes and sharing

Each class receives a random 8-character code that avoids easily confused characters. The instructor may share:

- the short code;
- an Android deep link containing that code; or
- a QR code that encodes the same link.

The code is separate from workshop content. Archiving a class or revoking its code stops new enrollment while retaining the version and results for existing students. The database limits repeated failed joins per account; the deployed service should also use network-level throttling for defense in depth.

## Student library and offline behavior

Joining requires an authenticated student and internet access. After enrollment, the complete public workshop package is cached in the app’s SQLite key-value store. Published images are downloaded into a versioned local directory before the new package is activated. The student can then open lessons, images, flashcards, practice questions, and topology configuration without Supabase.

**Saved Lessons** is a quick-access subset of joined content. Its record includes class, workshop version, and lesson ID. Archived workshops remain readable for previously enrolled students. A refresh is activated only after the returned package and its images pass compatibility validation; malformed or interrupted downloads do not replace the offline copy. Compatible version changes retain locally drafted answers whose stable question IDs still exist.

## Assessments

### Practice

- Unlimited attempts.
- Answer key and explanations are included in the downloaded package.
- Works offline.
- Does not create a gradebook record.

### Graded

- Requires a signed-in, currently enrolled student and internet access.
- The app stores unfinished answers locally but cannot calculate or claim an official grade.
- The server checks the opening date, attempt limit, pinned version, and protected answer key.
- A client-generated request UUID makes retrying an interrupted request idempotent.
- The recorded grade follows the instructor’s `highest`, `latest`, or `first` policy.
- Feedback is released immediately, after the final attempt, or after the due date.
- Due-date submissions may be accepted and marked late unless the instructor archives the class or otherwise closes access.

Shuffling is presentation behavior. Stable question and choice IDs ensure that shuffled answers still map to the correct server-side key.

## Gradebook

The instructor sees enrolled, submitted, missing, late, average, and recorded results. Per-student rows show the selected recorded grade, attempts, last submission, and status. CSV export contains only the visible gradebook fields; answer payloads and protected keys are excluded.

## Topology scope

Workshop topologies are explanatory, not simulated. Students may pan, zoom where supported, select devices, inspect interfaces, and inspect connections. They cannot move, reconnect, or configure the devices.

Validation rejects malformed addresses, duplicate device names, reused link endpoints, missing alternative descriptions, more than 12 devices, and positions outside the mobile canvas. A logically incorrect route, subnet, VLAN, or down interface may remain as a warning because it can be an intentional troubleshooting example.

## Data isolation

- Official curriculum tables and releases remain owned by administrators.
- Workshop drafts and versions are owned by one approved instructor.
- Classes reference one immutable workshop version.
- Enrollments join a student to a class.
- Protected answer keys are server-only.
- Attempts are append-only official submissions.
- Recorded grades reference the attempt selected by the configured score policy.
- Saved lessons and unfinished answer drafts are separate from official course progress.

Detailed schema responsibilities are listed in [`DATABASE_DESIGN.md`](./DATABASE_DESIGN.md). The system boundary is shown in [`SYSTEM_ARCHITECTURE.md`](./SYSTEM_ARCHITECTURE.md).

## Operational limitations

- Multiple-choice is the only automatically graded type in the first release.
- Workshop images require validated uploads and accessible alternative text.
- Automatic grading cannot evaluate essays, command transcripts, or live configurations.
- Read-only diagrams do not replace NetBite’s coded simulation engines.
- A hosting provider must provide HTTPS, CSP, frame protection, request throttling, and reliable Edge Function deployment before production use.
