# Fanta Formula 1

Applicazione locale per gestire un Fanta Formula 1 privato con tre giocatori. La configurazione attuale prevede sempre tre partecipanti totali, con un admin che inserisce manualmente pronostici e risultati per tutto il gruppo.

## Regole di gioco

Prima dell'inizio del weekend rilevante, l'admin registra per ogni giocatore quattro scelte:

- vincitore della gara
- secondo classificato
- terzo classificato
- pole position oppure vincitore della Sprint, se il weekend e' Sprint

Il punteggio attuale e' quello definito in configurazione:

- 5 punti per la prima posizione corretta
- 3 punti per la seconda posizione corretta
- 2 punti per la terza posizione corretta
- 1 punto extra per pole position o vincitore Sprint

## Implementazione attuale

Il frontend e' una SPA React + TypeScript + Vite. Il backend e' un server Express che gestisce persistenza locale, sincronizzazione delle sorgenti esterne e API consumate dal frontend.

L'interfaccia attuale:

- carica automaticamente il calendario della stagione
- seleziona un weekend dal calendario senza inserimento manuale del GP
- raccoglie su desktop i pannelli di supporto in alto a destra: regole, prossimo weekend, classifica live e riepilogo della gara attuale
- mostra calendario, pronostici, risultati e storico a piena larghezza sotto l'header
- usa un layout responsive a piena larghezza, senza colonne laterali che coprono il contenuto

## Persistenza e cache locali

La cartella `F1Result/` contiene tutti i dati locali dell'applicazione.

- `F1Result/data.json` contiene esclusivamente i dati di gioco inseriti dall'app: utenti, pronostici correnti, risultati, storico e weekend selezionato
- `F1Result/drivers.json` e' la cache locale del roster piloti
- `F1Result/calendar.json` e' la cache locale del calendario stagionale

Il frontend non salva dati in `localStorage` o in altre persistenze browser. I dati inseriti dall'utente vengono salvati solo tramite backend in `F1Result/data.json`.

## Sorgenti esterne usate all'avvio

Ad ogni avvio del backend:

- il roster piloti viene sincronizzato da StatsF1
- il calendario ufficiale viene sincronizzato da Formula1.com
- il backend usa le cache locali se una sorgente esterna non e' momentaneamente disponibile

Il roster viene normalizzato e ordinato alfabeticamente prima di essere esposto al frontend.

## API backend attuali

Il backend espone queste API:

- `GET /api/health`
- `GET /api/data`
- `POST /api/data`
- `GET /api/drivers`
- `GET /api/calendar`

Il frontend consuma solo queste API del backend.

## Avvio locale

Installazione iniziale:

- `npm install`

Avvio separato per sviluppo:

- `npm run dev:backend`
- `npm run dev:frontend`

Avvio locale integrato:

- `npm run start:local`
- `./start_fantaf1.command`

Lo script macOS `start_fantaf1.command` avvia backend e frontend, apre l'app in Google Chrome in modalita' app, massimizza la finestra iniziale e termina entrambi i processi quando la finestra dell'app viene chiusa.

## Configurazione locale del titolo

Il titolo visibile dell'app puo' essere sovrascritto solo in locale tramite `.env.local`. Il repository include `.env.example` come riferimento e non versiona il valore locale effettivo.

## Qualita' tecnica

Sono disponibili questi controlli:

- `npm run lint`
- `npm run build`
- `npm run test`

I test coprono la logica di punteggio, la sanitizzazione dei dati applicativi, il parsing del roster piloti e il parsing del calendario.
