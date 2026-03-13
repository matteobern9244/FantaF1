# Fanta Formula 1

Applicazione full-stack privata per gestire un Fanta Formula 1 con frontend React + TypeScript + Vite, backend Express e persistenza MongoDB.

L'applicazione e' pensata per un flusso amministrato: un admin seleziona il weekend, inserisce i pronostici dei tre partecipanti, registra o recupera i risultati reali e consolida i punti nello storico.

## Stato release e confronto con la produzione

La versione attualmente in produzione e pubblicata e' `v1.4.4`. Il repository e' allineato alla stessa release `v1.4.4` in `package.json`, senza delta pendenti tra codice versionato e baseline live.

### Baseline produzione `v1.4.4`

La baseline live corrisponde alle capability gia' rilasciate e documentate in `CHANGELOG.md` sotto `v1.4.4`:

- navigation shell responsive con menu desktop/mobile, deep link di sezione e shortcut contestuale per tornare rapidamente in cima;
- refactor OO di calendario, persistenza, scoring, analytics e bootstrap runtime;
- sessioni admin/public reali, analytics stagionali, CTA installazione PWA e recap highlights;
- validazione release con `lint`, `test`, `test:coverage`, `build`, `test:ui-responsive` e `test:save-local`.

### Delta del workspace corrente rispetto a `v1.4.4`

Il workspace corrente e' allineato alla produzione `v1.4.4`; non risultano delta funzionali non rilasciati rispetto alla baseline live. Le capability rilevanti della release corrente sono:

- ristrutturazione completa della navigazione con spostamento del menu all'interno dell'header, sotto il titolo della stagione;
- navigazione fluida su dispositivi mobili tramite barra a scorrimento orizzontale nativa e rimozione del Drawer (hamburger menu), risolvendo i bug di visibilità mobile;
- menu mobile ottimizzato: rimossa la classe `.panel` per una trasparenza elegante e introdotto gradiente di mascheramento laterale per indicare lo scroll;
- ottimizzazione performance: eliminato il jank durante lo scorrimento fluido su dispositivi mobili tramite l'uso di `IntersectionObserver` in luogo dei global event listeners sincroni e la disattivazione del `backdrop-filter` in mobile;
- fix regressione dropdown mobile: ripristinato l'aspetto nativo delle select su smartphone per garantire il corretto posizionamento dei menu opzioni;
- fix architetturale mappa circuito: il `Recap ultimo GP` visualizza ora la mappa specifica della gara conclusa recuperandola dal calendario, indipendentemente dalla selezione corrente;
- affinamento delle classifiche reali pubbliche: `Classifica piloti` usa avatar Formula1 più nitidi con crop orientato al volto, mentre `Classifica scuderia` è stata riallineata con logo ufficiale, nome squadra colorato e rimozione del vecchio marker lineare;
- ottimizzazione del layout standings pubbliche: il riquadro `Classifica scuderia` resta nella colonna destra su desktop ma non viene più allungato artificialmente, eliminando il grande spazio vuoto interno e mantenendo lo stacking invariato su tablet e mobile;
- integrazione della CTA `INSTALLA APPLICAZIONE` come ultima voce della lista di navigazione unificata;
- shortcut contestuale `Torna al menu` raffinata: la freccia flottante ancora ora lo scroll direttamente alla barra di navigazione nell'header;
- ripristino della track map del circuito anche nella vista pubblica, sia nel recap hero del weekend selezionato sia nel pannello `Recap ultimo GP`;
- hero iniziale riallineata con rimozione del blur dal contenitore del titolo e con sfondo dinamico della gara selezionata reso piu' luminoso;
- test regressivi e controlli responsive aggiornati per coprire la nuova UX e la navigazione fluida;
- baseline coverage verificata mantenuta al 100% su statements, functions, branches e lines;
- validazione finale completa rieseguita con `test:ui-responsive`, `test:save-local` e `npm run build`.

In sintesi: produzione e repository sono ora riallineati sulla stessa release `v1.4.4`.

## Panoramica funzionale

- Lo stato di gioco mantiene sempre esattamente 3 partecipanti.
- I nomi dei partecipanti sono data-driven: backend e UI usano il roster gia' persistito nel database, senza nomi hardcoded a runtime.
- I pronostici prevedono 4 campi per ogni utente: primo, secondo, terzo e pole oppure vincitore Sprint.
- Il salvataggio manuale dei pronostici richiede almeno un campo compilato. Lo stato "tutti vuoti" non e' valido per `Salva dati inseriti`, mentre uno stato completamente compilato e' consentito.
- Il backend blocca le modifiche ai pronostici dopo l'inizio ufficiale della gara del weekend selezionato.
- La conferma dei risultati e l'assegnazione punti sono possibili solo quando la gara e' considerata conclusa e tutti i risultati reali sono presenti.
- Lo storico gare puo' essere modificato o eliminato; in entrambi i casi la classifica totale viene ricalcolata.

## Regole di gioco e flusso operativo

### Pronostici

Per ogni weekend selezionato l'admin gestisce 4 pronostici per ciascun partecipante:

