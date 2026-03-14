# Implementation Plan: Porting C# - Fase 10 (Docker, Render Staging, Atlas)

Questa track operazionalizza l'ambiente di staging e l'infrastruttura containerizzata per il porting C#. Tutti i task devono rispettare rigorosamente `AGENTS.md` e mantenere la copertura al 100%.

## Fase 1: Automazione Provisioning MongoDB Atlas
**Obiettivo:** Creare uno script di provisioning sicuro e automatizzato per `fantaf1_porting` e `fantaf1_staging`.

- [ ] Task: TDD Setup - Script Provisioning (RED)
    - [ ] Creare un test fallimentare in `tests/atlas-provisioning.test.js` che verifichi il mancato provisioning delle collection `appdatas`, `drivers`, `weekends`, `standingscaches`, `admincredentials` su un database di test.
    - [ ] **Compliance AGENTS.md:** Verificare che il test sia deterministico e non muti database reali.
- [ ] Task: Implementazione Script Provisioning (GREEN)
    - [ ] Sviluppare `scripts/atlas-provisioning.mjs` usando il driver MongoDB nativo.
    - [ ] Lo script deve gestire la creazione di database, collection e indici (es. indici su `meetingKey` o `gpName`).
- [ ] Task: Refactoring e 100% Coverage (REFACTOR)
    - [ ] Pulire lo script, gestire correttamente la chiusura della connessione e gli errori.
    - [ ] Eseguire `npm run test` e verificare la copertura al 100% per lo script.
    - [ ] **Coverage 100% totale:** Verificare che l'intero repository rimanga al 100%.
- [ ] Task: Conductor - User Manual Verification 'Fase 1' (Protocollo in workflow.md)

## Fase 2: Dockerizzazione Multi-Stage (React + .NET)
**Obiettivo:** Creare un'immagine Docker stateless che serva sia il frontend che il backend.

- [ ] Task: Creazione Dockerfile (RED)
    - [ ] Creare `backend-csharp/Dockerfile` con una configurazione base che fallisce la build per mancanza di stage o path errati.
- [ ] Task: Implementazione Dockerfile Multi-Stage (GREEN)
    - [ ] Stage 1: Build React (`npm ci`, `npm run build`).
    - [ ] Stage 2: Build .NET (`dotnet restore`, `dotnet publish`).
    - [ ] Stage 3: Immagine runtime finale basata su `aspnet:10.0`, copiando gli asset statici nella web root di ASP.NET Core.
- [ ] Task: Validazione Build Locale (REFACTOR)
    - [ ] Eseguire la build Docker localmente.
    - [ ] Verificare che l'immagine esponga correttamente `/api/health` e serva `index.html`.
    - [ ] **Compliance AGENTS.md:** Assicurarsi che nessuna credenziale sia "leaked" negli stage intermedi.
- [ ] Task: Conductor - User Manual Verification 'Fase 2' (Protocollo in workflow.md)

## Fase 3: Configurazione e Deploy Staging Render
**Obiettivo:** Deploy guidato del servizio `FantaF1_staging`.

- [ ] Task: Provisioning Atlas "Staging"
    - [ ] Eseguire `node scripts/atlas-provisioning.mjs` puntando al database `fantaf1_staging` (usando credenziali di staging).
- [ ] Task: Guida Configurazione Render (Interattivo)
    - [ ] Guidare l'utente nella creazione del Web Service Docker su Render.
    - [ ] Configurare le variabili d'ambiente: `ASPNETCORE_ENVIRONMENT=Staging`, `MONGODB_URI`, `ADMIN_SESSION_SECRET`.
    - [ ] **Politica di Chiarimento:** Chiedere conferma all'utente per ogni segreto inserito.
- [ ] Task: Validazione Health Check Post-Deploy
    - [ ] Verificare che `https://fantaf1-staging.onrender.com/api/health` (URL d'esempio) risponda con successo.
- [ ] Task: Conductor - User Manual Verification 'Fase 3' (Protocollo in workflow.md)

## Fase 4: Validazione Finale e Regression Check
**Obiettivo:** Certificare che l'ambiente di staging sia pronto e parity-green.

- [ ] Task: Verifica Parità Staging
    - [ ] Eseguire `npm run test:save-local` e `check viste` (responsive) puntando all'URL di staging.
- [ ] Task: Coverage 100% totale
    - [ ] Eseguire un'ultima verifica di copertura globale su Node e C#.
- [ ] Task: Conductor - User Manual Verification 'Fase 4' (Protocollo in workflow.md)
