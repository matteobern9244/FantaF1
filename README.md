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

Il frontend e' una SPA React + TypeScript + Vite. Il backend e' un server Express che gestisce la persistenza su MongoDB, la sincronizzazione delle sorgenti esterne, il recupero automatico dei risultati e le API consumate dal frontend. L'applicazione e' progettata per essere pubblicata su **Render.com** con database **MongoDB Atlas**.

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

I test coprono la logica di punteggio, la sanitizzazione dei dati, il parsing dei piloti e del calendario.

---

### Ultime Modifiche (v1.2.0)
- **Migrazione MongoDB Atlas**: Transizione completa dai file JSON locali alla persistenza cloud-ready per produzione e sviluppo (`fanta1_dev`).
- **Integrazione Visuale**: Aggiunta di nuovi asset grafici (`pitstop.png`, `tire.png`, `flag.png`) per migliorare l'estetica dell'interfaccia.
- **Validazione Server-Side**: Rafforzata la logica di salvataggio con controlli rigorosi sui partecipanti e sul blocco temporale delle gare.
- **Process Management**: Migliorato lo script di avvio locale per una gestione piu' robusta dei processi e dell'apertura del browser.
- **Supporto Express 5**: Aggiornato il backend per la piena compatibilita' con Express 5, risolvendo bug critici di routing.
- **UI & UX Versioning**: Inserimento del numero di versione (v1.2.0) nel footer dell'applicazione, centrato e formattato con font Arial.
- **Miglioramenti Layout**: Centratura del footer e riposizionamento strategico dei pulsanti di azione per una migliore usabilita'.

### Modifiche Precedenti (v1.1.0)
- **Classifica Live & Proiezioni**: Introdotta una sezione nell'hero che mostra i punti potenziali in tempo reale durante il weekend di gara.
- **Blocco Automatico Gara**: I pronostici vengono ora bloccati automaticamente all'orario di inizio ufficiale della sessione.
- **Recupero Automatico Risultati**: Implementata l'integrazione con le API ufficiali F1 per popolare i risultati reali a fine gara.
- **Validazione Avanzata**: Nuovo sistema di salvataggio manuale dei pronostici con controllo di completezza per tutti i partecipanti.
- **Ottimizzazione Backend**: Aggiunti meccanismi di retry per la sincronizzazione del calendario e del roster piloti.
- **UI & UX**: Nuova schermata di caricamento tematica (Pit Stop) e integrazione dei font ufficiali F1 in tutta l'applicazione.