- vincitore della gara;
- secondo classificato;
- terzo classificato;
- pole position oppure vincitore Sprint nei weekend Sprint.

Il flusso previsto e' questo:

1. si seleziona il weekend dal calendario;
2. si compilano i pronostici dei tre utenti;
3. si salva lo stato corrente con `Salva dati inseriti`;
4. a gara conclusa si inseriscono o si recuperano i risultati reali;
5. si confermano i risultati per consolidare i punti nello storico.

### Validazione salvataggio pronostici

Il salvataggio manuale dei pronostici accetta qualsiasi stato che contenga almeno un pronostico compilato. Il payload e' valido solo se:

- Esiste almeno un campo compilato (per evitare salvataggi vuoti inutili).

Questo comportamento vale sia lato frontend sia lato backend tramite l'endpoint dedicato `POST /api/predictions`. Lo stato "tutti vuoti" viene quindi rifiutato per il salvataggio diretto dei pronostici correnti, mentre lo stato completamente compilato resta valido.
I flussi di persistenza interni dell'applicazione (`reset`, conferma risultati, ricalcolo storico) continuano invece a usare `POST /api/data`, che accetta anche uno stato corrente con pronostici vuoti quando generato intenzionalmente dall'app.

### Race lock

Il blocco gara e' applicato server-side.

- Se il weekend ha `raceStartTime`, quello e' l'orario usato per il lock.
- Se `raceStartTime` manca, viene usato il fallback `endDate + 14:00:00Z`.
- Dopo il lock, il backend rifiuta la richiesta solo se i pronostici correnti sono stati modificati rispetto a quelli gia' persistiti.

Di conseguenza:

- non e' possibile alterare i pronostici dopo l'inizio ufficiale della gara;
- e' ancora possibile salvare stato non regressivo che non modifica i pronostici bloccati.

### Risultati reali e assegnazione punti

Per il weekend selezionato l'applicazione distingue due concetti separati:

- `race lock`: i pronostici si bloccano all'orario ufficiale di partenza della gara;
- `racePhase`: stato user-facing del weekend (`open`, `live`, `finished`) derivato dal backend.

Quando il weekend selezionato ha risultati reali correnti incompleti:

- il frontend prova subito a recuperarli automaticamente tramite `GET /api/results/:meetingKey`;
- durante un weekend attivo continua a fare polling periodico finche' i risultati ufficiali restano incompleti;
- il recupero automatico non parte durante una modifica dello storico;
- i risultati ufficiali recuperati riempiono solo i campi ancora vuoti e non sovrascrivono valori manuali o gia' presenti;
- se Formula1.com non ha ancora pubblicato risultati ufficiali, l'app mantiene i campi vuoti e mostra un messaggio esplicativo sia nella classifica live sia nei pronostici;
- se Formula1.com ha pubblicato solo una parte dei risultati ufficiali, la proiezione resta parziale e l'interfaccia lo segnala;
- se il fetch non produce dati validi, l'admin puo' comunque inserire i risultati manualmente.

Il pulsante di conferma risultati resta disabilitato finche' non sono vere entrambe le condizioni:

- backend in stato `racePhase=finished` per il weekend selezionato;
- risultati reali completi in tutti i 4 campi.

Alla conferma:

- viene creato un record storico per il weekend;
- per ogni utente vengono calcolati i punti guadagnati in base ai match esatti sui 4 campi;
- i punti vengono sommati al totale utente;
- i pronostici correnti e i risultati correnti vengono azzerati;
- se non si e' in modalita' modifica, il weekend selezionato avanza al prossimo weekend disponibile.

### Punteggio e classifica live

La scoring logic attuale e' configurata cosi':

- 5 punti per il primo posto corretto;
- 3 punti per il secondo posto corretto;
- 2 punti per il terzo posto corretto;
- 1 punto per pole position o Sprint corretti.

Non esistono mezzi punti o bonus impliciti: i punti vengono assegnati solo per corrispondenza esatta del singolo campo.

La classifica live mostrata nell'hero non rappresenta solo i punti storici. Per ogni utente visualizza:

- punti storici gia' consolidati;
- piu' la proiezione ottenuta confrontando i pronostici correnti con i risultati reali correnti.

Il tab `Pronostici dei giocatori` mostra la stessa proiezione del solo weekend selezionato.
Quando i risultati ufficiali non esistono ancora, l'interfaccia non interpreta lo `0` come "nessun match": espone invece uno stato esplicito `nessun risultato ufficiale disponibile`.
Quando i risultati ufficiali sono solo parziali, sia il tab pronostici sia la classifica live mostrano una proiezione parziale coerente con i soli campi gia' pubblicati.

## Business logic applicativa

### Selezione weekend e stato iniziale

Lo stato applicativo usa `selectedMeetingKey` come riferimento principale del weekend attivo.

Quando l'app carica o sanitizza lo stato:

- se `selectedMeetingKey` corrisponde a un weekend esistente, viene usato quel weekend;
- altrimenti il sistema prova a risolvere il GP tramite il nome;
- se anche questo fallisce, viene selezionato il prossimo weekend disponibile in calendario;
- se il calendario e' vuoto, lo stato resta senza weekend selezionato.

