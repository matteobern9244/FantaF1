# Changelog

Cronologia sintetica delle release documentate del progetto Fanta Formula 1.

## Unreleased

- **Bootstrap Reale della Subphase 2 del Porting C#**: introdotta la solution `backend-csharp/FantaF1.Backend.sln` con i layer `Api`, `Application`, `Domain`, `Infrastructure`, tre progetti test dedicati, le astrazioni condivise del piano canonico, wiring DI minimo e bootstrap ASP.NET Core compilabile senza ancora migrare route pubbliche `/api/*`.
- **Gate di Coverage Riallineato Dopo la Stabilizzazione del Test UI Flaky**: il test `opens the YouTube highlights outside the app when the CTA is clicked` in `tests/ui-live-projection.test.tsx` usa ora una sincronizzazione robusta coerente con i test limitrofi, cosi' `npm run test:coverage` torna verde con `414 / 414` test passati e `100%` su statements, branches, functions e lines.
- **Ledger Canonico dello Stato di Porting**: [docs/backend-csharp-porting-plan.md](/Users/matteobernardini/code/FantaF1/docs/backend-csharp-porting-plan.md) include ora `Current execution ledger` come checkpoint persistente del programma di porting, con `Subphase 1` marcata `completed`, `Subphase 2` marcata `current` e `Subphase 3` indicata come prossima azione.
- **Piano Canonico C# Scomposto in 11 Subfasi Deterministiche**: il piano [docs/backend-csharp-porting-plan.md](/Users/matteobernardini/code/FantaF1/docs/backend-csharp-porting-plan.md) ora include un indice esecutivo ordinato che mappa in modo uno-a-uno `Subphase 1` ... `Subphase 11` ai nuovi documenti sotto `docs/backend-csharp-porting-subphases/`, mantenendo il file canonico come unica source of truth.
- **Nuovo Set Documentale di Subfase per il Porting Backend**: aggiunti 11 documenti in italiano con nomi file ASCII, struttura obbligatoria uniforme, ownership esclusivo per ogni area del porting, richiami espliciti ai principi di `AGENTS_migration_template.md`, coverage `100% totale`, gate browser/responsive e confini operativi senza decisioni aperte.
- **Governance del Porting Rafforzata Senza Impatto Runtime**: i nuovi documenti formalizzano branch isolation su `porting-backend-c#`, divieto di usare `fantaf1` e `fantaf1_dev`, staging `FantaF1_staging`, target `fantaf1_porting` e il vincolo che workflow futuri e legacy removal compaiano solo nella `Subphase 11`, senza introdurre alcun cambiamento a API pubbliche, payload, cookie o business logic.
- **Subphase 1 Materializzata nel Piano Canonico**: la `Requirement ownership matrix` vive ora in [docs/backend-csharp-porting-plan.md](/Users/matteobernardini/code/FantaF1/docs/backend-csharp-porting-plan.md) come artefatto canonico della `Subphase 1`, mentre [subphase-01-foundation-and-safety-rails.md](/Users/matteobernardini/code/FantaF1/docs/backend-csharp-porting-subphases/subphase-01-foundation-and-safety-rails.md) rimanda esplicitamente a quella matrice per chiudere il congelamento dei safety rails senza creare una seconda source of truth.

## v1.4.1

- **Hero Ripulita e Sfondo Gara Piu' Luminoso**: rimosso il blur dal contenitore del titolo nell'header hero e introdotto un layer dedicato per lo sfondo del weekend selezionato con luminosita' aumentata, mantenendo invariato il cambio dinamico dell'immagine in base alla gara attiva.
- **Navigation Shell Sempre Disponibile e Shortcut Rimossa**: il menu di sezione resta ora sempre visibile durante lo scroll sia su desktop sia su mobile, mentre la scorciatoia `Torna al menu` e il relativo floating control sono stati rimossi dal runtime senza alterare hash navigation, drawer mobile o comportamento admin/public.
- **CTA Installazione Sempre Visibile**: `INSTALLA APPLICAZIONE` e' ora sempre presente nei browser desktop e mobile; il click continua ad aprire il prompt nativo quando disponibile, il dialog guidato su iOS Safari e un feedback esplicito quando l'app e' gia' installata o il browser non supporta l'installazione.
- **Documentazione e Tooling Riallineati Alla Nuova UX**: README, copy centralizzato e controlli responsive descrivono ora la navigation shell persistente e la CTA installazione sempre visibile, mantenendo il repository coerente con lo stato reale della UI e con la baseline coverage verificata a `4780 / 4780` statements, `393 / 393` functions, `1999 / 1999` branches e `4780 / 4780` lines.
- **Track Map Ripristinata Anche in Vista Pubblica**: la mappa del circuito del weekend selezionato e' tornata visibile non solo nella sezione admin `Risultati del weekend`, ma anche nella vista pubblica dentro il recap hero del weekend e nel pannello `Recap ultimo GP`, mantenendo la coerenza con il `selectedRace` corrente senza toccare la logica del nuovo menu di sezione.
- **TDD Regressivo su Mappa Pubblica e Navigation Shell**: aggiunti test UI mirati per coprire la presenza della track map in vista pubblica, l'aggiornamento al cambio weekend e la tenuta della navigation shell desktop/admin-public; la coverage V8 verificata del repository e' stata riallineata a `4780 / 4780` statements, `393 / 393` functions, `1999 / 1999` branches e `4780 / 4780` lines.
- **Validazione Release Completa v1.4.1**: rieseguiti `npm run test`, `npm run lint`, `npm run build`, `npm run test:ui-responsive`, `npm run test:save-local` e `npm run test:coverage`, tutti con esito verde sullo stato finale della release.

## v1.4.0

