# Specification: Persistenza definitiva highlights per gara con backfill ufficiale F1, matching Sky/YouTube e hardening UTC su Render

## Problem Summary

- Gli highlights gara oggi possono risultare visibili in locale ma non in
  staging o produzione su Render.
- La divergenza suggerisce un rischio concreto nella logica temporale (`UTC`,
  gating del lookup, TTL `missing`, startup order, parse date).
- Il sistema deve salvare in modo permanente nel database i link highlights per
  gara e non rimuoverli piu' una volta trovati.
- Prima dell'operativita' ordinaria sui nuovi eventi, deve essere eseguita una
  scansione delle gare passate, intese come gare gia' effettuate e finite.
- Il calendario ufficiale deve essere riallineato costantemente all'avvio con
  `f1.com`, incluse eventuali gare dichiarate, annullate o sostituite.
- Il matching highlights deve essere rivisto per privilegiare Sky Sport F1
  Italia e YouTube Sky Sport F1, riducendo i falsi positivi.

## Source Of Truth

- Backend autorevole:
  [/Users/matteobernardini/code/FantaF1/backend-csharp](/Users/matteobernardini/code/FantaF1/backend-csharp)
- Regole repository:
  [/Users/matteobernardini/code/FantaF1/AGENTS.md](/Users/matteobernardini/code/FantaF1/AGENTS.md)
- Regole dominio:
  [/Users/matteobernardini/code/FantaF1/PROJECT.md](/Users/matteobernardini/code/FantaF1/PROJECT.md)
- Runtime e operativita':
  [/Users/matteobernardini/code/FantaF1/README.md](/Users/matteobernardini/code/FantaF1/README.md)

## In Scope

- Riallineamento artefatti Conductor incoerenti
- Hardening UTC del dominio highlights
- Aggiornamento calendario ufficiale da `f1.com` all'avvio
- Gestione sicura delle gare `declared`/sostituite/annullate
- Backfill iniziale delle gare concluse ufficiali
- Persistenza permanente append-only di `highlightsVideoUrl`
- Miglioramento lookup e ranking Sky/YouTube
- Verifica consumo frontend dei dettagli gara
- Verifica launcher Mac/Windows
- Test backend/frontend e coverage al 100%

## Out Of Scope

- Commit
- Push
- Merge, rebase, tag
- Refactor ampio non richiesto
- Rottura del contratto API salvo necessita' dimostrata
- Modifiche a scoring/projections/lock se non per regressioni indirette

## Principles To Apply

- TDD rigorosa `RED -> GREEN -> REFACTOR`
- Correctness first
- Minimal safe change
- Determinism
- No regression
- Production safety
- `SRP`, `OCP`, `LSP`, `ISP`, `DIP`
- Dependency injection by default
- Nessuna perdita dati silenziosa
- Nessun uso diretto del clock globale nei path highlights
- Coverage totale obbligatoria al 100%

## Acceptance Criteria

- Ogni gara conclusa con highlights trovati salva il link nel documento
  `weekends` corretto.
- Un link highlights gia' persistito non viene piu' rimosso, svuotato o
  degradato.
- Il calendario viene riallineato all'avvio da `f1.com` senza rompere startup.
- Le gare `declared`/sostituite/annullate vengono riconciliate in modo sicuro.
- Il backfill iniziale riguarda solo gare concluse e ufficialmente presenti nel
  calendario aggiornato.
- La logica temporale highlights e' coerente in `UTC` tra locale, staging e
  produzione.
- Il matching privilegia Sky Sport F1 Italia / YouTube Sky Sport F1 e riduce i
  falsi positivi.
- Il frontend continua a mostrare correttamente gli highlights nei dettagli
  gara.
- Tutti i test richiesti passano.
- La coverage ufficiale repository/application e backend C# resta al 100%.
- Nessun commit o push viene eseguito.

## Risks

- Divergenza UTC locale vs Render
- Parse date non uniformi
- Degrado accidentale di `highlightsVideoUrl` durante il sync full-write
- Gare sostituite/annullate da `f1.com`
- Falsi positivi/negativi nel matching Sky/YouTube
- Startup rallentato o fragile in caso di sorgenti esterne instabili

## Planned Skills

- `conductor`
- `aspnet-core`
- `playwright` se necessario per verifica browser reale