Questo comportamento vale sia lato frontend sia lato backend quando viene ricostruito lo stato persistito.

I pronostici correnti e i risultati correnti sono persistiti per weekend tramite `weekendStateByMeetingKey`.
Quando si cambia weekend, la UI rilegge immediatamente i dati del weekend selezionato:

- se esiste un draft salvato per quel weekend, mostra quel draft;
- se non esiste alcun draft, i campi tornano vuoti e la select mostra `Seleziona un pilota`.

### Reset pronostici

L'azione `Reset pronostici correnti`:

- azzera i 4 campi pronostico per tutti gli utenti;
- azzera i risultati reali correnti del weekend;
- persiste immediatamente il nuovo stato nel database.

Non e' una semplice pulizia locale della UI: e' un salvataggio effettivo dello stato corrente.

### Modifica e cancellazione storico

Lo storico non e' solo consultabile.

#### Cancellazione

Quando una gara storica viene eliminata:

- il record viene rimosso dallo storico;
- il totale punti utenti viene ricostruito partendo dallo storico residuo;
- i nomi utente correnti vengono preservati.

#### Modifica

Quando una gara storica viene messa in modifica:

- il record viene temporaneamente rimosso dallo storico;
- la classifica viene ricalcolata senza quella gara;
- i pronostici originali di quella gara vengono ricaricati nei campi utente;
- i risultati reali originali vengono ricaricati nella sezione risultati;
- il weekend relativo viene risolto di nuovo dal calendario tramite `meetingKey` o nome GP;
- al salvataggio, il record aggiornato viene reinserito nello storico nella posizione originaria.

Se la modifica viene annullata:

- il record originale viene ripristinato nello storico;
- i punti vengono ricostruiti;
- i campi correnti vengono riportati a uno stato coerente con il weekend ripristinato.

### Sanitizzazione e persistenza stato

Il backend non persiste mai il payload grezzo del frontend.

Prima di salvare:

- normalizza i pronostici mancanti o malformati;
- normalizza i punti utente a valori numerici validi;
- tronca o ricostruisce gli utenti per mantenere sempre 3 partecipanti;
- sanitizza lo storico gara per gara;
- riallinea `gpName` e `selectedMeetingKey` al calendario disponibile.

Se il database non contiene ancora stato applicativo, il backend costruisce uno stato di default usando il prossimo weekend disponibile.

## Funzionalita' implementate

### Interfaccia

- Hero full-width con branding, titolo visibile configurabile, anno corrente dinamico e card riepilogative.
- Il contenitore del titolo hero non usa blur di backdrop; il focus visivo resta affidato a glow, contrasto e gerarchia tipografica gia' presenti.
- Il titolo principale della hero renderizza sempre bianco pieno su macOS, Windows e browser mobile/desktop, senza gradiente testuale, per evitare differenze di resa cross-platform.
- Se `VITE_APP_LOCAL_NAME` estende il titolo base `Fanta Formula 1`, la hero separa il titolo in due righe fisse: titolo base in prima riga e suffisso in seconda.
- Il titolo hero usa un fit basato sulla larghezza reale del contenitore: sui desktop wide mantiene il massimo visivo corrente, mentre su viewport piu' strette riduce il `font-size` solo quanto necessario per restare interamente visibile senza clipping.
- Lo sfondo hero del weekend selezionato continua a cambiare dinamicamente in base alla gara attiva e applica una luminosita' aumentata sul solo layer immagine per mantenere leggibilita' invariata sui contenuti in primo piano.
- Card "Prossimo weekend" con badge Sprint/Standard, programma sessioni e orari formattati in italiano.
- Classifica live calcolata come punti storici piu' proiezione del weekend selezionato, con stato esplicito per risultati ufficiali assenti o parziali.
- Modalita' `public` e `admin` separate, con login admin via sessione, link condivisibile della vista corrente e pannelli operativi esposti solo quando la sessione e' valida.
- Navigazione di sezione coerente con il visual language esistente e sempre disponibile durante lo scroll: su desktop il menu resta fisso sotto l'header, mentre su mobile compare un trigger discreto `Sezioni` che apre un drawer laterale sinistro con le sole sezioni disponibili per la vista corrente.
- Calendario stagionale con selettore e strip orizzontale dei weekend.
- Griglia pronostici per i 3 partecipanti con selezione piloti ordinati per cognome e visualizzati come `Cognome Nome`.
- Hero results card del weekend selezionato con nomi pilota visualizzati come `Nome Cognome`; dropdown e liste di selezione restano invece in formato `Cognome Nome`.
- Hero results card del weekend selezionato con CTA Highlights YouTube di Sky Sport Italia F1 per i weekend conclusi: se il video e' disponibile il pulsante apre il contenuto all'esterno della SPA, altrimenti resta visibile ma disabilitato con messaggio di indisponibilita'.
- Sezione risultati del weekend con track map, recupero automatico read-only dei risultati ufficiali, merge solo dei campi mancanti e pulsante conferma con tooltip di stato.
- Vista pubblica con track map coerente col weekend selezionato sia nel recap hero del weekend sia nel pannello `Recap ultimo GP`, mantenendo la stessa mappa anche nella sezione admin `Risultati del weekend`.
- Storico gare modificabile con ricalcolo dei punteggi, filtri per giocatore/GP e drill-down dei pronostici dettagliati; il podio reale mostra foto pilota, nome reale in formato naturale, data della gara su riga separata sotto il titolo e lo stesso effetto hover grafico delle altre card interattive dell'app.
- Le classifiche reali pubbliche mostrano ora avatar piloti Formula1 promossi a una variante hi-res con focus sul volto e, per le scuderie, logo ufficiale accanto al nome colorato con il colore team già presente nei dati.
- Dashboard KPI per utente, analytics deep-dive, pannello `Analisi stagione`, riepilogo `Weekend pulse`, guida pubblica, storico mobile piu' compatto, status strip, toast operativi e CTA installazione PWA.
- Loader iniziale con splash logo `FantaF1`, set icone browser/PWA dedicato (`favicon`, `apple-touch-icon`, `192x192`, `512x512`, `maskable`) e layout responsive desktop/mobile.

