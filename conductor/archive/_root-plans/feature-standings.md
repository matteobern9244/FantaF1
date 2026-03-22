# F1 Real Standings Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to
> implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementare la "Classifica piloti" e la "Classifica scuderia" con
dati reali nella vista pubblica dell'applicazione, utilizzando uno stile
professionale ispirato a "Sky Sport F1 Italia" ma coerente con il font e le
guideline di design attuali.

**Architecture:**

- **Backend:** Creazione di un servizio di fetching e parsing
  (`backend/standings.js`) per recuperare i punti aggiornati dei piloti e dei
  costruttori dalle fonti ufficiali (es. formula1.com o statsf1), salvandoli
  nella cache tramite `backend/storage.js` e servendoli tramite un nuovo
  endpoint REST `/api/standings` in `app-route-service.js`.
- **Frontend:** Sviluppo del nuovo componente
  `src/components/StandingsPanel.tsx` dedicato alla visualizzazione pubblica,
  integrato in `App.tsx`. I dati verranno recuperati on-load usando l'esistente
  pattern `fetchWithRetry`.

**Tech Stack:** React 18, TypeScript, Node.js (Express), Vitest, React Testing
Library.

**Principi di Design e Programmazione Applicati (da `AGENTS.md`):**

- **TDD Obbligatorio:** Strategia RED -> GREEN -> REFACTOR rigorosa per ogni
  singola modifica.
- **Isolamento delle Responsabilità:** Nessun refactoring di codice non
  correlato; logica di scraping separata dalle rotte.
- **Configurazione Centralizzata:** Tutti i nuovi testi e URL saranno inseriti
  in `app-config.json` e `uiText.ts`.
- **Nessuna dipendenza esterna UI:** Design custom via CSS classico (`App.css`),
  mantenendo il layout full-width e i pattern interattivi esistenti.

---

## Task 1: Configurazione URL e Dati di Test (TDD Setup)

**Files:**

- Modifica: `config/app-config.json`
- Modifica: `src/constants.ts` e `src/types.ts`
- Test: `tests/app-helpers-config.test.ts` (o equivalenti per validare le nuove
  chiavi)

- [ ] **Step 1: Scrivere test fallimentare (RED)**
  - Aggiungere un test che verifica la presenza delle nuove stringhe
    `standingsSource` in `app-config.json` e l'endpoint `/api/standings` in
    `constants.ts`.
- [ ] **Step 2: Eseguire il test per validare il fallimento**
  - Run: `npm run test`
  - Expected: FAIL
- [ ] **Step 3: Implementare il codice minimo (GREEN)**
  - Aggiungere gli URL ufficiali e le etichette di UI (es. "Classifica piloti",
    "Classifica scuderia") nel config.
  - Definire le interfacce TypeScript `DriverStanding` e `ConstructorStanding`
    in `src/types.ts`.
- [ ] **Step 4: Eseguire test (REFACTOR) e Coverage**
  - Verificare che i test passino e che non ci siano impatti sulla coverage.
- [ ] **Step 5: Commit**
  - `git add config/ src/ tests/`
  - `git commit -m "feat: add standings configuration and types"`

## Task 2: Backend Storage e Scraping Servizio Standings

**Files:**

- Modifica: `backend/storage.js`
- Crea: `backend/standings.js`
- Modifica: `tests/storage.test.js`
- Crea: `tests/backend-standings.test.js`

- [ ] **Step 1: Scrivere test fallimentari (RED)**
  - In `backend-standings.test.js`, scrivere test per le funzioni
    `parseStandingsHtml` e `syncStandingsFromOfficialSource`.
  - Mockerare la risposta HTML e verificare l'estrazione corretta di piloti,
    team e punti.
- [ ] **Step 2: Eseguire il test per validare il fallimento**
  - Run: `npm run test`
  - Expected: FAIL
- [ ] **Step 3: Implementare scraping e storage (GREEN)**
  - Implementare `readStandingsCache` e `writeStandingsCache` in `storage.js`.
  - Implementare la logica di fetching usando `fetchHtml` (esistente in
    config/drivers) e parsing delle tabelle.
- [ ] **Step 4: Eseguire test (REFACTOR) e verificare 80% Coverage**
  - Run: `npm run test`
  - Expected: PASS e Coverage 80% mantenuta per i file backend.
- [ ] **Step 5: Commit**
  - `git add backend/ tests/`
  - `git commit -m "feat: implement backend scraping and storage for standings"`

## Task 3: API Endpoint e Bootstrap Server

**Files:**

- Modifica: `backend/app-route-service.js`
- Modifica: `backend/server-bootstrap-service.js`
- Modifica: `tests/app-route-service.test.js`
- Modifica: `tests/server-bootstrap-service.test.js`