- **Ancoraggio Destro Corretto per "Torna al menu"**: il floating control `Torna al menu` usa ora un wrapper fixed esplicitamente ancorato a destra con allineamento del bottone sul bordo destro reale; il tooltip si apre a sinistra senza spostare otticamente il target, preservando font `Formula1`, hash navigation, chiusura del drawer mobile e compatibilita' desktop/mobile anche nella build servita da Express.
- **Launcher Locale Alleggerito Sul Preflight Responsive**: `start_fantaf1.command` non esegue piu' `npm run test:ui-responsive` nel flusso monitorato di avvio; il launcher mantiene lint, test, build e smoke `test:save-local`, mentre il controllo browser responsive resta un comando esplicito separato da lanciare solo quando rilevante per la task.
- **Menu Navigazionale Responsive di Sezione Senza Regressioni Visuali**: introdotta una navigazione di sezione coerente con font e visual language esistenti; su desktop la nav e' sticky sotto l'header, mentre su mobile un trigger `Sezioni` apre un drawer laterale sinistro non invasivo, con voci filtrate per vista `admin`/`public`, chiusura su overlay o `Esc`, focus restore e compatibilita' PWA invariata.
- **Deep Link di Sezione e Stato URL Preservato**: ogni sezione principale della single-page app espone ora un `id` stabile; il frontend aggiorna l'`hash` via `history.replaceState` e usa `IntersectionObserver` per evidenziare la sezione attiva senza perdere `meeting`, `view`, `historyUser` e `historySearch` gia' presenti nell'URL condivisibile.
- **TDD Regressivo Sul Nuovo Menu Responsive**: estesi i test RTL della shell per coprire rendering desktop, drawer mobile, voci condizionali `admin`/`public`, aggiornamento dell'`hash`, chiusura del drawer e interazione con `IntersectionObserver`; estesi anche i controlli Playwright-like di `ui-responsive` per i nuovi selettori del menu.
- **Tooling Responsive Esteso ai Nuovi Pattern di Navigazione**: `scripts/ui-responsive/` valida ora la presenza delle sezioni principali, la nav desktop sotto l'header, il trigger mobile `Sezioni`, il drawer laterale sinistro e l'integrita' della CTA `INSTALLA APPLICAZIONE` accanto al nuovo menu, su mobile, tablet e desktop.
- **Scorciatoia Contestuale "Torna al Menu"**: aggiunto un controllo floating dedicato per risalire rapidamente verso la parte alta della pagina con il menu nuovamente visibile; il pulsante compare solo fuori dall'area iniziale, usa una freccia `ArrowUp`, aggiorna coerentemente l'hash della prima sezione e chiude il drawer mobile se aperto.
- **Tooltip e Tipografia Allineati al Visual Language**: il controllo `Torna al menu` espone ora un tooltip esplicito con copy centralizzato, icona visibile e font `Formula1` coerente sia sul pulsante sia sul tooltip, con verifiche automatiche dedicate anche nei controlli responsive reali.
- **Coverage Repository Riallineata Dopo la Navigation Shell**: con i nuovi rami desktop/mobile, `admin`/`public`, drawer aperto/chiuso e hash navigation, la coverage V8 ufficiale e' stata riportata e mantenuta al `100%` con baseline verificata aggiornata a `4766 / 4766` statements, `386 / 386` functions, `1968 / 1968` branches e `4766 / 4766` lines.
- **Smoke Browser Production-Like Completato**: oltre a `lint`, `test`, `test:coverage`, `build`, `test:ui-responsive` e `test:save-local`, e' stata eseguita anche una verifica browser reale in assetto `production` usando `NODE_ENV=production MONGODB_DB_NAME_OVERRIDE=fantaf1_dev npm start`, confermando nav desktop, trigger mobile `Sezioni` e drawer della build servita da Express senza cambiare target dati runtime.
- **Refactor OOP End-to-End su Calendar, Persistence, Scoring, Analytics e Runtime**: completata una conversione operativa a oggetti di dominio e service/facade object sui bounded context ancora fortemente procedurali, mantenendo invariati endpoint REST, shape dei payload persistiti, semantica di `meetingKey`, rendering UI e flussi admin/public.
- **Wave 1, Calendar/Results Backend Estratta in Service OO**: `backend/calendar.js` delega ora il recupero risultati a `RaceResultsService` e `RaceResultsCache` in `backend/race-results-service.js`, isolando cache TTL, derivazione URL ufficiali, parsing classifica, parsing pole/sprint, risoluzione `racePhase`, lookup highlights best-effort e persistenza del risultato del lookup.
- **Wave 1, Facade Frontend per Risultati Ufficiali**: il frontend non gestisce piu' inline il fetch e la normalizzazione della response dei risultati gara; `src/utils/resultsApi.ts` centralizza `fetchOfficialResults` e `normalizeOfficialResultsResponse`, mentre `src/App.tsx` consuma il facade mantenendo invariata la UX del live projection e del recap weekend.
- **Wave 1, TDD Regressivo sui Results Service**: aggiunti test dedicati ai nuovi oggetti OO backend e client per bloccare regressioni su cache, fallback, parsing risultati ufficiali e compatibilita' della response lato frontend, preservando il contratto della API `GET /api/results/:meetingKey`.
- **Wave 2, Persistence Backend Rifattorizzata in Oggetti Espliciti**: introdotto `backend/app-data-service.js` con `ParticipantRosterPolicy`, `WeekendSelectionService`, `AppDataSanitizer` e `AppDataRepository`; `backend/storage.js` e' stato ridotto a facade compatibile che delega creazione default, sanitizzazione, lettura e scrittura dell'`AppData` senza alterare la persistenza MongoDB esistente.
- **Wave 2, Weekend State Frontend Centralizzato**: introdotto `src/utils/weekendStateService.ts` per assemblare lo stato del weekend selezionato, idratare gli utenti del weekend corrente, costruire il payload persistito e gestire il fallback coerente del `selectedMeetingKey`; `src/App.tsx` e' stato alleggerito dalla logica di wiring non visuale.
- **Wave 2, Invarianti Roster e Selected Weekend Consolidati**: la normalizzazione dei tre partecipanti, il recupero del GP selezionato, il fallback al weekend successivo, la sincronizzazione tra `users`, `raceResults` e `weekendStateByMeetingKey` e la sanitizzazione dei documenti persistiti ora vivono in un punto unico testabile, evitando duplicazioni e drift tra frontend e backend.
- **Wave 2, TDD Regressivo su App Data e Weekend State**: aggiunte suite dedicate su `AppDataSanitizer`, `AppDataRepository`, assembler frontend del weekend state e facade storage per coprire hydration, payload di persistenza, fallback calendario vuoto e coerenza del selected weekend.
- **Wave 3, Scoring Trasformato in Oggetti di Dominio**: `src/utils/game.ts` delega ora a `PredictionScoringService`, `PredictionValidationService` e `RaceHistoryService` in `src/utils/gameService.ts`, separando normalizzazione prediction, calcolo punti, live totals, merge campi mancanti, ricostruzione utenti da storico e creazione dei record gara.
- **Wave 3, Analytics Estratte in Builder OO**: `src/utils/analytics.ts` delega a `UserAnalyticsBuilder` e `SeasonAnalyticsBuilder` in `src/utils/analyticsService.ts`, centralizzando KPI utente, trend, cumulative trend, hit rate per campo, consistency index, confronto stagionale, narrative della stagione e recap gara.
- **Wave 3, TDD Regressivo su Scoring e Analytics**: introdotti test dedicati sui nuovi service object per blindare punteggi reali/proiettati, ranking live, ricostruzione storico utenti, analytics stagione/utente e stabilita' del recap con output invariato rispetto al comportamento precedente.
- **Wave 4-5, Save Route Backend Portata in Service Object**: `app.js` utilizza ora `SaveRequestService` in `backend/app-route-service.js` per concentrare session check admin, verifica database con `verifyMongoDatabaseName`, validazione roster, blocco gara (`race_locked`), controllo pronostici completi, classificazione errori e costruzione delle response JSON di errore/successo.
- **Wave 4-5, Bootstrap Server OO e Wiring Runtime Snellito**: `server.js` delega a `DatabaseConnectionService`, `BackgroundSyncService` e `ServerBootstrapService` in `backend/server-bootstrap-service.js`, separando connessione Mongo, verifica nome database, bootstrap credenziali admin, sync iniziale drivers/calendario e startup del listener Express.
- **Wave 4-5, App Shell Alleggerita Senza Regressioni UI**: `src/App.tsx` mantiene il wiring della UI ma sposta fuori il fetch risultati, l'idratazione del weekend selezionato e la costruzione del payload da salvare, riducendo l'orchestrazione monolitica senza toccare visual language, testi centralizzati, flussi admin/public o comportamento mobile/desktop.
- **Facade Legacy Mantenute per Backward Compatibility**: i moduli pubblici esistenti `backend/calendar.js`, `backend/storage.js`, `src/utils/game.ts` e `src/utils/analytics.ts` continuano a esporre le stesse API del repository, ma sono ora facciate sottili sopra implementazioni OO piu' granulari e facili da testare.
- **Suite TDD Estesa per il Refactor OOP Completo**: aggiunti `tests/results-service.test.js`, `tests/results-client.test.ts`, `tests/app-data-service.test.js`, `tests/weekend-state-service.test.ts`, `tests/game-service.test.ts`, `tests/analytics-service.test.ts`, `tests/app-route-service.test.js` e `tests/server-bootstrap-service.test.js`; aggiornata inoltre `tests/storage.test.js` per coprire la facade di default app data.
- **Coverage Repository Riallineata al Nuovo Perimetro OOP**: dopo l'introduzione dei nuovi moduli e delle nuove suite, la coverage V8 verificata sull'intero scope ufficiale e' stata riportata e mantenuta al `100%`; la baseline storica descritta in questa wave e' stata poi ulteriormente aggiornata nelle implementazioni successive della stessa release fino ai valori correnti documentati sopra.
- **Validazione Finale Completa del Refactor**: rieseguiti `npm run lint`, `npm run test`, `npm run test:coverage`, `npm run build`, `npm run test:ui-responsive` e `npm run test:save-local`, tutti con esito verde, a conferma dell'assenza di regressioni funzionali, di build, di responsive layout e di persistenza locale.
- **Launcher Locale Canonico Confermato e Verificato**: `start_fantaf1.command` e' stato controllato come entrypoint monitorato del repository, confermando il preflight con lint, test, build, startup temporaneo backend/frontend, `test:ui-responsive`, `test:save-local`, cleanup processi e handoff finale a `scripts/dev-launcher.mjs`; verificata anche la sintassi shell del launcher.
- **Workflow CI/CD Confermati Allineati al Repository Reale**: i workflow `.github/workflows/pr-ci.yml`, `.github/workflows/pr-auto-merge.yml` e `.github/workflows/post-merge-health.yml` sono stati riverificati rispetto agli script e ai check reali del repository, risultando coerenti con lint, coverage, build, responsive-dev, smoke database CI e healthcheck post-merge.
- **Risultati Ufficiali Preservati Anche con Highlights KO**: il sync calendario separa ora l'arricchimento detail dal lookup highlights best-effort, conservando `meetingKey` numerico, `grandPrixTitle` e metadati ufficiali anche quando il lookup video fallisce; il fetch `GET /api/results/:meetingKey` continua cosi' a risolvere le URL Formula 1 corrette per i weekend conclusi.
- **TDD Regressivo su Sync Calendario e Results API**: aggiunti test backend dedicati al caso `detail ok + highlights fail` e al recupero dei risultati ufficiali dopo il termine gara con highlights indisponibili, mantenendo la coverage V8 al `100%`.
- **Regole Repository su Launcher Locale e CI/CD**: `AGENTS.md` e `PROJECT.md` formalizzano `start_fantaf1.command` come launcher locale canonico monitorato, impongono la chiusura dei processi app/Playwright su failure di startup, richiedono la coerenza continua dei workflow GitHub Actions con il repository e vietano esplicitamente ogni push diretto su `main`.
- **Recap Gara Finita con Titolo GP Corretto**: il parser calendario ignora ora badge Formula 1 come `Chequered Flag` e frammenti di classifica quando risolve `meetingName`; inoltre il recap del weekend concluso mostra il `grandPrixTitle` completo invece del nome breve, con test regressivi backend/UI e coverage V8 mantenuta al `100%`.
- **Workflow Post-Merge Health Corretto**: il job GitHub Actions `post-merge-health` usa ora `RENDER_HEALTHCHECK_URL` come variabile `env` a livello job per pilotare le condizioni `if:` in modo compatibile con GitHub Actions, eliminando l'errore di validazione del workflow su push e mantenendo invariato il controllo `curl` verso Render.
- **Hardening Highlights Multi-Source con Anno Stagione Dinamico**: il resolver YouTube Sky Sport F1 usa ora una pipeline OO dedicata con `feed`, `channel search`, `channel videos`, `continuation` e fallback globale, includendo l'anno della stagione della gara nella query e nel ranking per evitare match cross-season.
- **Refactor OO dell'Area Highlights**: introdotto il modulo `backend/highlights.js` con oggetti espliciti per query building, ranking candidati, validation service, lookup policy e source strategy, mantenendo invariato il contratto pubblico `highlightsVideoUrl` verso frontend e API risultati.
- **Verifiche Development e Production-Like Preview**: confermati il target `fantaf1_dev` in locale, la compatibilita' della build frontend in preview production-like e la tenuta responsive del CTA highlights su admin/public, desktop/mobile; migliorato inoltre il wrapping del pulsante nel recap del weekend selezionato.
- **TDD Regressivo e Coverage Repository Ripristinata**: aggiunti test dedicati al modulo OO highlights, al matching con anno dinamico, alle strategy multi-source e alla stabilita' del CTA UI, riportando la coverage V8 ufficiale al `100%` su statements, branches, functions e lines.
- **Policy Repository OO e Baseline Coverage Aggiornate**: `AGENTS.md` privilegia ora esplicitamente l'orientamento object-oriented quando migliora orchestrazione e separazione delle responsabilita'; aggiornata anche la baseline coverage verificata del repository a `4185 / 4185` statements, `318 / 318` functions, `1817 / 1817` branches e `4185 / 4185` lines.
- **Highlights Sky Sport Italia F1 nel Recap Weekend**: il riepilogo della gara selezionata mostra ora il pulsante `Guarda Highlights` quando il backend ha risolto un video YouTube di Sky Sport Italia F1 per un weekend concluso; in assenza del video il CTA resta visibile ma disabilitato con lo stato `Video Highlights ancora non disponibile`.
- **Lookup Highlights Automatico con Fallback Sicuro**: il backend arricchisce il calendario con `highlightsVideoUrl` sia in sync startup sia on-demand tramite sorgente pubblica YouTube, senza bloccare avvio, sync calendario o fetch risultati ufficiali in caso di assenza video o fetch esterno fallito.
- **TDD Regressivo su Highlights e Responsive Hero Recap**: aggiunti test backend, API, UI e controlli responsive dedicati per coprire lookup, persistenza best-effort, apertura esterna del video e tenuta layout del nuovo CTA su mobile e desktop, mantenendo coverage V8 al `100%`.
- **Pipeline CI/CD Pre-Merge su Main**: introdotti i workflow GitHub `pr-ci`, `pr-auto-merge` e `post-merge-health`, con check stabili `lint`, `coverage`, `build`, `responsive-dev` e `smoke-ci-db` per bloccare il merge su `main` finche' la PR non risulta completamente verde.
- **Protezione Branch Main e Auto-Merge GitHub**: formalizzato il flusso protetto verso `main` con auto-merge via Pull Request, required checks dedicati e documentazione repository allineata al deploy post-merge su Render.
- **CI MongoDB Isolata e Smoke Parametrico**: introdotto l'override centralizzato `MONGODB_DB_NAME_OVERRIDE` e reso parametrico lo smoke di persistenza per eseguire i controlli CI su un database dedicato senza toccare `fantaf1_dev` o `fantaf1`.
- **Regola `deploya` Riallineata al Flusso PR-Protetto**: `AGENTS.md` richiede ora che il deploy passi da branch push, apertura/aggiornamento PR verso `main`, attivazione dell'auto-merge e prosecuzione con tag/release solo dopo il merge completato da GitHub.
- **Validator Responsive Corretto per Vista Pubblica**: il tooling `ui-responsive` distingue ora i controlli comuni da quelli admin-only, evitando falsi positivi nella vista pubblica readonly e mantenendo obbligatorie le `select` editabili nella vista admin.
- **TDD Regressivo Sul Validator Responsive e CI**: estesi i test su risoluzione database, smoke parametrico, export server-side e validazione responsive admin/public, mantenendo il baseline coverage V8 al `100%` su statements, branches, functions e lines.