### Installazione PWA

La shell frontend espone sempre il pulsante `INSTALLA APPLICAZIONE` nei browser desktop e mobile, mantenendolo visibile anche durante lo scroll insieme alla navigation shell.

- Su browser che espongono `beforeinstallprompt` il pulsante apre il prompt di installazione nativo della PWA.
- Su `iPhone` e `iPad` con `Safari`, dove il prompt nativo non e' disponibile, il pulsante apre un dialog guidato con i passaggi `Condividi -> Aggiungi a Home`.
- Se l'app e' gia' installata o sta girando in `display-mode: standalone`, la CTA resta visibile ma mostra un feedback esplicito che conferma lo stato gia' installato.
- Browser senza prompt nativo e senza flusso supportato mantengono la CTA visibile e mostrano un messaggio informativo, evitando percorsi morti lato utente.

### URL condivisibile della vista

La shell frontend mantiene sincronizzato nell'URL lo stato consultivo della vista corrente, cosi' da poter condividere direttamente il contesto aperto.

- `meeting` seleziona il weekend attivo.
- `view=public` forza solo la vista pubblica; una query `view=admin` non concede accesso operativo se la sessione non e' admin.
- `historyUser` e `historySearch` ripristinano i filtri dello storico.
- L'eventuale `hash` viene preservato e usato per lo scroll iniziale alla sezione richiesta; la navigazione di sezione aggiorna l'URL via `history.replaceState` senza perdere `meeting`, `view` e filtri storico gia' presenti.

Quando l'utente cambia weekend, vista o filtri storico, il frontend aggiorna l'URL via `history.replaceState` senza ricaricare la pagina.

### Logica di gioco

- Configurazione punteggi centralizzata: 5 punti primo, 3 punti secondo, 2 punti terzo, 1 punto pole/Sprint.
- Race lock server-side basato su `raceStartTime`, con fallback a `endDate + 14:00:00Z` se l'orario non e' disponibile.
- Stato gara user-facing centralizzato lato backend: `open` prima della partenza, `live` dopo la partenza senza classificazione ufficiale completa, `finished` quando Formula1.com pubblica la classifica gara ufficiale completa.
- Reset dei pronostici correnti con salvataggio persistente immediato.
- Conservazione dei nomi utente gia' persistiti durante modifica o cancellazione di gare storiche.
- Il roster ufficiale non arriva piu' dal config nominale: il backend usa il roster gia' persistito nell'ultimo stato valido del database e lo riapplica in validazione e salvataggio.

## Architettura

### Documentazione e Standard Operativi

Il repository segue standard ingegneristici rigorosi per garantire la sicurezza dei dati di produzione e la manutenibilità a lungo termine. Questi standard sono formalizzati in tre file mandatori che ogni agente (AI o umano) deve seguire:

- `AGENTS.md`: Contratto ingegneristico generale (TDD, workflow, sicurezza, qualità del codice).
- `PROJECT.md`: Verità specifica del progetto FantaF1 (vincoli di business, integrità dei dati, aree ad alto rischio).
- `GEMINI.md`: Direttive operative specifiche per l'automazione e il ciclo di vita dell'applicazione nel repository.

L'applicazione di questi standard garantisce un approccio "production-safe" e una validazione continua tramite un ciclo rigoroso di test e build.

### Frontend

- SPA React 18 + TypeScript + Vite.
- Il frontend usa API relative (`/api/...`) per compatibilita' locale e produzione.
- `src/App.tsx` resta il container UI principale, ma parte della logica non visuale e' stata estratta in facade e assembler dedicati come `src/utils/resultsApi.ts`, `src/utils/weekendStateService.ts`, `src/utils/gameService.ts` e `src/utils/analyticsService.ts`.
- Il titolo visualizzato nell'hero usa `VITE_APP_LOCAL_NAME` se valorizzata, altrimenti il titolo base definito nel config applicativo.
- Quando l'override hero inizia con il titolo base e aggiunge un suffisso, il frontend lo rende in due righe stabili per preservare leggibilita' e coerenza visiva.
- Il titolo hero usa un fit `container-based`: il `font-size` resta al massimo corrente quando la prima riga entra nel pannello e si riduce solo quando la larghezza utile non basta, indipendentemente dal breakpoint.
- Il titolo della scheda browser e' invece impostato in `index.html` come `FantaF1 <anno corrente>`.

