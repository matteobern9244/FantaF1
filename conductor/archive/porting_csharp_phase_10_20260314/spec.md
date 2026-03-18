# Track Specification: Porting C# - Fase 10 (Docker, Render Staging, Atlas)

## Obiettivo

L'obiettivo di questa track è operazionalizzare l'infrastruttura per il porting
del backend C#. Questo include la containerizzazione tramite Docker, il
provisioning automatizzato dei database MongoDB Atlas (`fantaf1_porting` e
`fantaf1_staging`) e la configurazione guidata del servizio di staging su Render
(`FantaF1_staging`).

## Compliance Obbligatoria (AGENTS.md)

Tutti i task e le fasi di questa track devono rispettare rigorosamente le
specifiche tecniche e di programmazione contenute nel file `AGENTS.md`.

1. **TDD:** Ogni modifica comportamentale deve seguire il ciclo **RED -> GREEN
   -> REFACTOR**.
2. **Coverage 100%:** La copertura dei test deve essere mantenuta al 100%
   (Statements, Functions, Branches, Lines) per tutto lo scope interessato
   (inclusi gli script di automazione e le build del Dockerfile).
3. **Politica di Chiarimento:** In caso di dubbi tecnici o ambiguità nei
   requisiti, l'agente deve fermarsi e chiedere SEMPRE chiarimenti all'utente.
4. **Sicurezza dei Dati:** Non è ammessa alcuna mutazione sui database `fantaf1`
   o `fantaf1_dev`. Solo `fantaf1_porting` e `fantaf1_staging` sono target
   validi.

## Ambito Tecnico

### 1. Automazione Atlas

- Sviluppo di uno script JavaScript (`scripts/atlas-provisioning.mjs`) per
  creare database, collection e indici compatibili con lo schema Mongoose
  esistente.
- Il provisioning deve coprire: `appdatas`, `drivers`, `weekends`,
  `standingscaches`, `admincredentials`.

### 2. Dockerizzazione Multi-Stage

- Creazione di `backend-csharp/Dockerfile`.
- **Stage 1 (React Build):** Build degli asset frontend tramite Node.
- **Stage 2 (.NET Build):** Ripristino, test e pubblicazione del backend C#.
- **Stage 3 (Final Image):** Immagine stateless che serve gli asset React e le
  API dallo stesso origin.

### 3. Deploy Staging Render (`FantaF1_staging`)

- Configurazione guidata passo-passo del servizio Render.
- Inserimento delle variabili d'ambiente: `ASPNETCORE_ENVIRONMENT=Staging`,
  `MONGODB_URI`, `ADMIN_SESSION_SECRET`, `PORT`.
- Configurazione dell'Health check su `/api/health`.

## Criteri di Accettazione

1.  Lo script di provisioning Atlas completa con successo la creazione delle
    collection senza errori.
2.  L'immagine Docker viene costruita localmente e supera i test di avvio
    same-origin.
3.  Il servizio `FantaF1_staging` è raggiungibile su Render e risponde
    correttamente a `/api/health`.
4.  Tutte le route migrate (Fasi 1-7) mostrano parità funzionale nell'ambiente
    di staging.
5.  La copertura test del backend C# rimane al 100%.

## Out of Scope

- Certificazione finale e cutover (demandati alla Fase 11).
- Modifica dei workflow CI/CD del `main`.
