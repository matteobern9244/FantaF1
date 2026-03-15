# Piano d'Azione: Integrazione dotnet format nel workflow C# e CI/CD

## Obiettivo
Aggiungere controlli di formattazione automatici per il codice C# per mantenere alta la qualità del codice e prevenire regressioni di stile, operando sempre in conformità agli standard del progetto.

## Vincoli Mandatori
- **Rispetto di AGENTS.md**: Ogni modifica al codice, alla configurazione o ai workflow deve seguire le istruzioni operative di `AGENTS.md`, inclusa la sequenza di validazione (`lint`, `test`, `build`) e il mantenimento della copertura al 100%.

## Fasi dell'Attuazione

### Fase 1: Aggiornamento package.json (Seguendo AGENTS.md)
- Aggiungere lo script `format:csharp` per eseguire `dotnet format` sulla solution C#.
- Aggiungere lo script `format:csharp:check` per eseguire `dotnet format --verify-no-changes`.
- **Validazione**: Eseguire `npm run lint` per assicurarsi che le modifiche al JSON siano corrette.

### Fase 2: Aggiornamento CI/CD (Seguendo AGENTS.md)
- Introdurre un nuovo job `format-csharp` in `.github/workflows/pr-ci.yml`.
- Configurare il job per eseguire `dotnet format backend-csharp/FantaF1.Backend.sln --verify-no-changes`.
- Impostare `build-csharp` affinché dipenda da `format-csharp` via `needs: [format-csharp]`.
- **Validazione**: Verificare la sintassi del workflow (se possibile localmente) e assicurarsi che non ci siano regressioni nei job esistenti.

### Fase 3: Verifica e Validazione Finale (Seguendo AGENTS.md)
- Eseguire la sequenza completa di validazione locale:
    1. `npm run lint`
    2. `npm run format:csharp`
    3. `npm run format:csharp:check`
    4. `npm run test` e `npm run test:csharp-coverage` (per garantire che la formattazione non abbia influenzato i test)
    5. `npm run build`

## Criteri di Accettazione e Verifica
- [ ] Script `format:csharp` e `format:csharp:check` presenti in `package.json`.
- [ ] Job `format-csharp` presente in `pr-ci.yml` prima di `build-csharp`.
- [ ] La pipeline CI/CD fallisce se il codice C# non è formattato.
- [ ] Copertura dei test unitari e di integrazione C# invariata al 100%.
- [ ] Conformità totale a `AGENTS.md` certificata.