### Backend

- Server Express 5 con `cors`, `express.json()` e `dotenv`.
- L'applicazione Express è definita in `app.js` per consentire test di integrazione, mentre `server.js` gestisce l'avvio e la connessione al database.
- Il wiring runtime usa ora service object piccoli e testabili per i flussi piu' sensibili: `backend/race-results-service.js`, `backend/app-data-service.js`, `backend/app-route-service.js` e `backend/server-bootstrap-service.js`.
- Espone API REST, serve gli asset statici di `dist` e usa un catch-all per il routing SPA.
- Si connette prima al database, poi avvia il server HTTP e infine esegue in background la sincronizzazione di piloti e calendario.
- In produzione il server ascolta su `0.0.0.0` e usa `PORT` se fornita dall'ambiente.
- Le mutazioni admin sono protette da sessione cookie HTTP-only firmata con `ADMIN_SESSION_SECRET`; le route read-only restano pubbliche.

### Persistenza

- MongoDB tramite `mongoose`.
- Il backend gestisce tre insiemi logici di dati:
  - stato globale del gioco;
  - cache roster piloti;
  - cache calendario weekend.
- Il frontend non usa `localStorage` per i dati core del gioco.

## Sorgenti esterne e sincronizzazione

### Roster piloti

- Fonte primaria: StatsF1.
- Arricchimento media e fallback secondario: Formula1.com.
- Se il sync fallisce, il backend usa la cache MongoDB dei piloti.
- Se la cache e' vuota ma la pagina piloti di Formula1.com e' disponibile, il backend costruisce un roster di fallback e lo salva.

### Calendario

- Fonte primaria: pagine stagione e dettaglio gara di Formula1.com.
- Il backend prova fino a 3 tentativi prima di degradare alla cache.
- Il parsing del dettaglio gara arricchisce ogni weekend con:
  - `meetingKey`;
  - `grandPrixTitle`;
  - immagine hero;
  - track outline;
  - badge Sprint;
  - `raceStartTime`;
  - lista sessioni con orari ISO.
- Se il dettaglio di un singolo weekend fallisce, il backend mantiene comunque i dati base del calendario.

### Risultati gara

- Endpoint interno: `GET /api/results/:meetingKey`.
- Il backend costruisce gli URL risultati Formula1.com a partire da `detailUrl` e `meetingKey` del weekend salvato in cache, usando il formato `.../results/<year>/races/<meetingKey>/<slug>/...`.
- Per weekend standard recupera gara e qualifying.
- Per weekend Sprint recupera gara e sprint-results.
- Il parser legge la tabella HTML corrente di Formula1.com ed estrae 1°, 2°, 3° e bonus pole/Sprint dalle prime righe ufficiali disponibili.
- Se la pagina ufficiale riporta `No results available`, l'endpoint restituisce tutti i campi vuoti.
- I risultati ufficiali sono messi in cache in memoria con TTL corto per supportare il polling live senza moltiplicare le richieste verso Formula1.com.

## API backend

### `GET /api/health`

Restituisce:

- `status`
- `year`
- `dbState`
- `environment`
- `databaseTarget`

Usato dal launcher locale e dai controlli di health.

### `GET /api/data`

Restituisce lo stato globale del gioco:

- utenti;
- storico;
- GP selezionato;
- risultati correnti;
- `selectedMeetingKey`;
- `weekendStateByMeetingKey`.

### `GET /api/session`

Restituisce lo stato sessione runtime:

- `isAdmin`;
- `defaultViewMode`.

### `POST /api/admin/session`

Crea la sessione admin dopo verifica password e imposta il cookie HTTP-only firmato.

### `DELETE /api/admin/session`

Invalida subito la sessione admin e rimuove il cookie.

### `POST /api/data`

Salva lo stato globale del gioco dopo sanitizzazione e validazione per i flussi generici dell'applicazione.

Comportamenti rilevanti:

- `400` se il numero di partecipanti non e' quello atteso;
- `403` se la gara e' iniziata e i pronostici correnti vengono modificati;
- `500` in caso di errore persistente di salvataggio.
- In caso di errore il payload include sempre `error`, `code` e `requestId`.
- `details` viene esposto solo fuori da production, per rendere diagnosticabili i fallimenti locali senza esporre stack in deploy.

### `POST /api/predictions`

Salva manualmente i pronostici correnti con le stesse verifiche di partecipanti e race lock di `POST /api/data`, aggiungendo il vincolo di contenere almeno un pronostico compilato.

Comportamenti rilevanti:

- `400` con `code=predictions_missing` se tutti i campi pronostico sono vuoti;
- `400` se il numero di partecipanti non e' quello atteso;
- `403` se la gara e' iniziata e i pronostici correnti vengono modificati;
- `500` in caso di errore persistente di salvataggio.

### `GET /api/drivers`

Restituisce il roster piloti ordinato alfabeticamente lato backend.

### `GET /api/calendar`

