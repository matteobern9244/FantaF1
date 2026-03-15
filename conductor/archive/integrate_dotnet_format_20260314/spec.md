# Specifica: Integrazione dotnet format nel workflow C# e CI/CD

## Obiettivo
Garantire che tutto il codice C# nel repository rispetti gli standard di formattazione definiti, automatizzando il controllo sia in locale che durante la Continuous Integration.

## Requisiti
1. **Verifica CI/CD**: Aggiungere un job nella pipeline GitHub Actions (`pr-ci.yml`) che esegua `dotnet format --verify-no-changes`.
2. **Precedenza CI/CD**: Il controllo di formattazione deve essere eseguito **prima** del job di build C# (`build-csharp`).
3. **Blocco CI/CD**: Se il controllo di formattazione fallisce, la pipeline deve interrompersi immediatamente e segnalare l'errore.
4. **Workflow Locale**: Aggiungere script in `package.json` per consentire agli sviluppatori di formattare il codice C# localmente con facilità.
5. **Standard Ingegneristici Mandatori**: Ogni operazione, dalla modifica degli script alla configurazione CI/CD, deve seguire rigorosamente le direttive presenti nel file `AGENTS.md`, rispettando il workflow di validazione, la gestione della coverage e la sicurezza del repository.

## Accettazione
- Il job `format-csharp` in CI/CD passa se il codice è formattato correttamente.
- Il job `format-csharp` fallisce se il codice richiede modifiche di formattazione.
- `build-csharp` non viene eseguito se `format-csharp` fallisce.
- `npm run format:csharp` esegue la formattazione locale.
- `npm run format:csharp:check` esegue la verifica locale (senza applicare modifiche).
