# Review: Fix Highlights Lookup Availability

## Problem Found

The authoritative C# lookup algorithm was still searching YouTube with a stale
publisher label, `Sky Sport Italia F1`, and with an unnecessarily long
`GrandPrixTitle` seed. In practice this made the channel and global search paths
too brittle, which explains why highlights could remain unavailable even when
the Sky Sport F1 source was reachable.

## Fix Applied

- Updated the canonical publisher label to `Sky Sport F1`.
- Reworked `BuildSearchQuery` to prefer a compact meeting-based title seed:
  - `MeetingName`
  - detail-url slug
  - `MeetingKey`
  - `GrandPrixTitle`
- Normalized the title-seed fallback so empty strings do not stop the fallback
  chain early.

## TDD Notes

- Added RED tests that failed on:
  - stale `Sky Sport Italia F1` query generation
  - verbose `GrandPrixTitle` search seed
  - real channel-search request URI not matching the compact live query
- Added fallback coverage tests for detail-url slug and `GrandPrixTitle`.
- GREEN and REFACTOR kept the runtime contract unchanged while restoring 80%
  backend coverage in the touched file.
