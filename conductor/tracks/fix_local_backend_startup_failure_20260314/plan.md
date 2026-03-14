# Piano d'Azione: Fix fallimento avvio backend locale durante preflight

## Obiettivo
Migliorare la robustezza e la messaggistica dello smoke test di salvataggio locale per evitare timeout generici in caso di configurazione mancante.

## Documenti di Riferimento
- `AGENTS.md` (Workflow di esecuzione e validazione, TDD, Coverage)
- `PROJECT.md` (Ambiente e Launcher)
- `scripts/save-local-check.mjs`
- `start_fantaf1.command`

## Strategia TDD (RED -> GREEN -> REFACTOR)

### 1. RED
- Aggiungere un test case in `tests/save-local-check.test.js` che simula il crash immediato del backend (es. `exit` con codice non zero).
- Verificare che lo smoke test riporti l'errore specifico (es. "Backend terminato con codice 1") invece del timeout generico.
- Aggiungere un test case per la mancanza di `MONGODB_URI` nel file di ambiente.

### 2. GREEN
- Modificare `scripts/save-local-check.mjs`:
  - Aggiungere il controllo preventivo della presenza di `MONGODB_URI` in `ensureLocalBackend`.
  - In `waitForHealthyBackend`, aggiungere la capacità di rilevare se il processo figlio è terminato prematuramente.
  - Catturare lo `stderr` del backend in una variabile temporanea per mostrarlo se il boot fallisce (opzionale se `inherit` non è desiderato).

### 3. REFACTOR
- Pulire la gestione degli errori e consolidare i messaggi utente.

## Coverage 100% totale
- Garantire che i nuovi rami di errore e controlli siano coperti dai test in `tests/save-local-check.test.js`.
- Verificare che l'intera applicazione mantenga il 100% di copertura.

## Fasi dell'Attuazione

### Fase 1: Riproduzione ed Errore di Test (TDD RED)
- Implementare il test fallente.

### Fase 2: Fix Implementazione (TDD GREEN)
- Applicare i cambiamenti a `scripts/save-local-check.mjs`.

### Fase 3: Miglioramento Launcher
- Modificare `start_fantaf1.command` per fornire un suggerimento sull'uso di `.env.example` quando lo smoke test fallisce.

### Fase 4: Validazione Finale
- `npm run lint`
- `npm run test:coverage`
- `npm run build`
- Tentativo di avvio (per verificare il nuovo messaggio di errore chiaro).

## Criteri di Accettazione e Verifica
- [ ] Lo smoke test fallisce velocemente (< 5s) se il backend crasha.
- [ ] L'errore indica chiaramente se manca `MONGODB_URI`.
- [ ] Il launcher suggerisce la creazione del file `.env`.
- [ ] Copertura al 100% preservata.
