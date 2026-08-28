# NetBite Database Design

## Workshop data model

| Record | Purpose | Important relationships |
|---|---|---|
| `instructors` | Administrator-approved teaching access | One authenticated user; may own many workshops |
| `workshops` | Mutable workshop identity and current draft | Owned by one instructor; points to an optional current version |
| `workshop_lessons` | Ordered structured lesson drafts | Belongs to one workshop; stable ID is unique inside it |
| `workshop_topologies` | Authored read-only network diagrams | Belongs to one workshop; referenced by lesson blocks |
| `workshop_flashcards` | Question-and-answer study cards | Belongs to a workshop and lesson stable ID |
| `workshop_assessments` | Practice or graded assessment drafts and settings | Belongs to one workshop |
| `workshop_versions` | Immutable public package | Many versions belong to one workshop |
| `workshop_assessment_keys` | Protected graded correct answers | One key per graded assessment and immutable version; server-only |
| `workshop_classes` | Private teaching group pinned to a version | One instructor, workshop, and version; unique join code |
| `workshop_enrollments` | Student membership | Composite key of class and student |
| `workshop_saved_lessons` | Student library bookmarks | Student, version, and stable lesson ID |
| `workshop_attempts` | Append-only confirmed assessment submissions | Student, class, version, and assessment; request ID is idempotent |
| `workshop_grades` | Attempt chosen by grade policy | One recorded result per class, assessment, and student |
| `workshop_audit_log` | Important instructor actions | Actor and workshop with a safe summary |

The immutable version package intentionally uses JSONB because it is a versioned delivery document, not a transactional authoring model. Mutable authoring, ownership, classes, enrollment, attempts, and grades remain relational. This keeps publication atomic while preserving queryable and enforceable operational data.

## Security rules

- RLS checks instructor ownership for all mutable workshop content.
- Enrollment is required before a student can read a class version or save one of its lessons.
- Students can read only their own attempts and recorded grades.
- Instructors can read results only for their own classes.
- Direct access to protected answer keys is revoked from anonymous and authenticated client roles.
- Version, attempt, grade, and audit creation is performed by server operations rather than browser writes.
- Administrator approval is required before an `instructors` membership becomes active.

## Local data

Android caches workshop packages and unfinished answers in a separate versioned SQLite-backed Zustand store. This local cache is not the authoritative grade record. Official progress, Sandbox workspaces, simulator sessions, and workshop content remain isolated from each other.
