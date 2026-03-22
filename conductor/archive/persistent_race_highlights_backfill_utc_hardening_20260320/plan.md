# Implementation Plan: Persistenza definitiva highlights per gara con backfill ufficiale F1, matching Sky/YouTube e hardening UTC su Render

## Phase 1: Workspace Alignment and Discovery

1. [x] Riallineare gli artefatti Conductor archiviati ma ancora incoerenti come
       stato.
2. [x] Aggiornare `conductor/index.md` e `conductor/tracks.md` per riflettere
       correttamente i track archiviati e il nuovo track live.
3. [x] Creare il nuovo track live con `spec.md`, `plan.md`, `review.md`,
       `verify.md`, `metadata.json` e `index.md`.
4. [x] Ispezionare il flusso highlights autorevole end-to-end:
   - `RaceHighlightsLookupService`
   - `OfficialCalendarSyncService`
   - `ResultsService`
   - `MongoWeekendRepository`
5. [x] Mappare tutti i punti in cui il tempo influenza la logica highlights:
   - `ShouldLookup`
   - TTL `missing`
   - stato gara conclusa
   - sync startup
   - lookup on-demand
6. [x] Mappare i campi ufficiali gara usati per identita' e riconciliazione:
   - `meetingKey`
   - `detailUrl`
   - slug
   - `roundNumber`
   - `startDate`
   - `endDate`
   - `raceStartTime`

## Phase 2: RED - Reproduce Current Failures and Lock Behavior

1. [x] Aggiungere test backend che riproducono la divergenza `locale vs Render`
       dovuta a logica temporale non uniformata.
2. [x] Aggiungere test backend su gare concluse che devono essere considerate
       candidate al backfill solo in `UTC`.
3. [x] Aggiungere test backend che falliscono se un `highlightsVideoUrl` gia'
       persistito viene degradato a vuoto o `missing`.
4. [x] Aggiungere test backend per il sync calendario con gare
       `declared`/sostituite/annullate da `f1.com`.
5. [x] Aggiungere test backend per il backfill iniziale di tutte le gare
       concluse ufficiali senza reprocessing inutile.
6. [x] Aggiungere test backend su matching Sky/YouTube:
   - alias localizzati
   - stagione corretta
   - publisher corretto
   - rifiuto di interviste/qualifiche/analisi
   - priorita' playlist `@skysportf1`
   - fallback `sport.sky.it/formula-1/video/highlights`
7. [x] Aggiungere test backend che coprano failure esterni senza rompere startup
       o perdere dati.
8. [x] Aggiungere o aggiornare test frontend per garantire la visibilita'
       stabile degli highlights nei dettagli gara.
9. [x] Aggiungere test sui launcher/startup solo se il nuovo flusso all'avvio
       cambia il comportamento osservabile.

### Progress Note

- [x] RED confermato su policy highlights che considera finita troppo presto una
      gara nello stesso giorno usando `EndDate` prima di `RaceStartTime`.
- [x] RED confermato su resolver highlights che usa ancora `DateTime.UtcNow`
      invece del clock iniettato quando la gara non espone un anno esplicito.
- [x] GREEN minimo completato sui due RED UTC iniziali con test mirati di
      backend tornati verdi.
- [x] RED confermato su persistenza Mongo che poteva azzerare un link gia'
      trovato quando un nuovo lookup risultava `missing`.
- [x] RED confermato su riconciliazione calendario che perdeva highlights
      storici se `f1.com` cambiava slug/URL della stessa gara ufficiale.
- [x] RED confermato su matching che ignorava la pagina playlist `@skysportf1` e
      il fallback `sport.sky.it/formula-1/video/highlights`.
- [x] GREEN minimo completato su append-only Mongo, riconciliazione per
      round/date e priorita' playlist/Sky page.

## Phase 3: GREEN - Minimal Safe Implementation

1. [x] Introdurre una policy temporale unica `UTC` per il dominio highlights
       usando solo clock iniettato.
2. [x] Uniformare parse e confronti di date/ore rilevanti per la decisione "gara
       conclusa".
3. [x] Aggiornare il sync calendario all'avvio per riallineare il calendario
       ufficiale corrente da `f1.com`.
4. [x] Progettare e implementare la riconciliazione sicura tra calendario
       persistito e calendario ufficiale aggiornato.
5. [x] Implementare il backfill iniziale solo per gare concluse e ufficialmente
       presenti nel calendario aggiornato.
6. [x] Rendere `highlightsVideoUrl` append-only nel repository/policy di merge.
7. [x] Migliorare il resolver highlights con priorita':
   - YouTube channel/feed/search `@skysportf1`
   - eventuale playlist highlights affidabile
   - pagina highlights Sky Sport Formula 1
   - fallback globale fortemente vincolato
8. [x] Rafforzare ranking e validazione candidate con segnali positivi/negativi,
       anno corretto e publisher corretto.
9. [x] Mantenere invariato il contratto frontend/backend salvo necessita' reale
       dimostrata dai test.

## Phase 4: REFACTOR - Isolation and Stability

1. [x] Isolare la logica temporale highlights in policy o coordinatori chiari e
       testabili per quanto richiesto dallo scope approvato.
2. [x] Isolare la logica di ranking e matching candidate in componenti piccoli e
       leggibili per quanto richiesto dallo scope approvato.
3. [x] Ridurre duplicazioni tra sync calendario e lookup on-demand per quanto
       richiesto dallo scope approvato.
4. [x] Centralizzare costanti e segnali di matching in moduli o config gia'
       esistenti per quanto richiesto dallo scope approvato.
5. [x] Garantire che il codice resti DI-friendly e senza hidden collaborator
       graphs nel risultato finale validato.
6. [x] Mantenere chiari confini tra domain, application, infrastructure e UI nel
       risultato finale validato.

## Phase 5: Validation and Regression Checks

1. [x] Eseguire test backend mirati della fase RED e GREEN fino a verde
       completo.
2. [x] Eseguire `npm run lint`.
3. [x] Eseguire `npm run test`.
4. [x] Eseguire `npm run build`.
5. [x] Eseguire `npm run test:csharp-coverage`.
6. [x] Eseguire `npm run test:ui-responsive`.
7. [x] Verificare desktop e mobile su admin e public in ambiente development.
8. [x] Verificare comportamento production-like con build reale e backend C#.
9. [x] Verificare che startup locale resti coerente su Mac e Windows.
10. [x] Confermare coverage al 80% su scope ufficiale repository/application e
        backend C#.

## Coverage 80% totale

1. [x] Mantenere 80% statements, functions, branches e lines per lo scope
       ufficiale repository/application.
2. [x] Mantenere 80% coverage backend C# sullo scope monitorato da
       `npm run test:csharp-coverage`.
3. [x] Aggiungere test mirati per ogni ramo nuovo introdotto.
4. [x] Non considerare il task completo se la coverage scende sotto 80%.

## Regression Checks

1. [x] Nessuna regressione sul consumo frontend di `highlightsVideoUrl`.
2. [x] Nessuna regressione su startup non bloccante in caso di failure esterni.
3. [x] Nessuna regressione sul calendario ufficiale e sulla selezione weekend.
4. [x] Nessuna regressione tra locale, staging e produzione dovuta a timezone o
       `UTC`.
5. [x] Nessuna regressione su admin/public desktop/mobile.

## Explicit Non-Goals During Execution

1. [x] Non eseguire nessun commit.
2. [x] Non eseguire nessun push.
3. [x] Non eseguire merge, rebase o tag.
