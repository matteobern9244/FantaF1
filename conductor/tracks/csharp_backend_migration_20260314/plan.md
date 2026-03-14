# Piano di Implementazione: Migrazione al Backend C#

## Phase 1: Preparazione Ambiente e Database
- [ ] Task: Documentazione dei passi su Render.com
  - [ ] Sub-task: Scrivere un documento con i passi manuali esatti per allineare l'ambiente staging/produzione al Docker container C# prima del merge.
- [ ] Task: Configurazione Database Locale
  - [ ] Sub-task: Creare script/aggiornare l'ambiente per automatizzare l'eliminazione di `fantaf1_dev` e configurare l'uso esclusivo di `fantaf1_staging` in locale.
  - [ ] Sub-task: Eseguire e verificare la corretta connessione al DB `fantaf1_staging`.

## Phase 2: Pulizia del Backend Node.js
- [ ] Task: Rimozione codice Node.js
  - [ ] Sub-task: Eliminare i file e le directory del backend Node.js non più necessari.
  - [ ] Sub-task: Rimuovere le dipendenze Node.js backend (express, mongoose, ecc.) dal `package.json`.
- [ ] Task: Aggiornamento degli script di avvio
  - [ ] Sub-task: Aggiornare `start_fantaf1.command` e `package.json` scripts affinché l'ambiente di sviluppo locale avvii il backend C# (.NET) invece di Node.js.

## Phase 3: Allineamento e Configurazione Frontend
- [ ] Task: Integrazione Frontend con C#
  - [ ] Sub-task: Verificare e configurare il frontend (Vite) affinché comunichi correttamente con le porte e gli endpoint del backend C#.

## Phase 4: Aggiornamento CI/CD e Deployment
- [ ] Task: Allineamento Pipeline GitHub Actions
  - [ ] Sub-task: Modificare `.github/workflows` (es. pr-ci.yml) per rimpiazzare i test Node.js del backend con `dotnet test` (usando Coverlet).
  - [ ] Sub-task: Mantenere gli step CI del frontend e pulire tutto ciò che riguarda il backend Node.js.
- [ ] Task: Revisione comando 'deploya'
  - [ ] Sub-task: Aggiornare la logica di `deploya` o il workflow di rilascio affinché includa build e check specifici per C# prima del deploy su Render.

## Phase 5: Validazione Completa e Assenza di Regressioni
- [ ] Task: Verifica Test Coverage
  - [ ] Sub-task: Generare i report di Coverlet e assicurarsi che la copertura sia al 100% per C#.
  - [ ] Sub-task: Eseguire la suite Playwright/Vitest (`check viste`) e verificare l'assenza di regressioni sulla UI.
- [ ] Task: Smoke Test
  - [ ] Sub-task: Avviare l'app intera con il launcher locale e verificare un flusso completo E2E (es. log in, visualizzazione dati).
  - [ ] Sub-task: Stop. Attendere conferma dall'utente prima di qualsiasi merge su `main`.