- **Dropdown Windows Resi Leggibili**: i `select` condivisi usano ora token dedicati, fondo opaco, `color-scheme: dark` e regole esplicite per `option`/`optgroup`, evitando testo invisibile o contrasto instabile nei menu nativi su Windows e PWA standalone.
- **Controlli Responsive Estesi ai Form Control**: il tooling `ui-responsive` ispeziona ora anche i dropdown chiave della UI e fallisce quando rileva testo o sfondi trasparenti sui `select` condivisi.
- **TDD Regressivo sui Dropdown Cross-Platform**: aggiunti test UI e validazioni dedicate per coprire la presenza dei dropdown nelle viste admin/public e impedire regressioni di stile sui controlli nativi.
- **Installazione PWA Mobile Riallineata**: la CTA `INSTALLA APPLICAZIONE` e' ora gestita in modo contestuale sulla shell frontend e compare in vista mobile solo quando l'app non risulta gia' installata o aperta in modalita' standalone.
- **Prompt Nativo e Flusso Guidato iOS Distinti**: sui browser che espongono `beforeinstallprompt` il pulsante usa il prompt nativo di installazione, mentre su `iPhone` e `iPad` con `Safari` apre un dialog guidato con i passaggi `Condividi -> Aggiungi a Home`, evitando percorsi morti sui browser mobile non supportati.
- **Detection Installazione Centralizzata e Sicura**: il frontend usa ora una risoluzione esplicita e testata di `display-mode: standalone`, `navigator.standalone`, viewport mobile e compatibilita' iOS Safari, azzerando la CTA anche dopo l'evento `appinstalled` senza toccare backend, persistence o logica punteggi.
- **Copy PWA e Dialog Mobile Centralizzati**: label `INSTALLA APPLICAZIONE`, messaggi toast e contenuti del dialog iOS sono stati spostati in configurazione applicativa, mantenendo il vincolo repository di assenza di stringhe applicative hardcoded nei componenti.
- **TDD Regressivo sulla PWA Mobile**: estesi i test UI per coprire prompt nativo mobile, flusso guidato iOS/Safari, assenza della CTA quando la PWA e' gia' installata e assenza della CTA su browser mobile non supportati, mantenendo coverage V8 al `100%` su statements, branches, functions e lines.
- **Documentazione README Allineata alla PWA Mobile**: il `README.md` descrive ora in modo esplicito il comportamento della CTA di installazione su Android/Chrome, iPhone/iPad Safari, stato standalone e browser mobili non compatibili.
- **Chip Stato Weekend Corretta Post-Qualifica**: la chip `PRONOSTICI ANCORA APERTI` nello strip alto viene ora nascosta per il weekend selezionato quando Formula1.com ha gia' pubblicato il risultato ufficiale di qualifica o sprint (`pole`), anche se `racePhase` e' ancora `open`.
- **Regola UI Centralizzata sul Weekend Selezionato**: il frontend usa ora un helper dedicato per distinguere il solo caso `open` realmente pre-qualifica dal caso post-qualifica del `selectedMeetingKey`, senza modificare lock server-side, flussi di salvataggio o banner `live`/`finished`.
- **TDD Regressivo Sullo Strip Alto**: estesi i test helper e UI per coprire visibilita' della chip, cambio weekend, assenza di contaminazione tra meeting diversi e protezione da risposte stale dell'endpoint risultati.
- **Stato Gara Dinamico End-to-End**: `GET /api/results/:meetingKey` restituisce ora anche `racePhase` (`open`, `live`, `finished`) mantenendo il payload flatten dei risultati ufficiali; il frontend usa lo stato backend per distinguere correttamente gara in corso e gara terminata senza alterare il lock server-side dei pronostici.
- **Backend Risultati Riallineato e Ottimizzato**: centralizzata la risoluzione di stato gara sul weekend selezionato e rimossa la lettura duplicata del calendario nel flusso risultati ufficiali, preservando compatibilita', cache e sicurezza dei flussi production-facing.
- **Copy Readonly Admin Aggiornato**: il banner della vista non admin mostra ora `Solo gli admin possono modificare i pronostici.` tramite configurazione centralizzata, senza introdurre stringhe inline o modifiche ai flussi di business.
- **README e Contratti Documentati**: aggiornata la documentazione per esplicitare la separazione tra `race lock` e `racePhase`, il criterio di completamento gara basato sui risultati ufficiali e il payload reale dell'endpoint risultati.
- **Protocollo AGENTS Rafforzato su Coverage e Piani**: `AGENTS.md` richiede ora in modo esplicito copertura totale al `100%`, strategia `RED -> GREEN -> REFACTOR` mostrata nei piani e riepilogo finale con verifica coverage eseguita.
- **Coverage Race Lock Portata al 100%**: estesi i test API sul fallback `endDate` del messaggio `race_locked` e aggiunta una suite isolata per coprire il fallback difensivo `unknown` in `app.js`, mantenendo invariato il comportamento runtime e il baseline coverage ufficiale a `100%`.
- **Cleanup Conservativo con Snapshot Locale Integrale**: creata una snapshot completa del working tree locale prima del cleanup operativo e rimossi i residui locali rigenerabili (`.playwright-cli`, `output`, `screenshot`, log locali, `.DS_Store`) insieme ai residui file-based legacy in `F1Result/`.
- **Launcher Locale Forzato in Development**: `start_fantaf1.command` e `scripts/dev-launcher.mjs` impongono ora esplicitamente `NODE_ENV=development`, cosi' il bootstrap locale resta allineato in modo deterministico a `fantaf1_dev` anche quando l'ambiente chiamante o `.env` espongono valori incoerenti.
- **Hardening TDD dello Stack Responsive Locale**: `scripts/ui-responsive/diagnostics.mjs` forza a sua volta `development` per il bootstrap del check browser reale; aggiunti test dedicati sul launcher e sul caricamento env del tooling responsive per coprire il caso regressivo `production` ereditato dal parent process.
- **Rimozione Asset Orfani di Scaffold e Branding Legacy**: eliminati gli asset non piu' referenziati `src/assets/react.svg`, `src/assets/pitstop.png`, `src/assets/tire.png`, `public/vite.svg` e `public/tire.png`, mantenendo invariati il loader attuale, gli asset PWA e il percorso di deploy su Render.
- **Centralizzazione Stringhe Applicative e Runtime**: introdotti entrypoint dedicati per il copy frontend (`src/uiText.ts`) e backend (`backend/text.js`), con estensione di `config/app-config.json` per spostare testi UI, messaggi runtime e messaggistica backend fuori dai componenti e dai flussi server principali.
- **Regola Persistente No Hardcoded Strings + TDD**: `AGENTS.md` ora impone esplicitamente la centralizzazione delle stringhe applicative e l'uso obbligatorio del ciclo RED/GREEN/REFACTOR per fix, modifiche e nuove implementazioni; la stessa preferenza e' stata registrata anche nella memoria globale di Codex dell'utente.
- **Refactor Modulare del Check Responsive**: `scripts/ui-responsive-check.mjs` e' stato ridotto a wrapper CLI; bootstrap stack locale, adapter Playwright, validazione stato, scenari, diagnostica e cleanup vivono ora in moduli dedicati sotto `scripts/ui-responsive/`.
- **Baseline Coverage da Aggiornare Sempre**: `AGENTS.md` impone ora in modo esplicito l'aggiornamento automatico del baseline coverage ogni volta che una task produce un nuovo risultato verificato di release coverage, mantenendo invariati i numeri quando il risultato resta gia' al 100%.
- **Vista Pubblica Condivisibile e Insight Stagionali**: la UI espone ora `Weekend pulse`, `Analisi stagione`, guida pubblica, filtri storico e drill-down dei GP; `meeting`, `view`, `historyUser`, `historySearch` e `hash` vengono idratati dall'URL e riscritti in modo coerente per condividere la vista corrente senza concedere accesso admin via query string.
- **Analytics Stagionali Tipizzate**: introdotti summary derivati per gap leader, costanza, rendimento Sprint e recap dell'ultimo GP, calcolati dal solo storico gia' persistito senza mutare i dati di gioco.
- **Smoke Responsive Stabilizzato**: `npm run test:ui-responsive` usa ora un adapter Playwright CLI con timeout espliciti, navigazione nativa verificata, preflight fail-fast su sessioni `ui-*` residue e teardown piu' robusto senza killare processi non creati dal comando.
- **Diagnostica UI Responsive Potenziata**: in caso di shell bloccata o navigazione incoerente il comando salva summary, stato pagina, tab-list, screenshot se disponibile, log console e network in `output/playwright/ui-responsive/`, evitando timeout opachi.
- **TDD Sul Tooling Responsive**: la suite monolitica responsive e' stata spezzata in test dedicati per stack locale, adapter Playwright, validazione, scenari e runner, mantenendo la copertura su dirty-state Playwright, timeout CLI, `goto`, readiness minima, artefatti e ordering del cleanup.
- **Hover/Focus Surface Unificati**: i nuovi riquadri KPI, analytics, storico e confronto stagione riusano ora lo stesso feedback visuale interattivo gia' presente negli altri riquadri dell'app, con coerenza tra vista admin e vista pubblica.
- **Coverage Estesa Allo Scope Applicativo Ufficiale**: il perimetro coverage include ora `app.js`, `server.js`, tutto `backend/**/*.js` e tutti i file applicativi `src/**/*.ts(x)`, mantenendo il 100% su statements, functions, branches e lines.
- **Hardening Browser Admin/Public/Mobile/Desktop**: il controllo responsive valida ora anche la sanita' delle API di bootstrap, distingue stack locale parziale da stack realmente pronta e verifica il toggle admin/public su tutti i breakpoint principali.