Restituisce il calendario ordinato per round.

### `GET /api/results/:meetingKey`

Recupera i risultati reali del weekend a partire dalla cache calendario.

Comportamenti rilevanti:

- restituisce sempre un payload con `first`, `second`, `third`, `pole` e `racePhase`;
- `racePhase` vale:
  - `open` prima del `raceStartTime`
  - `live` dopo il `raceStartTime` ma senza classifica gara ufficiale completa
  - `finished` quando Formula1.com ha pubblicato `first`, `second` e `third`;
- se Formula1.com non ha ancora pubblicato risultati ufficiali, i campi restano stringhe vuote;
- il fetch e' read-only e non persiste automaticamente nulla nel database;
- il backend applica una cache in-memory a TTL corto per proteggere il polling live del frontend.

## Modello dati applicativo

### Stato gioco

Lo stato persistito contiene:

- `users`
- `history`
- `gpName`
- `raceResults`
- `selectedMeetingKey`
- `weekendStateByMeetingKey`

Ogni utente contiene:

- `name`
- `predictions`
- `points`

Ogni record storico contiene:

- `gpName`
- `meetingKey`
- `date`
- `results`
- `userPredictions`

Ogni `userPredictions[name]` storico contiene:

- `prediction`
- `pointsEarned`

### Weekend di gara

Ogni weekend puo' includere:

- `meetingKey`
- `meetingName`
- `grandPrixTitle`
- `roundNumber`
- `dateRangeLabel`
- `detailUrl`
- `heroImageUrl`
- `trackOutlineUrl`
- `isSprintWeekend`
- `startDate`
- `endDate`
- `raceStartTime`
- `sessions`

## Variabili ambiente

### Obbligatorie

- `MONGODB_URI`
  - stringa di connessione MongoDB usata dal backend;
  - puo' includere direttamente il nome del database nel path della URI;
  - se assente il server termina in fase di bootstrap.
- `ADMIN_SESSION_SECRET`
  - segreto usato per firmare e verificare la sessione admin;
  - in produzione va impostato esplicitamente con una stringa lunga e casuale;
  - se cambia, le sessioni admin esistenti diventano invalide.

### Opzionali

- `PORT`
  - porta HTTP del backend;
  - in locale il default e' `3001`.
- `NODE_ENV`
  - controlla il targeting del database (`fantaf1_dev` in development, `fantaf1` in production) e il default `viewMode`;
  - in development l'app apre in modalita' admin, in production in modalita' pubblica.
- `VITE_APP_LOCAL_NAME`
  - override del titolo visualizzato nell'hero del frontend;
  - se estende il titolo base `Fanta Formula 1`, la hero lo divide in due righe: base title sopra, suffisso sotto;
  - viene letta da Vite a build-time per il bundle frontend;
  - in produzione richiede rebuild/redeploy per avere effetto.

### Precedenza locale

Il launcher locale carica:

1. variabili di processo correnti;
2. `.env`.

In assenza di un database nel path della URI, l'ambiente locale punta sempre a `fantaf1_dev`.
Se `MONGODB_URI` contiene gia' un database nel path, quel nome deve essere coerente con l'ambiente locale.

## Avvio locale

### Prerequisiti

- Node.js compatibile con il progetto.
- Dipendenze installate con `npm install`.
- MongoDB raggiungibile tramite `MONGODB_URI`.
- Google Chrome installato in `/Applications/Google Chrome.app` se si usa il launcher integrato.
- Runtime locale canonico di default: `node-dev`.
- Target locali supportati:
  - `node-dev` -> backend Node `127.0.0.1:3001`, frontend Vite `127.0.0.1:5173`, database atteso `fantaf1_dev`
  - `csharp-dev` -> host ASP.NET Core same-origin `127.0.0.1:3002`, database atteso `fantaf1_porting`
  - `csharp-staging-local` -> host ASP.NET Core same-origin `127.0.0.1:3003`, environment `Staging` locale, database atteso `fantaf1_porting`
- La `MONGODB_URI` locale deve essere presente e coerente con il target selezionato; gli script locali riscrivono il database target solo per i runtime C# verso `fantaf1_porting`.

### Modalita' sviluppo separate

- `npm run dev:backend`
- `npm run dev:frontend`

Il frontend Vite gira su `127.0.0.1:5173` e usa proxy `/api` verso `127.0.0.1:3001`.
Il backend verifica in startup che `MONGODB_URI` sia allineata con `fantaf1_dev`.

### Modalita' integrata consigliata

- `npm run start:local`
- `./start_fantaf1.command`
- `./clean_google_chrome.command`

Lo script integrato:

- forza esplicitamente `NODE_ENV=development`;
- usa `FANTAF1_LOCAL_RUNTIME=node-dev` come default monitorato e consente i target C# solo tramite opt-in esplicito;
- esegue `npm run lint`, `npm run test`, `npm run build` e `npm run test:save-local`;
- esegue uno smoke reale di lettura/scrittura sul target locale selezionato prima dell'avvio finale;
- verifica le porte richieste dal target locale selezionato;
- avvia backend e frontend nel caso `node-dev`, oppure l'host same-origin ASP.NET Core nei target C#;
- attende gli health check locali;
- apre Chrome in modalita' app sul frontend;
- prova a massimizzare la finestra;
- chiude i processi se uno dei child fallisce o, quando la finestra Chrome e' rilevabile, se la finestra viene chiusa.

