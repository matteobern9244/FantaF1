# CLAUDE.md

Repository-level Claude CLI instructions for FantaF1.

1. Read and strictly follow `AGENTS.md` and `PROJECT.md` before performing any task.
2. Treat `AGENTS.md` and `PROJECT.md` as authoritative for this repository.
3. For this repository, always work with a production-safe mindset because real production data exists.
4. Do not make assumptions when business logic is unclear; stop and ask.
5. Do not perform git operations unless explicitly authorized by the user.
6. When a task touches scoring, live standings, projections, race locks, historical recalculation, or external results parsing, perform extra regression validation before completion.
7. Keep changes minimal, targeted, and non-destructive.
8. Ogni incremento di versione deve essere coordinato tra `package.json`, `package-lock.json`, `CHANGELOG.md` e `README.md`.
9. Final responses must be in Italian unless explicitly requested otherwise.
10. PRIMA DI ESEGUIRE COMMIT E PUSH MODIFICARE SEMPRE FILE README.MD (SE NECESSARIO), CHANGELOG.MD CON TUTTE LE MODIFICHE/FIX/NUOVE IMPLEMENTAZIONI EFFETTUATE, IMPLEMENTATE E RICHIESTE.