## v1.3.12

- **Auth Reale Admin/Public**: introdotte sessioni admin firmate via cookie HTTP-only, endpoint `GET /api/session`, `POST /api/admin/session` e `DELETE /api/admin/session`, con default `public` in production e `admin` in development.
- **Dashboard KPI e Analytics Estese**: introdotti KPI utente, analytics deep-dive, storico mobile piu' compatto, toast UX e CTA PWA senza modificare i payload pubblici principali.
- **Roster Dinamico da Database**: eliminato l'hardcoding runtime dei nomi giocatore; validazione e riordino usano ora il roster persistito nell'ultimo `appdata.users`, mantenendo fallback neutrale solo su database vuoto.
- **Rimozione Completa Weekend Boost**: eliminati scoring bonus, route dedicate, stato per-weekend, campi storage/schema e pannelli UI del boost, con script `migrate:remove-weekend-boost` per ripulire i documenti legacy.
- **Hardening Server-Side**: rafforzate la validazione partecipanti e la sanitizzazione storage per impedire save semanticamente invalidi.
- **Coverage e Regressioni Verificate**: validati `vitest` con coverage `100%`, `lint`, `build` e smoke `test:save-local` sullo stato finale della release `v1.3.12`; controllo `test:ui-responsive` esplicitamente saltato in deploy su override manuale.

