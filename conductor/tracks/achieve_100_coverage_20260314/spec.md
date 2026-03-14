# Track Specification: Certificazione Copertura Test 100% (Frontend, Node, C#)

## Obiettivo
L'obiettivo di questa track è raggiungere e certificare la copertura dei test al 100% (statements, branches, functions, lines) per tutte le aree dell'applicazione: Frontend (React/TS), Backend Node.js ed Express, e Backend C# (.NET 10). Una volta raggiunta la copertura totale, i risultati devono essere aggiornati nei file di documentazione `AGENTS.md` e `README.md`.

## Requisiti e Vincoli
- **Copertura Totale:** 100% su tutte le metriche (Lines, Branches, Functions, Statements).
- **Ambito Frontend/Node:** `app.js`, `server.js`, `backend/**/*.js`, `src/**/*.ts`, `src/**/*.tsx`.
- **Ambito C#:** `backend-csharp/src/`.
- **Documentazione:** Aggiornare `AGENTS.md` e `README.md` con i nuovi numeri di baseline.
- **TDD:** Seguire rigorosamente il ciclo RED -> GREEN -> REFACTOR per le nuove aggiunte di test.
- **Non-Regressione:** Garantire che i test esistenti rimangano passanti e che non vengano introdotte regressioni funzionali.

## Analisi Iniziale (Gap Identificati)
1. **Node Backend (`app.js`, `server.js`):** Attualmente al 99.88% a causa dei blocchi `if (!process.env.VITEST)` che caricano `dotenv`.
2. **C# Backend:** Verificare lo stato attuale tramite `npm run test:csharp-coverage` e colmare eventuali gap.
3. **Frontend:** Verificare lo stato attuale e colmare eventuali gap.

## Criteri di Accettazione
1. Report Vitest (Node/Frontend) mostra 100% ovunque.
2. Report Coverlet (C#) mostra 100% su Linee, Branch e Metodi.
3. `AGENTS.md` aggiornato con le nuove statistiche di copertura.
4. `README.md` aggiornato con le nuove statistiche di copertura.
5. Tutti i test (unitari, integrazione, contract) sono passanti.
