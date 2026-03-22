# Piano d'Azione: Build completa, verifica e lancio locale

## Obiettivo

Eseguire la sequenza completa di build, validazione e avvio monitorato del
progetto.

## Documenti di Riferimento

- `AGENTS.md` (Workflow di esecuzione e validazione)
- `PROJECT.md` (Ambiente e Launcher)
- `package.json` (Scripts e Comandi)

## Vincoli di AGENTS.md Applicati

- Rispetto rigoroso dei principi di programmazione di `AGENTS.md`.
- Mantenimento della copertura al 80% totale per l'applicazione.
- Utilizzo obbligatorio del launcher `./start_fantaf1.command`.
- Nessuna modifica di codice non richiesta.

## Strategia TDD

Poiché l'attività è di verifica dello stato attuale del progetto:

- **RED**: Non applicabile (non stiamo implementando nuove funzionalità o fix).
- **GREEN**: Verificare che lo stato attuale sia già "verde" (tutti i test
  passanti).
- **REFACTOR**: Non previsto.

## Coverage 80% totale

- Verificare che l'esecuzione di `npm run test` mantenga la copertura attuale
  del 80% per statement, funzioni, branch e linee.

## Fasi dell'Attuazione

### Fase 1: Pulizia e Installazione (se necessario)

- Assicurarsi che le dipendenze siano allineate.
- Comandi: `npm install` (opzionale, solo se necessario).

### Fase 2: Linting

- Verificare la conformità dello stile di codice.
- Comando: `npm run lint`.

### Fase 3: Unit & Integration Testing

- Eseguire la suite di test completa.
- Verificare la copertura del 80%.
- Comando: `npm run test`.

### Fase 4: Build di Produzione

- Verificare che la build di produzione sia generata correttamente.
- Comando: `npm run build`.

### Fase 5: Lancio Locale Monitorato

- Avviare l'applicazione in modalità locale.
- Comando: `./start_fantaf1.command`.

## Criteri di Accettazione e Verifica

- [ ] `npm run lint` passa senza errori.
- [ ] `npm run test` riporta il 80% di copertura e zero fallimenti.
- [ ] `npm run build` genera la directory `dist/` con successo.
- [ ] L'applicazione si avvia senza errori segnalati nel launcher.

## Rischi di Regressione

- Poiché l'operazione è di sola lettura/build, non ci sono rischi diretti sul
  codice sorgente. Tuttavia, se i test non passano o la build fallisce, lo stato
  di salute del progetto sarà compromesso.
