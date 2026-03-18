# Specifica di Verifica: Subphase 7 - Results Route & Highlights

**Data:** 13 Marzo 2026 **Obiettivo:** Certificare la completezza e correttezza
della Subphase 7 nel porting C#, garantendo parità con Node, 100% copertura e
gestione corretta dei fallback.

## 1. Ambito della Verifica

La verifica copre i seguenti componenti in `backend-csharp/src/`:

- **API:** `ResultsController`
- **Application:** `ResultsService`, `RaceResultsCache`
- **Domain:** `RacePhaseResolver`, `OfficialResultsParser`,
  `FormulaOneResultsUrlBuilder`
- **Infrastructure:** `ResultsSourceClient`, `RaceHighlightsLookupService`,
  `OfficialResultsReferenceData`

## 2. Invarianti e Contratto

- **Payload:** Deve essere flat e compatibile con Node (`first`, `second`,
  `third`, `pole`, `racePhase`, `highlightsVideoUrl`).
- **RacePhase:** Deve riflettere `open`, `live`, o `finished` in base ai
  risultati e al tempo (come definito in Node).
- **Highlights:** Deve eseguire il lookup su YouTube (feed, ricerca canale,
  ricerca globale) se la gara è finita e non ci sono link persistiti.
- **Fallback:** In caso di errore nel lookup o nel parsing, deve restituire i
  dati persistiti o stringhe vuote (Node parity).

## 3. Criteri di Accettazione

- [ ] Audit di copertura al 100% su tutti i file sopra elencati.
- [ ] Esito positivo dei test di integrazione (`ReadRouteEndpointTests.cs`).
- [ ] Esito positivo dei test di parity (Node-vs-C#).
- [ ] Verifica manuale della logica di `RaceHighlightsLookupService` per i casi
      "missing" (fallback corretti).
- [ ] Nessun regresso nelle Subphase precedenti (1-6A).

## 4. Strumenti di Validazione

- `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`
- `dotnet test --collect:"XPlat Code Coverage"`
- `npm run test:csharp-coverage`