Il controllo browser `npm run test:ui-responsive` resta disponibile come verifica esplicita separata per task con impatto UI/responsive, ma non fa piu' parte del preflight automatico di `./start_fantaf1.command`.
Esempi:

- `./start_fantaf1.command` -> target canonico `node-dev`
- `FANTAF1_LOCAL_RUNTIME=csharp-dev ./start_fantaf1.command`
- `FANTAF1_LOCAL_RUNTIME=csharp-staging-local ./start_fantaf1.command`

### Ripristino rapido di Google Chrome

Se Google Chrome non si apre correttamente dopo esecuzioni Playwright o altri tool di automazione locali, il repository include:

- `./clean_google_chrome.command`

Lo script:

- chiude solo i processi Chrome di automazione riconoscibili collegati a profili `playwright_chromiumdev_profile-*` o a `chrome-devtools-mcp`;
- non modifica il launcher principale `./start_fantaf1.command`;
- rilancia Google Chrome da `/Applications/Google Chrome.app`;
- esegue un controllo breve per verificare che Chrome sia tornato attivo.

## Deploy su Render

### Configurazione servizio

- Build command: `npm install && npm run build`
- Il repository forza l'installazione delle `devDependencies` anche durante la build tramite `.npmrc`, per garantire su Render la presenza della toolchain TypeScript/Vite e dei type package React necessari alla compilazione frontend.
- Start command: `npm start`

### Variabili da configurare

- `MONGODB_URI` obbligatoria.
- `MONGODB_URI` deve puntare a `.../fantaf1`.
- `ADMIN_SESSION_SECRET` obbligatoria e privata.
- `NODE_ENV=production` raccomandata per allineare cookie sicuri, DB target e modalita' iniziale.
- `PORT` normalmente gestita dalla piattaforma.
- `VITE_APP_LOCAL_NAME` opzionale se si vuole un titolo hero personalizzato anche in produzione.

### Comportamento in produzione

- Express serve i file statici generati in `dist`.
- In produzione il backend richiede che la configurazione risolva a `fantaf1`, leggendo il path di `MONGODB_URI` o, se assente, il fallback ambiente.
- Dopo la connessione al database il server parte subito e sincronizza piloti e calendario in background, evitando di bloccare lo startup su sorgenti lente.

## Qualita' tecnica

### Comandi disponibili

- `npm run lint`
- `npm run test`
- `npm run test:coverage`
- `npm run test:csharp-coverage`
- `npm run test:save-local`
- `npm run test:ui-responsive`
- `npm run build`
- `npm run preview`
- `npm run migrate:remove-weekend-boost`

### Lint

- ESLint configurato per frontend TypeScript/React, backend Node e suite test.
- Ignore principali: `dist`, `coverage`, `.playwright-cli`.

### Test

- Runner: Vitest.
- Coverage provider: V8.
- Baseline coverage verificata corrente sullo scope ufficiale del repository/applicazione:
  - `5167 / 5167` statements
  - `407 / 407` functions
  - `2093 / 2093` branches
  - `5167 / 5167` lines
- Coverage ufficiale verificata corrente del backend C# sullo scope `backend-csharp/src/`:
  - `2928 / 2928` lines
  - `1649 / 1649` branches
  - `487 / 487` methods
  - `70` file inclusi nel riepilogo ufficiale
- Scope coverage configurato:
  - `app.js`
  - `server.js`
  - `backend/**/*.js`
  - `src/**/*.ts`
  - `src/**/*.tsx`
- Esclusioni coverage:
  - `backend/config.js`
  - `backend/models.js`
  - `src/types.ts`
  - `src/vite-env.d.ts`
- Soglie attuali:
  - `lines: 100`
  - `functions: 100`
  - `branches: 100`
  - `statements: 100`