- [ ] **Step 1: Scrivere test fallimentari (RED)**
  - Testare l'esistenza della rotta GET `/api/standings` che restituisca JSON
    con `driverStandings` e `constructorStandings`.
  - Testare che il server bootstrap richiami la sincronizzazione delle standings
    all'avvio.
- [ ] **Step 2: Eseguire il test per validare il fallimento**
- [ ] **Step 3: Implementare rotta e bootstrap (GREEN)**
  - Aggiungere il gestore di rotta in `app-route-service.js`.
  - Invocare la sincronizzazione in background in `server-bootstrap-service.js`
    senza bloccare l'avvio.
- [ ] **Step 4: Eseguire test (REFACTOR) e 80% Coverage**
  - Verificare rami di errore e successo.
- [ ] **Step 5: Commit**
  - `git add backend/ tests/`
  - `git commit -m "feat: expose standings API endpoint and startup sync"`

## Task 4: UI Component (StandingsPanel)

**Files:**

- Crea: `src/components/StandingsPanel.tsx`
- Modifica: `src/App.css` o `src/index.css`
- Crea: `tests/ui-standings-panel.test.tsx`

- [ ] **Step 1: Scrivere test fallimentari (RED)**
  - Creare `ui-standings-panel.test.tsx`. Testare il render corretto con mock
    props: top 3 piloti in evidenza, liste con punti e team.
- [ ] **Step 2: Eseguire il test**
- [ ] **Step 3: Implementare StandingsPanel (GREEN)**
  - Design pulito ispirato a Sky Sport: usare colori del team (`teamColors` dal
    config), posizionamenti con layout grid/flex, font app.
  - Implementare un selettore/tab (Piloti vs Scuderie) interno al componente.
  - Applicare classi CSS corrette in `App.css`.
- [ ] **Step 4: Eseguire test UI e 80% Coverage**
  - Assicurarsi che ogni interazione (click sul tab) e ramo visivo sia testato.
- [ ] **Step 5: Commit**
  - `git add src/ tests/`
  - `git commit -m "feat: create StandingsPanel UI component"`

## Task 5: Integrazione in App.tsx (Vista Pubblica)

**Files:**

- Modifica: `src/App.tsx`
- Modifica: `tests/ui-integration.test.tsx` o file UI principali.

- [ ] **Step 1: Scrivere test fallimentari (RED)**
  - Aggiungere asserzioni ai test UI per verificare che lo `StandingsPanel`
    venga renderizzato solo se abilitato, possibilmente prelevando i dati via
    `fetchWithRetry` in concomitanza con le altre chiamate inziali.
- [ ] **Step 2: Eseguire il test**
- [ ] **Step 3: Implementare l'integrazione (GREEN)**
  - In `App.tsx`, aggiungere la chiamata
    `fetchWithRetry<StandingsData>(standingsApiUrl)` nel blocco di
    `Promise.allSettled`.
  - Salvare lo stato in React state
    (`const [standings, setStandings] = useState(...)`).
  - Renderizzare `<StandingsPanel data={standings} />` condizionatamente dentro
    la dashboard principale o solo se `isPublicView` (in base ai requisiti
    visivi concordati).
- [ ] **Step 4: Eseguire test e verificare Coverage 80%**
- [ ] **Step 5: Commit**
  - `git add src/ tests/`
  - `git commit -m "feat: integrate standings in main app shell"`

## Task 6: Verifica UI e Regression Check Mobile

**Files:** Nessuna aggiunta codice, solo comandi di validazione.

- [ ] **Step 1: Eseguire check responsive**
  - Run: `npm run test:ui-responsive`
  - Expected: Nessun fallimento visuale o layout sfasato nei breakpoint
    mobile/desktop.
- [ ] **Step 2: Avviare applicazione locale**
  - Run: `./start_fantaf1.command`
  - Navigare alla vista pubblica e verificare manualmente che lo styling "Sky
    Sport style" risulti armonioso senza stonare con il resto dell'app.

---

## Coverage 80% totale

Per adempiere rigorosamente alle direttive di `AGENTS.md`, durante l'intera
esecuzione di questo piano **è fatto obbligo** che la test coverage rimanga e
venga verificata esplicitamente al **80% per statements, branches, functions e
lines** alla fine di ogni singola modifica (dopo la fase REFACTOR).

Nessun task è da considerarsi completato se il comando di validation
`npm run test` o la suite di test integrata riportano metriche inferiori al 80%
per l'intero repository. Se la coverage risulta inferiore, occorre interrompere
l'implementazione e integrare i test necessari prima di passare al task
successivo.
