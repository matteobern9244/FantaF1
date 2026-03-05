# Fanta Formula 1

Applicazione full-stack privata per gestire un Fanta Formula 1 con frontend React + TypeScript + Vite, backend Express e persistenza MongoDB.

L'applicazione e' pensata per un flusso amministrato: un admin seleziona il weekend, inserisce i pronostici dei tre partecipanti, registra o recupera i risultati reali e consolida i punti nello storico.

## Panoramica funzionale

- Lo stato di gioco mantiene sempre esattamente 3 partecipanti.
- I pronostici prevedono 4 campi per ogni utente: primo, secondo, terzo e pole oppure vincitore Sprint.
- Il salvataggio dei pronostici e' consentito solo quando tutti i campi sono vuoti oppure tutti i campi sono completi.
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

Il salvataggio dei pronostici non accetta stati parziali. Il payload e' valido solo in due casi:

- tutti i campi pronostico di tutti gli utenti sono vuoti;
- tutti i campi pronostico di tutti gli utenti sono compilati.

Questo comportamento vale sia lato frontend sia lato backend, dove il payload viene sanitizzato prima della persistenza.

### Race lock

Il blocco gara e' applicato server-side.

- Se il weekend ha `raceStartTime`, quello e' l'orario usato per il lock.
- Se `raceStartTime` manca, viene usato il fallback `endDate + 14:00:00Z`.
- Dopo il lock, il backend rifiuta la richiesta solo se i pronostici correnti sono stati modificati rispetto a quelli gia' persistiti.

Di conseguenza:

- non e' possibile alterare i pronostici dopo l'inizio ufficiale della gara;
- e' ancora possibile salvare stato non regressivo che non modifica i pronostici bloccati.

### Risultati reali e assegnazione punti

L'applicazione considera la gara conclusa circa 2.5 ore dopo l'orario di inizio gara.

Quando il weekend e' finito e i risultati reali correnti sono ancora vuoti:

- il frontend prova a recuperarli automaticamente tramite `GET /api/results/:meetingKey`;
- il recupero automatico non parte durante una modifica dello storico;
- se il fetch non produce dati validi, l'admin puo' comunque inserire i risultati manualmente.

Il pulsante di conferma risultati resta disabilitato finche' non sono vere entrambe le condizioni:

- gara considerata conclusa;
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

## Business logic applicativa

### Selezione weekend e stato iniziale

Lo stato applicativo usa `selectedMeetingKey` come riferimento principale del weekend attivo.

Quando l'app carica o sanitizza lo stato:

- se `selectedMeetingKey` corrisponde a un weekend esistente, viene usato quel weekend;
- altrimenti il sistema prova a risolvere il GP tramite il nome;
- se anche questo fallisce, viene selezionato il prossimo weekend disponibile in calendario;
- se il calendario e' vuoto, lo stato resta senza weekend selezionato.

Questo comportamento vale sia lato frontend sia lato backend quando viene ricostruito lo stato persistito.

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
- Se `VITE_APP_LOCAL_NAME` estende il titolo base `Fanta Formula 1`, la hero separa il titolo in due righe fisse: titolo base in prima riga e suffisso in seconda.
- Il titolo hero usa un fit basato sulla larghezza reale del contenitore: sui desktop wide mantiene il massimo visivo corrente, mentre su viewport piu' strette riduce il `font-size` solo quanto necessario per restare interamente visibile senza clipping.
- Card "Prossimo weekend" con badge Sprint/Standard, programma sessioni e orari formattati in italiano.
- Classifica live calcolata come punti storici piu' proiezione del weekend selezionato.
- Calendario stagionale con selettore e strip orizzontale dei weekend.
- Griglia pronostici per i 3 partecipanti con selezione piloti ordinati per cognome e visualizzati come `Cognome Nome`.
- Sezione risultati del weekend con track map, caricamento automatico risultati quando disponibili e pulsante conferma con tooltip di stato.
- Storico gare modificabile con ricalcolo dei punteggi.
- Loader tematico "Pit Stop", font F1 vendorizzati localmente e layout responsive desktop/mobile.

### Logica di gioco

- Configurazione punteggi centralizzata: 5 punti primo, 3 punti secondo, 2 punti terzo, 1 punto pole/Sprint.
- Race lock server-side basato su `raceStartTime`, con fallback a `endDate + 14:00:00Z` se l'orario non e' disponibile.
- Fine gara stimata a `raceStartTime + 2.5h` per sbloccare il recupero automatico dei risultati e l'assegnazione definitiva dei punti.
- Reset dei pronostici correnti con salvataggio persistente immediato.
- Conservazione dei nomi utente gia' persistiti durante modifica o cancellazione di gare storiche.

## Architettura

### Frontend

- SPA React 18 + TypeScript + Vite.
- Il frontend usa API relative (`/api/...`) per compatibilita' locale e produzione.
- Il titolo visualizzato nell'hero usa `VITE_APP_LOCAL_NAME` se valorizzata, altrimenti il titolo base definito nel config applicativo.
- Quando l'override hero inizia con il titolo base e aggiunge un suffisso, il frontend lo rende in due righe stabili per preservare leggibilita' e coerenza visiva.
- Il titolo hero usa un fit `container-based`: il `font-size` resta al massimo corrente quando la prima riga entra nel pannello e si riduce solo quando la larghezza utile non basta, indipendentemente dal breakpoint.
- Il titolo della scheda browser e' invece impostato in `index.html` come `FantaF1 <anno corrente>`.

