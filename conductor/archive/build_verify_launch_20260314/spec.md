# Specifica: Build completa, verifica e lancio locale

## Obiettivo
Eseguire una build completa del progetto, verificare che linting e test passino correttamente con copertura al 100%, e avviare l'applicazione in locale utilizzando il launcher canonico `./start_fantaf1.command`.

## Ambito e Impatto
- **Build**: Compilazione di frontend (Vite) e backend (Express/C# quando applicabile).
- **Verifica**: Esecuzione dei controlli di qualità definiti in `AGENTS.md` (`lint`, `test`, `build`).
- **Lancio**: Avvio monitorato dell'applicazione.
- **Rischio**: Nessuna modifica al codice sorgente è prevista, quindi il rischio di regressione è minimo se lo stato attuale è sano.

## Requisiti di Accettazione
1. `npm run lint` deve completarsi senza errori.
2. `npm run test` deve completarsi con tutti i test passanti e copertura al 100% per statement, funzioni, branch e linee.
3. `npm run build` deve produrre i file di distribuzione correttamente.
4. `./start_fantaf1.command` deve avviare l'applicazione con successo e raggiungere lo stato di "app running".

## Vincoli di AGENTS.md Applicati
- Utilizzo del launcher monitorato `./start_fantaf1.command`.
- Mantenimento della copertura al 100% (se i test attuali passano).
- Seguire la sequenza di validazione obbligatoria.
- Non modificare il codice sorgente in questa fase di verifica.
