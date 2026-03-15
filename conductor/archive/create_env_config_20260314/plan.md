# Piano d'Azione: Creazione e configurazione file .env locale

## Obiettivo
Ripristinare la configurazione dell'ambiente tramite il file `.env`.

## Documenti di Riferimento
- `AGENTS.md` (Configurazione e Segretezza)
- `PROJECT.md` (Ambiente e Launcher)
- `.env.example` (Modello di configurazione)

## Vincoli di AGENTS.md Applicati
- Utilizzo di variabili d'ambiente non hardcoded.
- Rispetto della sicurezza dei segreti (generati casualmente per il locale).
- Nessun commit del file `.env` (gestito da `.gitignore`).
- Validazione tramite lo smoke test locale.

## Strategia TDD
- **RED**: `npm run test:save-local` fallisce (poiché il file `.env` non esiste ancora).
- **GREEN**: Creazione del file `.env` con i valori corretti e verifica tramite lo smoke test.
- **REFACTOR**: Nessuno necessario.

## Coverage 100% totale
- Poiché l'operazione è di configurazione e non di codice sorgente, il 100% di copertura deve essere mantenuto per i test esistenti durante la validazione.

## Fasi dell'Attuazione

### Fase 1: Analisi e Preparazione
- Verificare i valori richiesti in `.env.example`.
- Identificare l'URI locale di MongoDB (es. `mongodb://localhost:27017/fantaf1_dev`).

### Fase 2: Creazione del file `.env`
- Creare il file `.env` nella root del progetto con i seguenti valori:
    - `MONGODB_URI=mongodb://localhost:27017/fantaf1_dev` (o quello fornito dall'utente se diverso).
    - `PORT=3001`
    - `NODE_ENV=development`
    - `VITE_APP_LOCAL_NAME="Sviluppo Locale"`
    - `ADMIN_SESSION_SECRET` (Generato come stringa casuale).

### Fase 3: Validazione
- Eseguire `npm run test:save-local` per confermare che il backend sia ora raggiungibile.
- Eseguire `npm run test:coverage` per assicurarsi che tutto il sistema sia stabile.

### Fase 4: Lancio
- Avviare l'app tramite `./start_fantaf1.command`.

## Criteri di Accettazione e Verifica
- [ ] Il file `.env` è presente.
- [ ] `npm run test:save-local` passa senza errori di timeout.
- [ ] `./start_fantaf1.command` apre l'app correttamente.
