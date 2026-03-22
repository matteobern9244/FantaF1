# Specifica: Fix fallimento avvio backend locale durante preflight

## Obiettivo

Risolvere il problema del timeout durante lo smoke test di salvataggio locale
(`test:save-local`) in `start_fantaf1.command`, fornendo un errore chiaro quando
manca la configurazione necessaria (`MONGODB_URI`).

## Problema

Lo smoke test tenta di avviare il backend per verificare la capacità di
salvataggio. Poiché `MONGODB_URI` non è definita (manca il file `.env`), il
backend crasha silenziosamente (poiché `stdio: 'ignore'`). Lo smoke test attende
45 secondi e poi fallisce con un errore di timeout generico:
`[save-local-check] FAILED Backend locale non raggiungibile su http://127.0.0.1:3001/api/health entro 45000ms.`

## Requisiti di Accettazione

1.  Lo smoke test `test:save-local` deve rilevare subito se il processo backend
    termina con errore invece di attendere il timeout.
2.  Deve essere mostrato un messaggio di errore chiaro se `MONGODB_URI` è
    mancante o se il backend crasha durante l'avvio.
3.  `start_fantaf1.command` deve informare l'utente se non è stato configurato
    l'ambiente (es. suggerendo di creare `.env` da `.env.example`).
4.  Mantenere la copertura del 80% per i file modificati.
5.  Non introdurre regressioni in produzione o in altri flussi locali.

## Vincoli di AGENTS.md Applicati

- Rispetto rigoroso del TDD per le modifiche comportamentali.
- Mantenimento della copertura al 80% totale per l'applicazione.
- Nessuna modifica di codice non richiesta.
- Utilizzo del launcher canonico `./start_fantaf1.command`.
