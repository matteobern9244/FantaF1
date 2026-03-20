# Implementation Plan: Analisi e Pulizia Database MongoDB Atlas

Questo piano descrive i passaggi per identificare e suggerire l'eliminazione dei
database non necessari su Atlas, garantendo la sicurezza degli ambienti attivi.

## Fase 1: Verifica e Conferma

- [x] Task: Esaminare lo screenshot `screenshot/db_on_atlas.png`. (DONE)
- [x] Task: Cercare riferimenti ai database nel codebase (`grep`). (DONE)
- [x] Task: Verificare l'utilizzo dei database nei workflow GitHub Actions.
      (DONE)
- [x] Task: Consultare `AGENTS.md`, `PROJECT.md` e
      `docs/backend-csharp-porting-plan.md`. (DONE)

## Fase 2: Identificazione Target

In base all'analisi, i seguenti database possono essere eliminati senza causare
regressioni:

1. `mongodbVSCodePlaygroundDB`: È un database temporaneo di test/playground.
2. `fantaf1_porting_audit_subphase15`: Non è più referenziato nel piano di
   porting attuale (che è alla Fase 10/11) e non è usato nel codice.

I seguenti database **DEVONO ESSERE MANTENUTI**:

- `fantaf1`: Produzione.
- `fantaf1_dev`: Sviluppo locale (Node.js).
- `fantaf1_staging`: Ambiente di Staging (Render.com).
- `fantaf1_ci`: Pipeline di CI/CD (GitHub Actions).
- `fantaf1_porting`: Sviluppo locale e test per il porting C#.

## Fase 3: Azioni Suggerite

- [x] Task: Chiedere conferma all'utente per l'eliminazione dei due database
      candidati. (DONE)
- [x] Task: Fornire istruzioni per l'eliminazione manuale su MongoDB Atlas
      (essendo un'operazione esterna al file system locale). (DONE)

## Verifica e Testing

- **Regression Check:** Dopo l'eventuale eliminazione, eseguire `npm run test` e
  `./start_fantaf1.command` per confermare che lo sviluppo locale funzioni.
- **CI Check:** Verificare che i prossimi PR passino i test su GitHub Actions
  (che usano `fantaf1_ci`).
- **Staging Check:** Verificare la raggiungibilità del servizio su Render.com.

## Coverage 100% totale

- Questo task è di natura infrastrutturale/configurativa e non modifica il
  codice dell'applicazione.
- La copertura del 100% per i test esistenti deve essere preservata dopo la
  pulizia.
- Eseguire `npm run test:coverage` per confermare l'integrità del sistema.