## v1.3.11

- **Hotfix Build Render Deterministica**: aggiunto `.npmrc` con `include=dev` per garantire anche in ambiente build la presenza di TypeScript, Vite e dei type package React necessari alla compilazione frontend.
- **Documentazione Deploy Allineata**: aggiornata la sezione Render del `README.md` per esplicitare che il repository forza l'installazione delle `devDependencies` durante la build ed evitare regressioni dovute a configurazioni implicite della piattaforma.
- **Release Validation Completa**: riprodotto il failure con installazione production-like senza devDependencies e validati poi `build`, `lint` e `vitest` dopo l'hotfix prima della release `v1.3.11`.

## v1.3.10

- **Set Icone Browser e PWA Riallineato**: favicon, `apple-touch-icon`, icone `192x192`, `512x512` e `maskable` usano ora il set grafico reale fornito in `IMMAGINIDAUSARE`, pubblicato nei path statici standard dell'app.
- **Loader Iniziale Aggiornato**: il caricamento iniziale non usa piu' la combinazione `pitstop` + `tire`; mostra invece il logo splash `FantaF1` coerente con il nuovo branding visuale.
- **Asset Splash Preparati per la Shell**: aggiunti gli asset statici `ios-splash-screen.png` e `splash-logo-only.png` per mantenere coerente la shell browser/PWA senza introdurre wiring iOS multi-device extra.
- **Disciplina Deploy Formalizzata**: `AGENTS.md` documenta ora il trigger esplicito `deploya`, con workflow di release obbligatorio e failure policy deterministica.
- **Regressioni Coperte e Release Validation Completa**: aggiunti test statici sugli asset PWA/browser e test UI sul loader; validati `vitest`, coverage `100%`, `lint` e `build` prima della release `v1.3.10`.

