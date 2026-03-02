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

Il pulsante per la conferma dei risultati e l'assegnazione dei punti rimane disabilitato fino alla conclusione effettiva della gara e alla presenza di dati validi.

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
- Il backend usa i dati presenti nel database se una sorgente esterna non e' disponibile.

## Deploy su Render.com

L'applicazione e' pronta per il deploy su Render come "Web Service":

1. Collegare il repository GitHub a Render.
2. Configurare il comando di build: `npm install && npm run build`.
3. Configurare il comando di avvio: `npm start`.
4. Aggiungere la variabile d'ambiente `MONGODB_URI` con la stringa di connessione di MongoDB Atlas.

## Avvio locale

Installazione iniziale:

- `npm install`

Per l'avvio locale e' necessario un file `.env` o `.env.local` con la variabile `MONGODB_URI`.

Avvio separato per sviluppo:

- `npm run dev:backend`
- `npm run dev:frontend`

Avvio locale integrato:

- `npm run start:local`
- `./start_fantaf1.command`

Lo script macOS `start_fantaf1.command` avvia backend (porta 3001) e frontend (porta 5173 con proxy configurato), apre l'app in Google Chrome in modalita' app e gestisce il ciclo di vita dei processi.

## Configurazione locale del titolo

Il titolo visibile dell'app puo' essere sovrascritto solo in locale tramite `.env.local`. Il repository include `.env.example` come riferimento e non versiona il valore locale effettivo.

## Asset grafici locali

I font Formula 1 usati nell'interfaccia sono salvati localmente nel repository sotto `public/fonts/formula1/` e vengono serviti direttamente dall'app, senza dipendere da CDN esterne per il caricamento tipografico. Il font viene applicato a tutta la UI, mentre dimensioni, pesi e spaziatura restano calibrati per mantenere leggibilita'.

## Qualita' tecnica

Sono disponibili questi controlli:

- `npm run lint` (ESLint)
- `npm run build` (TypeScript + Vite build)
- `npm run test` (Vitest)

I test coprono la logica di punteggio, la sanitizzazione dei dati, il parsing dei piloti e del calendario.
