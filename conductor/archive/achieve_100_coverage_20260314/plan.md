# Implementation Plan: Certificazione Copertura Test 100% (Frontend, Node, C#)

Questo piano descrive i passaggi per raggiungere la copertura totale dei test e
aggiornare la documentazione di riferimento.

## Fase 1: Analisi e Gap Filling Node/Frontend

- [x] Task: Eseguire `npm run test:coverage` per identificare con precisione le
      linee non coperte in `app.js` e `server.js`. (DONE)
- [x] Task: Aggiungere o modificare i test in `tests/server.test.js` e
      `tests/app.test.js` per coprire i rami di caricamento `dotenv` o simulare
      l'assenza di `VITEST`. (DONE)
- [x] Task: Verificare che la copertura Vitest raggiunga il 100% totale. (DONE)

## Fase 2: Analisi e Gap Filling C#

- [x] Task: Eseguire `npm run test:csharp-coverage` per confermare lo stato
      attuale di `backend-csharp/src/`. (DONE)
- [x] Task: Se necessario, aggiungere test unitari o di integrazione in
      `backend-csharp/tests/` per colmare eventuali gap. (DONE)
- [x] Task: Verificare che la copertura Coverlet raggiunga il 100% su tutte le
      metriche. (DONE)

## Fase 3: Aggiornamento Documentazione

- [x] Task: Aggiornare la sezione `Test stack and coverage profile` in
      `AGENTS.md` con i nuovi numeri totali di statements, functions, branches e
      lines. (DONE)
- [x] Task: Aggiornare la sezione `Qualita' tecnica -> Test` in `README.md` per
      riflettere lo stato attuale di copertura certificata. (DONE)
- [x] Task: Verificare che lo stile degli aggiornamenti sia coerente con quello
      preesistente. (DONE)

## Verifica e Testing

- **Copertura Totale:** Verificare che `npm run test:coverage` e
  `npm run test:csharp-coverage` non riportino alcun errore di soglia.
- **Integrità:** Eseguire `./start_fantaf1.command` per confermare che
  l'applicazione sia avviabile e funzionale.

## Coverage 100% totale

- Questo piano stesso è dedicato al raggiungimento del 100% di copertura.
- Ogni modifica al codice deve essere accompagnata da test che mantengano la
  soglia del 100%.
