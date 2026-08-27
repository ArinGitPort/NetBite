# NetBite System Architecture

## Learner and instructor delivery

```text
INSTRUCTOR WEBSITE
  Workshop authoring ──┐
  Topology editor      ├──> Supabase drafts
  Assessment settings ─┘          │
                                  │ validated publish
                                  v
                         Immutable workshop version
                                  │
              ┌───────────────────┴───────────────────┐
              │                                       │
              v                                       v
ANDROID STUDENT APP                         SERVER-SIDE GRADING
  Join class                                  Protected answer key
  SQLite offline package                      Attempt rules
  Lessons and saved items                     Recorded grade policy
  Read-only topology                          Gradebook result
  Local unfinished answers
```

## Runtime boundaries

- **Android application:** learner curriculum, private class library, read-only workshop rendering, local SQLite cache, assessment drafts, Sandbox, and deterministic NetBite simulators.
- **Instructor website:** workshop and official-curriculum authoring. It uses a publishable Supabase browser key; RLS remains the authorization boundary.
- **Supabase Auth:** establishes student, instructor, and administrator identity.
- **PostgreSQL and RLS:** enforce ownership, enrollment, immutable versions, and private submissions.
- **Edge Functions:** publish sanitized packages and grade official assessments with protected keys.
- **Supabase Storage:** private draft images and published learner assets.

Official NetBite content and instructor workshops use separate tables, releases, caches, and progress. A workshop publication cannot modify bundled course IDs or simulation code.