## v1.3.9

- **Recupero Risultati Ufficiali Riallineato per Tutti i Weekend**: `GET /api/results/:meetingKey` costruisce ora gli URL Formula1.com nel formato canonico `.../results/<year>/races/<meetingKey>/<slug>/...`, cosi' qualifying, race-result e sprint-results tornano ad aggiornarsi correttamente anche per i weekend futuri.
- **Riepilogo Risultati Hero Piu' Leggibile**: Nel riquadro dei risultati del weekend selezionato i piloti sono mostrati come `Nome Cognome`, mantenuti su una sola riga quando il viewport desktop lo consente e con fallback responsive sicuro su mobile.
- **Regressioni Coperte da Test Mirati**: Estesi i test backend sugli URL ufficiali esatti di Formula1.com e i test UI sul hero card dei risultati selezionati, mantenendo invariato il formato `Cognome Nome` nel resto dell'app.
- **Release Validation Completa**: Validati `lint`, suite `vitest`, `build`, `test:ui-responsive` e `test:save-local` sullo stack locale di sviluppo prima della preparazione della release `v1.3.9`.

## v1.3.8

- **Sincronizzazione Pronostici per Weekend**: I pronostici e i risultati correnti vengono ora persistiti per `meetingKey` tramite `weekendStateByMeetingKey`, cosi' il cambio weekend riallinea subito tutta la UI al draft corretto del weekend selezionato.
- **Preservazione Dati Legacy e Race Lock Corretto**: Backend, storage e validazione ricostruiscono i dati legacy nel weekend corretto e applicano save manuale e race lock solo al weekend selezionato, senza sovrascrivere i draft degli altri weekend.
- **Placeholder e Reset Coerenti per Weekend Vuoti**: Un weekend senza pronostici salvati mostra nuovamente `Seleziona un pilota`, mentre il reset pulisce e salva solo il weekend attivo.
- **Launcher Locale Stabilizzato**: Il launcher integrato non chiude piu' backend e frontend per falsi negativi sul rilevamento della finestra Chrome, eliminando i `Failed to fetch` intermittenti durante il lavoro locale.
- **Suite di Test e Smoke Estesa**: Aggiunti test regressivi su stato per-weekend, migrazione backend, launcher locale e switch weekend; lo smoke responsive copre anche il cambio weekend e il viewport iPhone 16 Pro Max.

