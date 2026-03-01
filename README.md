# Fanta Formula 1

Applicazione locale per gestire un Fanta Formula 1 privato con tre giocatori. L'assetto attuale prevede tre partecipanti totali, uno dei quali opera come admin e inserisce manualmente pronostici e risultati per tutto il gruppo.

## Come funziona

Prima dell'inizio del weekend rilevante, l'admin registra per ciascun giocatore quattro scelte: vincitore della gara, secondo classificato, terzo classificato e pole position oppure vincitore della Sprint, se il weekend include la Sprint.

Il punteggio applicato e' fisso:

- 5 punti per la prima posizione corretta.
- 3 punti per la seconda posizione corretta.
- 2 punti per la terza posizione corretta.
- 1 punto extra per pole position o vincitore Sprint.

## Architettura dati

Il backend Express e' l'unico punto di persistenza e sincronizzazione. Il frontend React consuma solo le API backend.

- `F1Result/data.json` contiene esclusivamente i dati inseriti dall'app: utenti, pronostici correnti, storico, risultati e weekend selezionato.
- `F1Result/drivers.json` e' la cache locale del roster piloti sincronizzato all'avvio.
- `F1Result/calendar.json` e' la cache locale del calendario stagionale sincronizzato all'avvio.

La lista piloti viene aggiornata ad ogni avvio dal backend usando StatsF1 come sorgente dati del roster e viene poi riordinata alfabeticamente prima di essere esposta al frontend. Il calendario stagionale e gli asset remoti del weekend arrivano da Formula1.com e vengono serviti al frontend tramite API backend.

## Avvio locale

Per lo sviluppo puoi usare i comandi separati:

- `npm install`
- `npm run dev:backend`
- `npm run dev:frontend`

Per l'avvio completo su macOS con controllo del ciclo di vita, usa:

- `./start_fantaf1.command`

Questo launcher avvia prima il backend, poi il frontend, apre l'app in Google Chrome in modalita' app e ferma entrambi i processi quando la finestra dell'app viene chiusa.

## Titolo locale

Il titolo visibile dell'app puo' essere sovrascritto solo in locale tramite `.env.local`. Il repository include solo `.env.example` come riferimento e non versiona il valore locale effettivo.

## Qualita' tecnica

Sono inclusi lint, build e test automatici per proteggere la logica di punteggio, la sanitizzazione dei dati, il parsing del roster piloti e il parsing del calendario.
