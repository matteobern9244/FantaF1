# Specification: Archive Completed Tasks

## Overview

This track addresses the chore of cleaning up the `conductor/tracks/` directory
by moving all completed tracks to an archive folder, reducing clutter and
improving navigability. Additionally, the track will clean up the
`conductor/tracks.md` registry.

## Functional Requirements

- **Identification:** Scan all directories within `conductor/tracks/` and read
  their `metadata.json` files.
- **Criteria:** A track is considered completed if its `metadata.json` has
  `"status": "completed"`.
- **Archiving:** Move the folders of all completed tracks to an archive
  directory (e.g., `conductor/archive/`).
- **Registry Cleanup:** Remove the entries of the archived tracks from the
  `conductor/tracks.md` registry file.

## Out of Scope

- Deleting or archiving tracks that are currently in progress or planned (not
  marked as "completed").
- Altering the contents of the tracks being archived.
