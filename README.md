# Fanta Formula 1

Applicazione locale e cloud per gestire un Fanta Formula 1 privato con tre giocatori. La configurazione attuale prevede sempre tre partecipanti totali, con un admin che inserisce manualmente pronostici e risultati per tutto il gruppo.

## Regole di gioco

Prima dell'inizio della gara della domenica, l'admin registra per ogni giocatore quattro scelte:

- vincitore della gara
- secondo classificato
- terzo classificato
- pole position oppure vincitore della Sprint, se il weekend e' Sprint

I pronostici possono essere inseriti e modificati liberamente fino all'orario ufficiale di inizio della gara. Al termine dell'inserimento, l'admin deve cliccare su **"Salva dati inseriti"** per persistere i dati su MongoDB. Il sistema impedisce il salvataggio se i campi non sono completi per tutti i partecipanti.

Non appena la gara ha inizio, la sezione dei pronostici viene automaticamente bloccata per impedire modifiche tardive.

## Risultati e Punteggi

Al termine della gara (circa 2.5 ore dopo l'orario di inizio), l'applicazione recupera automaticamente i risultati ufficiali dalla Formula 1 e popola la sezione "Risultati del weekend". 

L'interfaccia include una **Classifica Live** nell'hero che mostra in tempo reale:
- I punti totali già consolidati nello storico gare.
- I **punti potenziali** (proiezioni) calcolati confrontando i pronostici attuali con i risultati del weekend selezionato.

Il pulsante per la conferma dei risultati e l'assegnazione definitiva dei punti rimane disabilitato fino alla conclusione effettiva della gara e alla presenza di dati validi.

Il punteggio attuale e' quello definito in configurazione:

- 5 punti per la prima posizione corretta
- 3 punti per la seconda posizione corretta
- 2 punti per la terza posizione corretta
- 1 punto extra per pole position o vincitore Sprint

## Implementazione attuale

Il frontend e' una SPA React + TypeScript + Vite. Il backend e' un server Express che gestisce la persistenza su MongoDB, la sincronizzazione delle sorgenti esterne, il recupero automatico dei risultati e le API consumate dal frontend. L'applicazione e' progettata per essere progettata per essere pubblicata su **Render.com** con database **MongoDB Atlas**.

L'interfaccia attuale:

- carica automaticamente il calendario della stagione
- seleziona un weekend dal calendario senza inserimento manuale del GP
- centra il branding principale nell'hero e mostra i quattro riquadri di supporto subito sotto il titolo
- mostra calendario, pronostici, risultati e storico a piena larghezza subito dopo i riquadri dell'hero
- usa un layout responsive a piena larghezza, senza colonne laterali che coprono il contenuto
- usa il font Formula 1 vendorizzato localmente in tutta l'interfaccia, con pesi e spaziatura regolati per mantenere leggibilita'
- mostra nella UI l'elenco dei piloti ordinato alfabeticamente per cognome e formattato come `Cognome Nome`
- permette di modificare o eliminare una gara gia' salvata nello storico, ricalcolando automaticamente la classifica
- recupera automaticamente i risultati reali al termine della sessione per facilitare l'inserimento e l'assegnazione dei punti
- include schermate di caricamento tematiche (Pit Stop) e icone personalizzate (Pneumatici, Bandiere)

## Persistenza e database (MongoDB)

L'applicazione utilizza **MongoDB Atlas** per la persistenza dei dati, sostituendo i file JSON locali.

- La collezione `appdata` contiene i dati di gioco: utenti, pronostici correnti, risultati, storico e weekend selezionato.
- La collezione `drivers` funge da cache per il roster piloti sincronizzato.
- La collezione `weekends` funge da cache per il calendario stagionale.

Il frontend non salva dati in `localStorage`. Tutte le operazioni di salvataggio, modifica o rimozione aggiornano il database tramite le API del backend.

## Sorgenti esterne e sincronizzazione

Ad ogni avvio del backend (sia in locale che su Render):

- Il roster piloti viene sincronizzato da StatsF1 e salvato su MongoDB.
- Il calendario ufficiale viene sincronizzato da Formula1.com e salvato su MongoDB.
- Il backend usa i dati presenti nel database se una sorgente esterna non e' disponibile, con meccanismi di retry automatici.

## API backend attuali

Il backend espone queste API utilizzate dal frontend:

- `GET /api/health`: Stato del server e connessione database.
- `GET /api/data`: Recupero dello stato globale del gioco.
- `POST /api/data`: Salvataggio pronostici e risultati (con validazione server-side).
- `GET /api/drivers`: Lista dei piloti (cache o sincronizzati).
- `GET /api/calendar`: Calendario stagionale (cache o sincronizzato).
- `GET /api/results/:meetingKey`: Recupero automatico dei risultati reali per un weekend specifico.

## Deploy su Render.com

L'applicazione e' pronta per il deploy su Render come "Web Service":

1. Collegare il repository GitHub a Render.
2. Configurare il comando di build: `npm install && npm run build`.
3. Configurare il comando di avvio: `npm start`.
4. Aggiungere la variabile d'ambiente `MONGODB_URI` con la stringa di connessione di MongoDB Atlas.

## Avvio locale

Installazione iniziale:

- `npm install`

Per l'avvio locale e' necessario un file `.env` o `.env.local` con la variabile `MONGODB_URI` (es. puntando al database `fanta1_dev`).

Avvio separato per sviluppo:

- `npm run dev:backend`
- `npm run dev:frontend`

Avvio locale integrato (Consigliato):

- `npm run start:local` (Script JS cross-platform)
- `./start_fantaf1.command` (Script macOS legacy)

Lo script `start:local` gestisce automaticamente il ciclo di vita dei processi, avvia il backend (porta 3001) e il frontend (porta 5173), ed apre l'applicazione in Google Chrome in modalita' app con finestra massimizzata.

## Qualita' tecnica

Sono disponibili questi controlli obbligatori prima di ogni rilascio:

- `npm run lint` (ESLint)
- `npm run build` (TypeScript + Vite build)
- `npm run test` (Vitest)

L'applicazione include una suite di **117 unit test** strutturali che coprono:
- **Test Coverage 100%**: È stata introdotta un'imposizione rigorosa che richiede il 100% di copertura del codice (linee, statement, funzioni, branch) tramite `@vitest/coverage-v8` per la business logic di backend e le utility, assicurando la totale assenza di regressioni.
- **Validazione Backend**: Logica di blocco gare (Race Lock), verifica partecipanti e completezza pronostici.
- **Sanitizzazione Dati**: Pulizia e integrità dei dati in ingresso al database (Storage Sanitization) e interazione completa con MongoDB.
- **Logica di Gioco**: Calcolo dei punteggi, ricostruzione dello storico e gestione dei record di gara.
- **Calendario e Piloti**: Parsing dei dati ufficiali F1, simulazione totale delle fallback di rete e gestione dei casi limite (es. eventi di un solo giorno, immagini corrotte).
- **UI & UX**: Verifica dei componenti critici del frontend, ordinamento e formattazione temporale.

---

### Ultime Modifiche (v1.3.2)
- **100% Code Coverage**: Configurato e raggiunto il 100% assoluto di Code Coverage per l'intero layer di business logic e utils (117 test totali). È ora tassativo mantenere questo standard per ogni nuova implementazione.
- **Dinamicità Stagionale Totale**: Rimosso ogni riferimento hard-coded all'anno in corso. L'applicazione rileva e applica ora l'anno di sistema in modo dinamico in ogni sua parte (Frontend, Backend, Titolo, Test), garantendo la compatibilità automatica con tutte le stagioni future.
- **Programma Weekend Completo**: La card "Prossimo Weekend" ora include la lista dettagliata di tutte le sessioni (Prove Libere, Qualifiche, Sprint, Gara) con orari sincronizzati in tempo reale.
- **Iconografia Dinamica**: Integrato un sistema di icone intelligenti (`Timer`, `Zap`, `FastForward`, `Flag`) che identificano visivamente ogni tipologia di evento nel weekend.
- **Localizzazione Avanzata**: Formattazione date e orari in standard italiano (`Giorno dd/MM/yyyy HH:mm`) con supporto per il Lunedì come inizio settimana.
- **Potenziamento Test Suite**: Raggiunta la quota di **117 unit test** che validano meticolosamente ogni aspetto della business logic, del parsing, del rendering temporale, dell'interazione con MongoDB e delle casistiche di failure di rete.
- **Visual Circuit Enhancement**: Immagine del tracciato ingrandita, centrata e ottimizzata per l'alta definizione senza sgranature, con effetti di profondità dinamici.
- **Pit Stop Loader 2.0**: Nuova interfaccia di caricamento con animazioni fluide del meccanico e della gomma, integrata con messaggi di stato dinamici per un feedback utente immediato.
- **Restyling UI "Pro"**: Implementato un nuovo design avanzato ispirato alla Formula 1 con effetti di Glassmorphism, Neon Glow e animazioni fluide per un'esperienza utente più immersiva.
- **Pulizia Cache Locale**: Rimossi definitivamente i vecchi file fisici `calendar.json` e `drivers.json`. L'applicazione ora si appoggia interamente e in modo esclusivo a MongoDB Atlas anche per le cache di piloti e calendario, garantendo la totale persistenza su Render.com senza perdite di dati ai riavvii.
- **Ottimizzazione Tipografica**: Sostituito il font 'Formula1 Wide' con la versione regolare in tutte le card e le etichette per eliminare l'effetto "stretchato" e migliorare la leggibilità dei dati.
- **Riorganizzazione Controlli**: Spostati i pulsanti di reset e salvataggio dei pronostici sotto la griglia dei giocatori, impilandoli verticalmente e allineandoli allo stile del pulsante dei risultati per una maggiore coerenza visiva.
- **Full-Width Action Buttons**: Aggiornati i pulsanti principali (Reset, Salva, Conferma) affinché occupino l'intera larghezza disponibile nel pannello, migliorando l'accessibilità sia su desktop che su mobile.
- **Protocollo Automazione Browser**: Implementato un nuovo sistema di chiusura e apertura intelligente delle schede del browser (Chrome) durante le operazioni di stop e riavvio dell'applicazione.

### Modifiche Precedenti (v1.3.1)
- **Fix Pulsanti Reset e Salva (Render)**: Risolto il problema che impediva il salvataggio dei dati in produzione su Render. La validazione lato server è stata resa più flessibile per accettare nomi partecipanti personalizzati nel database, evitando errori di blocco (400 Bad Request).
- **Ottimizzazione Deploy**: Spostata la sincronizzazione dei dati (piloti e calendario) in background all'avvio del server. Questo elimina i timeout durante il deploy su Render, garantendo che l'applicazione sia immediatamente disponibile.
- **Risoluzione Problemi Mobile & Safari**: Corretto il parsing delle date per garantire piena compatibilità con Safari su iOS. Ora il blocco automatico delle gare e la gestione dei weekend funzionano correttamente su tutti i dispositivi.
- **Integrità Nomi Partecipanti**: Corretta una regressione che riportava i nomi dei giocatori ai valori di default dopo l'eliminazione o la modifica di una gara dallo storico. Ora i nomi personalizzati vengono preservati in ogni operazione di ricalcolo.
- **Robustezza Connessione DB**: Migliorata l'estrazione del nome del database dall'URI di MongoDB Atlas per una connessione più stabile in ambienti cloud.

### Modifiche Precedenti (v1.3.0 - Produzione Attuale)
- **Robustezza dei Salvataggi**: Risolta una race condition logica nel frontend che mostrava messaggi di successo prematuri.
- **Salvataggio Automatico al Reset**: L'azione "Reset pronostici correnti" ora azzera i dati e li salva automaticamente nel database.
- **Modulo di Validazione Backend**: Introdotto un nuovo sistema di validazione (`backend/validation.js`) per garantire l'integrita' dei dati.
- **Potenziamento Test Suite**: Espansione massiccia dei test automatizzati (54 test passanti).
- **Miglioramento Parsing Calendario**: Corretto il supporto per gli eventi di un solo giorno e migliorata la resilienza del recupero dati.

### Modifiche Precedenti (v1.2.0)
- **Migrazione MongoDB Atlas**: Transizione completa dai file JSON locali alla persistenza cloud-ready per produzione e sviluppo (`fanta1_dev`).
- **Integrazione Visuale**: Aggiunta di nuovi asset grafici (`pitstop.png`, `tire.png`, `flag.png`) per migliorare l'estetica dell'interfaccia.
- **Validazione Server-Side**: Rafforzata la logica di salvataggio con controlli rigorosi sui partecipanti e sul blocco temporale delle gare.
- **Process Management**: Migliorato lo script di avvio locale per una gestione piu' robusta dei processi e dell'apertura del browser.
- **Supporto Express 5**: Aggiornato il backend per la piena compatibilita' con Express 5, risolvendo bug critici di routing.
- **UI & UX Versioning**: Inserimento del numero di versione nel footer dell'applicazione.

### Modifiche Precedenti (v1.1.0)
- **Classifica Live & Proiezioni**: Introdotta una sezione nell'hero che mostra i punti potenziali in tempo reale durante il weekend di gara.
- **Blocco Automatico Gara**: I pronostici vengono ora bloccati automaticamente all'orario di inizio ufficiale della sessione.
- **Recupero Automatico Risultati**: Implementata l'integrazione con le API ufficiali F1 per popolare i risultati reali a fine gara.
- **Validazione Avanzata**: Nuovo sistema di salvataggio manuale dei pronostici con controllo di completezza per tutti i partecipanti.
- **Ottimizzazione Backend**: Aggiunti meccanismi di retry per la sincronizzazione del calendario e del roster piloti.
- **UI & UX**: Nuova schermata di caricamento tematica (Pit Stop) e integrazione dei font ufficiali F1 in tutta l'applicazione.