### Backend

- Server Express 5 con `cors`, `express.json()` e `dotenv`.
- Espone API REST, serve gli asset statici di `dist` e usa un catch-all per il routing SPA.
- Si connette prima al database, poi avvia il server HTTP e infine esegue in background la sincronizzazione di piloti e calendario.
- In produzione il server ascolta su `0.0.0.0` e usa `PORT` se fornita dall'ambiente.

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
- Il backend costruisce gli URL risultati Formula1.com a partire dal `detailUrl` del weekend salvato in cache.
- Per weekend standard recupera gara e qualifying.
- Per weekend Sprint recupera gara e sprint-results.
- Il parser estrae i codici pilota dai `data-driver-id` della pagina risultati.

## API backend

### `GET /api/health`

Restituisce:

- `status`
- `year`
- `dbState`

Usato dal launcher locale e dai controlli di health.

### `GET /api/data`

Restituisce lo stato globale del gioco:

- utenti;
- storico;
- GP selezionato;
- risultati correnti;
- `selectedMeetingKey`.

### `POST /api/data`

Salva lo stato globale del gioco dopo sanitizzazione e validazione.

Comportamenti rilevanti:

- `400` se il numero di partecipanti non e' quello atteso;
- `403` se la gara e' iniziata e i pronostici correnti vengono modificati;
- `500` in caso di errore persistente di salvataggio.

### `GET /api/drivers`

Restituisce il roster piloti ordinato alfabeticamente lato backend.

### `GET /api/calendar`

Restituisce il calendario ordinato per round.

### `GET /api/results/:meetingKey`

Recupera i risultati reali del weekend a partire dalla cache calendario.

## Modello dati applicativo

### Stato gioco

Lo stato persistito contiene:

- `users`
- `history`
- `gpName`
- `raceResults`
- `selectedMeetingKey`

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
  - se assente il server termina in fase di bootstrap.

### Opzionali

- `PORT`
  - porta HTTP del backend;
  - in locale il default e' `3001`.
- `VITE_APP_LOCAL_NAME`
  - override del titolo visualizzato nell'hero del frontend;
  - se estende il titolo base `Fanta Formula 1`, la hero lo divide in due righe: base title sopra, suffisso sotto;
  - viene letta da Vite a build-time per il bundle frontend;
  - in produzione richiede rebuild/redeploy per avere effetto.

### Precedenza locale

Il launcher locale carica:

1. variabili di processo correnti;
2. `.env`;
3. `.env.local` come override finale.

## Avvio locale

### Prerequisiti

- Node.js compatibile con il progetto.
- Dipendenze installate con `npm install`.
- MongoDB raggiungibile tramite `MONGODB_URI`.
- Google Chrome installato in `/Applications/Google Chrome.app` se si usa il launcher integrato.

### Modalita' sviluppo separate

- `npm run dev:backend`
- `npm run dev:frontend`

Il frontend Vite gira su `127.0.0.1:5173` e usa proxy `/api` verso `127.0.0.1:3001`.

### Modalita' integrata consigliata

- `npm run start:local`
- `./start_fantaf1.command`

Lo script integrato:

- verifica che le porte `3001` e `5173` siano libere;
- avvia backend e frontend;
- attende gli health check locali;
- apre Chrome in modalita' app sul frontend;
- prova a massimizzare la finestra;
- chiude i processi se uno dei child fallisce o se la finestra Chrome viene chiusa.

## Deploy su Render

### Configurazione servizio

- Build command: `npm install && npm run build`
- Start command: `npm start`

### Variabili da configurare

- `MONGODB_URI` obbligatoria.
- `PORT` normalmente gestita dalla piattaforma.
- `VITE_APP_LOCAL_NAME` opzionale se si vuole un titolo hero personalizzato anche in produzione.

### Comportamento in produzione

- Express serve i file statici generati in `dist`.
- Dopo la connessione al database il server parte subito e sincronizza piloti e calendario in background, evitando di bloccare lo startup su sorgenti lente.

## Qualita' tecnica

### Comandi disponibili

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run preview`

### Lint

- ESLint configurato per frontend TypeScript/React, backend Node e suite test.
- Ignore principali: `dist`, `coverage`, `.playwright-cli`.

### Test

- Runner: Vitest.
- Coverage provider: V8.
- Scope coverage configurato:
  - `backend/**/*.js`
  - `src/utils/**/*.ts`
- Esclusioni coverage:
  - `backend/config.js`
  - `backend/models.js`
- Soglie attuali:
  - `lines: 100`
  - `functions: 100`
  - `branches: 90`
  - `statements: 100`

La suite copre business logic, storage MongoDB, sanitizzazione, parsing di piloti e calendario, risultati, formattazione UI e regressioni sui flussi principali.
Include anche test unitari dedicati allo split deterministico del titolo hero e ai fallback responsive del titolo configurato.

## Struttura del repository

- `src/`: frontend React, costanti, tipi e utility UI.
- `backend/`: parsing esterno, validazione, storage e modelli Mongoose.
- `config/`: configurazione applicativa centralizzata.
- `scripts/`: launcher locale.
- `tests/`: test unitari e fixture HTML.
- `public/`: font e asset statici serviti dal frontend.

## Changelog

La cronologia delle release e delle implementazioni documentate e' disponibile in [CHANGELOG.md](CHANGELOG.md).