## v1.3.7

- **Proiezioni Live Riallineate**: Il tab `Pronostici dei giocatori` e la `Classifica live` usano ora in modo coerente il weekend selezionato e la stessa proiezione ufficiale del weekend corrente.
- **Parsing Risultati Formula1.com Aggiornato**: Il backend non dipende piu' da `data-driver-id`; legge la tabella HTML corrente di Formula1.com, supporta `race-result`, `qualifying` e `sprint-results`, e restituisce campi vuoti quando la fonte ufficiale espone `No results available`.
- **Cache Read-Only per Risultati Ufficiali**: Introdotta una cache in-memory a TTL corto sull'endpoint `GET /api/results/:meetingKey` per sostenere il polling live senza scritture automatiche su database e senza moltiplicare le richieste upstream.
- **Chiarezza UX su Risultati Ufficiali**: Quando i risultati ufficiali non esistono ancora, la UI espone un messaggio esplicito invece di mostrare solo `0`; quando i risultati sono parziali, segnala chiaramente che proiezione e classifica live sono parziali.
- **Regressioni Coperte da Test**: Estesi test unitari, API e UI su scoring live, parser risultati, cache TTL, stati `none/partial/complete` e riallineamento del weekend selezionato.
- **Documentazione Allineata**: Aggiornati `README.md` e `CHANGELOG.md` per riflettere il recupero read-only dei risultati ufficiali, il polling live del weekend selezionato e il nuovo stato UI per risultati assenti o parziali.

## v1.3.6

- **Hotfix Save Manuale Pronostici**: Il pulsante `Salva dati inseriti` ora richiede solo la presenza di almeno un pronostico compilato e accetta anche stati completamente compilati.
- **Endpoint Dedicato**: Introdotto `POST /api/predictions` per applicare la regola del save manuale senza alterare i flussi di persistenza generica usati da reset, conferma risultati e storico.
- **Allineamento Full-Stack**: Aggiornati validatori frontend/backend, messaggistica UI ed error code stabile `predictions_missing`.
- **TDD Regressivo e Coverage**: Estesi test unitari, API e UI per coprire save vuoto, save valido con almeno un campo, race lock, persistenza generica invariata e casi limite di validazione.
- **Documentazione Tecnica Allineata**: Aggiornati `README.md` e `PROJECT.md` per riflettere il nuovo contratto di salvataggio, la distinzione tra salvataggio manuale e persistenza generica e i vincoli di coerenza release.
- **Disciplina Operativa di Release**: Rafforzate in `AGENTS.md` le regole di TDD, validazione completa e sincronizzazione obbligatoria tra changelog, versioni applicative e stato reale della release.

## v1.3.5

- **Inversione Logica di Validazione**: Il salvataggio dei pronostici è ora consentito **esclusivamente** per stati parzialmente compilati (almeno un campo compilato e almeno uno vuoto).
- **Hardening Validazione**: Gli stati "tutti vuoti" o "tutti completi" sono ora considerati non validi e vengono bloccati sia dal frontend che dal backend per forzare un flusso di inserimento incrementale.
- **Aggiornamento UI**: Aggiornato il messaggio di alert per riflettere con precisione il nuovo requisito di validazione.
- **Suite di Test**: Aggiornati i test unitari (`game.test.ts` e `validation.test.js`) per coprire la nuova logica (TDD), garantendo che gli stati estremi (tutti vuoti/pieni) falliscano correttamente.

## v1.3.4

- Separata l'applicazione Express in `app.js` per isolare la logica delle rotte dall'avvio del server, migliorando la testabilità.
- Introdotta una nuova suite di test di integrazione API utilizzando `supertest`.
- Introdotta una suite di test dei componenti React tramite `jsdom` e `@testing-library/react`.
- Formalizzato il protocollo TDD (Test-Driven Development) come standard obbligatorio per ogni modifica al repository.
- Risolti conflitti di ambiente tra test Node.js e JSDOM, garantendo la compatibilità della suite completa.
- **Hardening Database**: Implementata la risoluzione dinamica del database tramite `MONGODB_URI`. Il backend ora estrae il nome del database dal path della URI e verifica all'avvio che coincida esattamente con quello atteso per l'ambiente (`fantaf1_dev` in locale, `fantaf1` in produzione), prevenendo errori di connessione accidentali.
- **Error Handling Avanzato**: Introdotto un sistema di tracciamento degli errori con `requestId` e codici specifici (es. `race_locked`, `participants_invalid`), migliorando drasticamente la diagnosi dei problemi e la sicurezza dei dati.
- **Automazione CI/CD Locale**: Lo script `start_fantaf1.command` e il launcher locale sono stati potenziati. Ora eseguono una suite completa di pre-volo: Lint, Unit Test, Build, Test UI Responsive e Smoke Test di salvataggio prima dell'apertura effettiva dell'app.
- **Controllo Responsive Automatizzato**: Aggiunto lo script `ui-responsive-check.mjs` (Playwright) che valida automaticamente 5 breakpoint (Mobile, Tablet, Laptop, Desktop, Desktop-XL), garantendo l'assenza di overflow o clipping del testo.
- **Consolidamento Ambiente**: Eliminazione di `.env.local` a favore di un unico file `.env` per semplificare la configurazione tra locale e produzione.
- **Semplificazione UI**: Rimossa l'indicazione dell'Admin dall'intestazione dei pronostici, ora semplificata in "Pronostici dei giocatori".
- Titolo hero reso deterministico su due righe quando `VITE_APP_LOCAL_NAME` estende il titolo base: prima riga `Fanta Formula 1`, seconda riga con il suffisso configurato.
- Il titolo hero usa ora un fit reale basato sulla larghezza del contenitore: mantiene il massimo visivo sui desktop larghi e riduce il `font-size` solo quanto necessario per evitare clipping su viewport medi e piccoli.
- Introdotta la utility `src/utils/title.ts` per centralizzare la scomposizione del titolo hero e riusare una logica coerente tra runtime e test.
- Aggiunti test unitari specifici sul parsing del titolo hero e ripristinata la coverage globale allo standard del repo sullo scope configurato (`100%` lines/statements/functions, branch sopra soglia).
- Formalizzato in `AGENTS.md` e `PROJECT.md` l'obbligo di aggiornare sempre `CHANGELOG.md` per ogni nuova versione applicativa, tag git o release GitHub.

