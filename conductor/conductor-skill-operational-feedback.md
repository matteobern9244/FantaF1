# Conductor Skill Operational Feedback

## Scope

- Repository: `FantaF1`
- Skill path: `/Users/matteobernardini/.codex/skills/conductor`
- Goal: make the installed Conductor skill operational against the existing
  historical `conductor/` workspace in this repository.

## Problems Observed

1. `status_tracks.py` crashed on real repository data with `KeyError: 'phase'`.
2. The repository contained mixed legacy metadata schemas:
   - canonical keys such as `id` and `title` in some tracks
   - legacy keys such as `track_id`, `created_at`, `updated_at`, missing
     `phase`, missing `activeTask` in others
3. Several tracks were missing files required by the skill contract:
   - `index.md`
   - `review.md`
   - `verify.md`
   - in some cases also `metadata.json` or `spec.md`
4. `archive_tracks.py` only archived tracks with `status == "done"`, while the
   repository already used legacy states such as `completed`.
5. Portfolio indexes and track indexes were not reliably regenerable from the
   real repository state because the skill assumed a fully canonical metadata
   contract.

## Root Cause

- The skill expected a stricter metadata schema than the historical `conductor/`
  state present in this repository.
- The skill scripts did not normalize legacy fields before rendering status
  lines, generating indexes, or archiving tracks.
- The repository had valid historical content, but not all tracks had been
  materialized through the current skill templates.

## Fixes Applied

### Skill fixes

- Updated
  [`/Users/matteobernardini/.codex/skills/conductor/scripts/conductor_fs.py`](/Users/matteobernardini/.codex/skills/conductor/scripts/conductor_fs.py)
  - added centralized metadata normalization for legacy and canonical track
    schemas
  - added canonical fallback derivation for `id`, `slug`, `title`, `phase`,
    `path`, `relatedTrackIds`, and `activeTask`
  - made track index rendering work from normalized metadata
- Updated
  [`/Users/matteobernardini/.codex/skills/conductor/scripts/archive_tracks.py`](/Users/matteobernardini/.codex/skills/conductor/scripts/archive_tracks.py)
  - archives both canonical `done` and legacy `completed` tracks
  - rewrites archived metadata with canonical `status`, `phase`, `archivedAt`,
    `activeTask`, and `path`

### Repository fixes

- Normalized all existing track metadata under
  [`/Users/matteobernardini/code/FantaF1/conductor/tracks`](/Users/matteobernardini/code/FantaF1/conductor/tracks)
  and
  [`/Users/matteobernardini/code/FantaF1/conductor/archive`](/Users/matteobernardini/code/FantaF1/conductor/archive).
- Preserved existing `plan.md` and `spec.md` content where already present.
- Materialized missing operational files for each track:
  - `index.md`
  - `review.md`
  - `verify.md`
  - plus missing `metadata.json` or `spec.md` where absent
- Regenerated:
  - [`/Users/matteobernardini/code/FantaF1/conductor/index.md`](/Users/matteobernardini/code/FantaF1/conductor/index.md)
  - [`/Users/matteobernardini/code/FantaF1/conductor/tracks.md`](/Users/matteobernardini/code/FantaF1/conductor/tracks.md)
  - all per-track `index.md`

## Canonical Metadata Contract

Every track is now aligned to this operational schema:

```json
{
  "id": "track-or-legacy-id",
  "slug": "canonical-slug",
  "title": "Human-readable title",
  "status": "spec|in_progress|completed|done|archived|new",
  "phase": "current phase label",
  "createdAt": "ISO-8601 UTC timestamp",
  "updatedAt": "ISO-8601 UTC timestamp",
  "archivedAt": "ISO-8601 UTC timestamp or null",
  "path": "conductor/tracks/... or conductor/archive/...",
  "relatedTrackIds": [],
  "activeTask": "Current actionable label"
}
```

## Legacy To Canonical Metadata Mapping

- `track_id` -> `id`
- `created_at` -> `createdAt`
- `updated_at` -> `updatedAt`
- missing `title` -> derived from `title`, otherwise `description`, otherwise
  id/directory name
- missing `slug` -> derived from canonical title/id
- missing `phase` -> defaulted from `status`
- missing `path` -> derived from actual directory location
- missing `relatedTrackIds` -> `[]`
- missing `activeTask`
  - `Archived` when status is `archived`
  - `Completed` when status is `done` or `completed`
  - `Draft and confirm the track spec` when phase is `spec`
  - `No active task` otherwise

## Before And After Examples

### Before

```json
{
  "track_id": "fix_local_startup_20260315",
  "type": "bug",
  "status": "new",
  "created_at": "2026-03-15T13:45:00Z",
  "updated_at": "2026-03-15T13:45:00Z",
  "description": "l'applicazione in locale non si sta piu' avviando"
}
```

### After

```json
{
  "id": "fix_local_startup_20260315",
  "slug": "l-applicazione-in-locale-non-si-sta-piu-avviando",
  "title": "l'applicazione in locale non si sta piu' avviando",
  "status": "new",
  "phase": "new",
  "createdAt": "2026-03-15T13:45:00Z",
  "updatedAt": "2026-03-15T13:45:00Z",
  "archivedAt": null,
  "path": "conductor/tracks/fix_local_startup_20260315",
  "relatedTrackIds": [],
  "activeTask": "No active task"
}
```

## Files Modified

### Skill files

- [`/Users/matteobernardini/.codex/skills/conductor/scripts/conductor_fs.py`](/Users/matteobernardini/.codex/skills/conductor/scripts/conductor_fs.py)
- [`/Users/matteobernardini/.codex/skills/conductor/scripts/archive_tracks.py`](/Users/matteobernardini/.codex/skills/conductor/scripts/archive_tracks.py)

### Repository files

- normalized metadata and generated operational files under:
  - [`/Users/matteobernardini/code/FantaF1/conductor/tracks`](/Users/matteobernardini/code/FantaF1/conductor/tracks)
  - [`/Users/matteobernardini/code/FantaF1/conductor/archive`](/Users/matteobernardini/code/FantaF1/conductor/archive)
- regenerated indexes:
  - [`/Users/matteobernardini/code/FantaF1/conductor/index.md`](/Users/matteobernardini/code/FantaF1/conductor/index.md)
  - [`/Users/matteobernardini/code/FantaF1/conductor/tracks.md`](/Users/matteobernardini/code/FantaF1/conductor/tracks.md)
- added repository regression test:
  - [`/Users/matteobernardini/code/FantaF1/tests/conductor-skill-compatibility.test.js`](/Users/matteobernardini/code/FantaF1/tests/conductor-skill-compatibility.test.js)

## Verification Commands

```bash
npm run test -- tests/conductor-skill-compatibility.test.js
python3 /Users/matteobernardini/.codex/skills/conductor/scripts/status_tracks.py --repo /Users/matteobernardini/code/FantaF1
python3 /Users/matteobernardini/.codex/skills/conductor/scripts/new_track.py --repo /Users/matteobernardini/code/FantaF1 --title "Conductor compatibility smoke"
python3 /Users/matteobernardini/.codex/skills/conductor/scripts/archive_tracks.py --repo /Users/matteobernardini/code/FantaF1
```

## Residual Notes For The Skill Maintainer

- The current skill was robust for newly generated tracks but not for
  repositories with historical Conductor state.
- A permanent upstream improvement would be to keep metadata normalization as a
  first-class behavior in every script that reads track metadata, not only in
  one workflow.
- If upstream wants a stricter schema, it should also provide an explicit
  migration command for older `conductor/` workspaces.
