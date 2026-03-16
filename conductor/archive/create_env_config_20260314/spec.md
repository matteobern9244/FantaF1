# Specifica: Creazione e configurazione file .env locale

## Obiettivo
Ripristinare il file `.env` mancante con le variabili necessarie per l'avvio e il funzionamento corretto del backend in locale, garantendo la connessione al database MongoDB.

## Requisiti di Accettazione
1.  Il file `.env` deve esistere nella root del progetto.
2.  Le variabili `MONGODB_URI`, `PORT`, `NODE_ENV`, `ADMIN_SESSION_SECRET` e `VITE_APP_LOCAL_NAME` devono essere definite.
3.  Il valore di `MONGODB_URI` deve essere compatibile con l'ambiente locale (es. `mongodb://localhost:27017/fantaf1_dev`).
4.  Il backend deve avviarsi con successo leggendo la nuova configurazione.
5.  Lo smoke test di salvataggio locale deve passare con la nuova configurazione.

## Vincoli di AGENTS.md Applicati
- Rispetto della sicurezza: non esporre segreti in chiaro nei log.
- Non committare il file `.env` (già in `.gitignore`).
- Seguire la sequenza di validazione obbligatoria.