## v1.3.3

- Riallineata e ampliata la documentazione tecnica e di business logic nel `README.md` per riflettere con precisione il comportamento reale del repository.
- Estratto il changelog operativo dal `README.md` in un file dedicato `CHANGELOG.md`, mantenendo la cronologia separata dalla documentazione evergreen.
- Aggiornata la sezione release per indicare `v1.3.3` come versione in produzione e mantenere coerenti versione applicativa, footer UI, tag e release GitHub.
- Rimosso l'asset inutilizzato `src/assets/flag.png`, che non era referenziato dal codice ed era in realta' contenuto HTML non valido.

## v1.3.2

- Coverage del layer di business logic e utils portata al massimo standard del progetto, con 117 test totali, 100% su lines/functions/statements e una suite estesa su parsing, formattazione temporale, storage MongoDB e failure di rete per prevenire regressioni.
- Rimossi i riferimenti hard-coded all'anno corrente: frontend, backend, titolo e test usano ora l'anno di sistema in modo dinamico.
- La card "Prossimo weekend" mostra il programma completo delle sessioni con orari sincronizzati in tempo reale.
- Introdotto un sistema di icone dinamiche (`Timer`, `Zap`, `FastForward`, `Flag`) per distinguere visivamente prove libere, qualifiche, sprint e gara.
- Formattazione date e orari raffinata sullo standard italiano `Giorno dd/MM/yyyy HH:mm` e localizzazione piu' coerente dell'intero calendario weekend.
- Track map ingrandita, centrata e ottimizzata per una resa ad alta definizione.
- Loader "Pit Stop 2.0" rivisto con animazioni piu' fluide e messaggi di stato dinamici.
- Restyling UI "Pro" di livello piu' avanzato, con glassmorphism, glow neon e animazioni piu' fluide per un'impostazione visiva piu' immersiva e coerente con il linguaggio Formula 1.
- Rimossi i vecchi riferimenti alle cache locali legacy di piloti e calendario, con persistenza ormai interamente appoggiata a MongoDB Atlas.
- Ottimizzazione tipografica con revisione dell'uso del font Formula 1 nelle card e nelle etichette per migliorare la leggibilita'.
- Riorganizzati i controlli di reset e salvataggio dei pronostici per una disposizione piu' coerente sotto la griglia dei giocatori.
- Pulsanti principali resi full-width per migliorare accessibilita' e coerenza tra desktop e mobile.
- Migliorata l'automazione del launcher locale, inclusa la gestione intelligente di apertura, chiusura e riassetto della finestra Chrome durante stop e riavvio dell'app.

## v1.3.1

- Risolto il problema dei pulsanti di reset e salvataggio in produzione su Render, rendendo piu' flessibile la validazione lato server per accettare anche nomi partecipanti personalizzati gia' presenti nel database.
- Spostata la sincronizzazione iniziale di piloti e calendario in background all'avvio del server, riducendo il rischio di timeout in deploy.
- Corretti i problemi di parsing delle date su mobile e Safari per mantenere affidabili lock gara e gestione weekend.
- Corretta una regressione sui nomi dei partecipanti durante modifica o cancellazione dello storico, preservando i nomi personalizzati nei ricalcoli.
- Migliorata l'estrazione del nome database dalla URI MongoDB Atlas per rendere piu' stabile la connessione in ambienti cloud.

## v1.3.0

- Risolta una race condition logica nel frontend che poteva mostrare un salvataggio riuscito in anticipo rispetto alla persistenza reale.
- Il reset dei pronostici correnti azzera i dati e li salva immediatamente nel database.
- Introdotto il modulo di validazione backend dedicato `backend/validation.js`.
- Rafforzata in modo significativo la suite di test automatizzati, arrivando alla milestone dei 54 test passanti del ciclo di release.
- Migliorato il parsing del calendario, incluso il supporto agli eventi di un solo giorno e una maggiore resilienza del recupero dati.

## v1.2.1

- Aggiornata la versione applicativa a `1.2.1` e riallineato il changelog del progetto.
- Centrato il footer dell'applicazione.
- Riallineati i controlli dell'area pronostici per una disposizione piu' coerente.

## v1.2.0

- Migrazione completa a MongoDB Atlas per dati di gioco, cache piloti e calendario, con impostazione cloud-ready per locale e produzione.
- Integrazione visuale con nuovi asset grafici principali, inclusi `pitstop.png`, `tire.png` e l'asset storico `flag.png`.
- Rafforzata la validazione server-side su salvataggi, partecipanti e blocco temporale delle gare.
- Migliorato il process management locale tramite launcher piu' robusto e migliore gestione dell'apertura browser.
- Aggiornamento del backend per la piena compatibilita' con Express 5 e risoluzione dei problemi critici di routing/catch-all.
- Inserimento del numero di versione nel footer dell'applicazione.

## v1.1.0

- Introdotta la classifica live con proiezioni dei punti durante il weekend di gara.
- Implementato il blocco automatico dei pronostici all'orario ufficiale di inizio gara.
- Aggiunto il recupero automatico dei risultati reali a fine weekend.
- Introdotto il salvataggio manuale dei pronostici con validazione di completezza per tutti i partecipanti.
- Rafforzata l'ottimizzazione backend con meccanismi di retry per sincronizzazione calendario e roster piloti.
- Introdotti loader tematico Pit Stop e font Formula 1 personalizzati nell'interfaccia.
