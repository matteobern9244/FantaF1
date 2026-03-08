# Changelog

Cronologia sintetica delle release documentate del progetto Fanta Formula 1.

## In sviluppo

- **Baseline Coverage da Aggiornare Sempre**: `AGENTS.md` impone ora in modo esplicito l'aggiornamento automatico del baseline coverage ogni volta che una task produce un nuovo risultato verificato di release coverage, mantenendo invariati i numeri quando il risultato resta gia' al 100%.
- **Vista Pubblica Condivisibile e Insight Stagionali**: la UI espone ora `Weekend pulse`, `Analisi stagione`, guida pubblica, filtri storico e drill-down dei GP; `meeting`, `view`, `historyUser`, `historySearch` e `hash` vengono idratati dall'URL e riscritti in modo coerente per condividere la vista corrente senza concedere accesso admin via query string.
- **Analytics Stagionali Tipizzate**: introdotti summary derivati per gap leader, costanza, rendimento Sprint e recap dell'ultimo GP, calcolati dal solo storico gia' persistito senza mutare i dati di gioco.
- **Smoke Responsive Stabilizzato**: `npm run test:ui-responsive` usa ora un adapter Playwright CLI con timeout espliciti, navigazione nativa verificata, preflight fail-fast su sessioni `ui-*` residue e teardown piu' robusto senza killare processi non creati dal comando.
- **Diagnostica UI Responsive Potenziata**: in caso di shell bloccata o navigazione incoerente il comando salva summary, stato pagina, tab-list, screenshot se disponibile, log console e network in `output/playwright/ui-responsive/`, evitando timeout opachi.
- **TDD Sul Tooling Responsive**: estesa la suite `tests/ui-responsive-check.test.js` per coprire dirty-state Playwright, timeout CLI, uso di `goto`, separazione tra readiness minima e assert responsive, raccolta artefatti e ordering del cleanup.
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
