# Piano di Implementazione: Migrazione al Backend C#

## Phase 1: Preparazione Ambiente e Database

- [x] Task: Documentazione dei passi su Render.com
  - [x] Sub-task: Scrivere un documento con i passi manuali esatti per allineare
        l'ambiente staging/produzione al Docker container C# prima del merge.
- [x] Task: Configurazione Database Locale
  - [x] Sub-task: Creare script/aggiornare l'ambiente per automatizzare
        l'eliminazione di `fantaf1_dev` e configurare l'uso esclusivo di
        `fantaf1_staging` in locale.
  - [x] Sub-task: Eseguire e verificare la corretta connessione al DB
        `fantaf1_staging`.

## Phase 2: Pulizia del Backend Node.js

- [x] Task: Rimozione codice Node.js
  - [x] Sub-task: Eliminare i file e le directory del backend Node.js non più
        necessari.
  - [x] Sub-task: Rimuovere le dipendenze Node.js backend (express, mongoose,
        ecc.) dal `package.json`.
- [x] Task: Aggiornamento degli script di avvio
  - [x] Sub-task: Aggiornare `start_fantaf1.command` e `package.json` scripts
        affinché l'ambiente di sviluppo locale avvii il backend C# (.NET) invece
        di Node.js.

## Phase 3: Allineamento e Configurazione Frontend

- [x] Task: Integrazione Frontend con C#
  - [x] Sub-task: Verificare e configurare il frontend (Vite) affinché comunichi
        correttamente con le porte e gli endpoint del backend C#.

## Phase 4: Aggiornamento CI/CD e Deployment

- [x] Task: Allineamento Pipeline GitHub Actions
  - [x] Sub-task: Modificare `.github/workflows` (es. pr-ci.yml) per rimpiazzare
        i test Node.js del backend con `dotnet test` (usando Coverlet).
  - [x] Sub-task: Mantenere gli step CI del frontend e pulire tutto ciò che
        riguarda il backend Node.js.
- [x] Task: Revisione comando 'deploya'
  - [x] Sub-task: Aggiornare la logica di `deploya` o il workflow di rilascio
        affinché includa build e check specifici per C# prima del deploy su
        Render.

## Phase 5: Validazione Completa e Assenza di Regressioni

- [x] Task: Verifica Test Coverage
  - [x] Sub-task: Generare i report di Coverlet e assicurarsi che la copertura
        sia al 100% per C#.
  - [x] Sub-task: Eseguire la suite Playwright/Vitest (`check viste`) e
        verificare l'assenza di regressioni sulla UI.
- [x] Task: Smoke Test
  - [x] Sub-task: Avviare l'app intera con il launcher locale e verificare un
        flusso completo E2E (es. log in, visualizzazione dati).
  - [x] Sub-task: Stop. Attendere conferma dall'utente prima di qualsiasi merge
        su `main`.
