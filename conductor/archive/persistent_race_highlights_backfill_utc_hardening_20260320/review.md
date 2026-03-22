# Review: persistent_race_highlights_backfill_utc_hardening_20260320

## Scope

- Persistenza permanente degli highlights per gara
- Backfill iniziale delle gare concluse ufficiali
- Riallineamento calendario da `f1.com` all'avvio
- Miglioramento matching Sky Sport F1 Italia / YouTube
- Hardening UTC per eliminare divergenze tra locale e Render
- Verifica launcher Mac/Windows e stabilita' frontend nei dettagli gara

## Review Focus

- Sicurezza della riconciliazione tra calendario persistito e calendario
  ufficiale aggiornato
- Assenza di downgrade di `highlightsVideoUrl`
- Uniformita' delle decisioni temporali in `UTC`
- Determinismo del backfill e della retry policy
- Accuratezza del matching dei video highlights
- Assenza di regressioni su startup, UI admin/public, desktop/mobile
- Conservazione della coverage al 80%

## Risks To Evaluate During Review

- Divergenza locale, staging e produzione dovuta a clock, parse date o timezone
- Cancellazione involontaria dei link highlights durante `WriteAllAsync` o merge
  sync
- Gestione errata di gare annullate o sostituite da `f1.com`
- Falsi positivi Sky/YouTube su contenuti non highlights
- Startup degradation o comportamento non resiliente a failure esterni
- Regressioni nei launcher locali Mac/Windows

## Decision

- Approved for archive after final document alignment

## Findings

- UTC-sensitive highlights decisions were hardened around injected clock usage
  and race completion timing.
- Persistence now preserves previously found `highlightsVideoUrl` values during
  later `missing` lookups and official calendar reconciliation.
- Matching now prioritizes trusted Sky Sport Formula 1 sources before broader
  fallback discovery, with responsive and production-like validations recorded
  in `verify.md`.

## Residual Risks

- The approved scope closed without extracting every planned refactor seam into
  smaller collaborators because behavior, validation, and coverage targets were
  already satisfied.
- Future changes in external publisher structures or official calendar fields
  still require targeted verification in the highlights pipeline.

## Constraints

- No commit
- No push
- Apply all `AGENTS.md` programming principles
- Use strict `RED -> GREEN -> REFACTOR`
- Do not accept completion below 80% coverage

- Decision: Administrative archive decision recorded to close the track.
