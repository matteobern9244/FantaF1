# Review: Persistenza Definitiva Highlights Per Gara

## Findings

- The authoritative defect is destructive persistence during calendar sync, not a frontend-only visibility issue.
- Highlights are already stored per race via `meetingKey`, but that persisted association was not protected from later `missing` lookups.
- Calendar sync also had a secondary consistency gap because it used `DateTimeOffset.UtcNow` directly instead of the shared injected clock abstraction.

## Decision

- Keep highlights in the existing `weekends` documents.
- Preserve persisted `found` metadata across later transient `missing` or exception paths.
- Do not introduce a separate collection for this fix.
- Keep the repository coverage baseline unchanged because the verified official summary remains at 100%.
- Do not execute commit or push; the track remains completed locally on the dedicated branch.