La suite copre business logic, storage MongoDB, sanitizzazione, parsing di piloti e calendario, risultati, formattazione UI e regressioni sui flussi principali.
Include test di integrazione API (tramite `supertest` su `app.js`) e test dei componenti UI (tramite `jsdom` e `React Testing Library`).
Include anche test unitari dedicati allo split deterministico del titolo hero e ai fallback responsive del titolo configurato.
Include test dedicati alla live projection del weekend selezionato, agli stati UI `nessun risultato ufficiale` / `risultati parziali`, al parser risultati Formula1.com corrente e alla cache TTL di `GET /api/results/:meetingKey`.
Per la UI e' disponibile anche `npm run test:ui-responsive`, che usa Playwright CLI via `npx` contro l'app locale avviata e verifica i breakpoint principali, il box "Prossimo weekend", il tooltip risultati, l'assenza di overflow orizzontali fuori dal carosello calendario e la coerenza tra vista admin e vista pubblica.
Il controllo responsive verifica anche la presenza del menu corretto per breakpoint: nav desktop persistente nelle viewport larghe, trigger `Sezioni` e drawer laterale sinistro su mobile, coerenza delle voci admin/public e assenza di regressioni sulla CTA `INSTALLA APPLICAZIONE`, che deve restare visibile in viewport.
Il comando esegue un preflight fail-fast sull'ambiente Playwright: se trova sessioni responsive residue (`ui-*`) o una CLI non reattiva, interrompe il run senza killare processi non creati da lui e riporta le istruzioni di bonifica manuale.
Su errori di navigazione o shell UI bloccata raccoglie artefatti diagnostici in `output/playwright/ui-responsive/` (summary, stato pagina, tab-list, screenshot se disponibile, console e network log) per distinguere facilmente tra regressione UI, splash bloccata e sessione Playwright incoerente.
Per il salvataggio locale e' disponibile `npm run test:save-local`, che per default usa `node-dev`, legge `/api/data`, re-invia lo stesso payload su `POST /api/data`, verifica environment/database target attesi e controlla che lo stato resti invariato dopo il round-trip. Lo stesso smoke puo' essere rieseguito in modo esplicito su `csharp-dev` e `csharp-staging-local` con `SAVE_SMOKE_TARGET=...`, includendo login admin e riuso del cookie nel target production-like locale. Questo smoke test copre il canale di persistenza generica, non il salvataggio manuale dei pronostici su `POST /api/predictions`.
Per la CI e' disponibile anche `npm run test:coverage`, mentre lo smoke di persistenza puo' essere eseguito sul database isolato di pipeline impostando `MONGODB_DB_NAME_OVERRIDE`, `SAVE_SMOKE_EXPECTED_ENVIRONMENT` e `SAVE_SMOKE_EXPECTED_DATABASE_TARGET` senza toccare `fantaf1_dev`, `fantaf1` o `fantaf1_porting`.
Per il backend C# e' disponibile `npm run test:csharp-coverage`, comando ufficiale che esegue la raccolta coverlet sui test unit/integration/contract, filtra `obj/` e generated code, limita lo scope a `backend-csharp/src/` e scrive il riepilogo verificabile in `backend-csharp/TestResults/OfficialCoverage/Summary.txt` e `backend-csharp/TestResults/OfficialCoverage/summary.json`.
L'ultimo riepilogo ufficiale verificato per il backend C# chiude a `100%` su linee, branch e metodi per tutti i `70` file inclusi nello scope `backend-csharp/src/`.
Per una verifica browser production-like coerente con il guardrail sul database, il repository supporta anche l'avvio con `NODE_ENV=production MONGODB_DB_NAME_OVERRIDE=fantaf1_dev npm start`, mantenendo runtime `production` ma puntando in modo esplicito al database locale di sviluppo per smoke desktop/mobile della build servita da Express.
Per ripulire documenti legacy che contengono ancora campi del `Weekend Boost` e' disponibile `npm run migrate:remove-weekend-boost`, script idempotente che riscrive gli `AppData` del database corrente in forma sanificata.

## CI/CD GitHub

### Obiettivo

- `main` e' il branch protetto di rilascio.
- Ogni integrazione verso `main` deve passare da Pull Request.
- L'auto-merge GitHub puo' chiudere la Pull Request solo quando tutti i check richiesti sono verdi.
- Il deploy Render resta post-merge su `main`, quindi non parte da workflow di PR.

### Workflow previsti

- `.github/workflows/pr-ci.yml`: esegue `lint`, `coverage`, `build`, `responsive-dev` e `smoke-ci-db` sulle Pull Request verso `main`.
- `.github/workflows/pr-auto-merge.yml`: arma l'auto-merge `squash` per PR non draft verso `main` provenienti dallo stesso repository, senza bypassare la protezione del branch.
- `.github/workflows/post-merge-health.yml`: esegue un controllo health opzionale dopo i push su `main`.

### Secret e variabili GitHub richiesti

- `MONGODB_URI_CI`: URI MongoDB dedicata alla pipeline CI.
- `ADMIN_SESSION_SECRET_CI`: secret admin dedicato alla pipeline CI.
- `RENDER_HEALTHCHECK_URL`: URL health pubblico del deploy Render, usato solo dal workflow post-merge opzionale.

### Protezione richiesta per `main`

- push diretti bloccati;
- merge consentito solo via Pull Request;
- required status checks allineati ai job `lint`, `coverage`, `build`, `responsive-dev`, `smoke-ci-db`;
- branch up-to-date richiesta prima del merge;
- conversation resolution richiesta;
- auto-merge attivo;
- force-push e deletion disattivati.

## Struttura del repository

- `src/`: frontend React, costanti, tipi e utility UI.
- `backend/`: parsing esterno, validazione, storage e modelli Mongoose.
- `app.js`: definizione dell'applicazione Express per il testing.
- `server.js`: entry point per l'avvio del server.
- `config/`: configurazione applicativa centralizzata.
- `scripts/`: launcher locale e migrazioni operative one-shot.
- `tests/`: test unitari e fixture HTML.
- `public/`: font e asset statici serviti dal frontend.

## Changelog

La cronologia delle release e delle implementazioni documentate e' disponibile in [CHANGELOG.md](CHANGELOG.md).
