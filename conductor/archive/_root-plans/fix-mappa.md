# Piano di Risoluzione: Bug Mappa Circuito "Recap ultimo GP"

## Analisi del Problema

Attualmente l'applicazione presenta un difetto architetturale e visuale nel
pannello `SeasonAnalysisPanel` (nella sezione "Recap ultimo GP"). La mappa del
circuito mostrata in questo riquadro è legata alla proprietà
`selectedRaceTrackOutlineUrl`, ovvero la mappa della gara **correntemente
selezionata** dal dropdown in alto, e non la mappa della gara passata a cui fa
riferimento il recap (l'ultimo GP corso e storicizzato).

Se l'amministratore seleziona il GP successivo (es. in arrivo), il recap
dell'ultimo GP mostra scorrettamente la mappa del GP in arrivo.

## Obiettivo

Disaccoppiare la mappa del "Recap ultimo GP" dalla gara attualmente selezionata
nell'interfaccia, in modo che mostri sempre la mappa corretta appartenente
all'ultimo GP di cui sta mostrando i risultati (la gara `history[0]`).

## Piano di Implementazione (TDD)

Seguendo rigorosamente `AGENTS.md` e il flusso RED -> GREEN -> REFACTOR:

### Fase 1: RED (Test di regressione)

1. **Aggiornamento Test:** Modificherò il test in
   `tests/ui-mockup-roadmap.test.tsx` (o nei mock dell'UI) per includere
   un'asserzione che verifichi esplicitamente la presenza dell'attributo `src` e
   dell'attributo `alt` dell'immagine mostrata nel pannello "Recap ultimo GP",
   aspettandosi l'URL e il nome della gara _storica_ (es. Silverstone),
   divergente dalla gara attualmente selezionata (es. Monza).
2. Verificherò che il test fallisca (RED).

### Fase 2: GREEN (Implementazione)

1. **Aggiornamento Tipizzazioni (`src/types.ts`)**: Aggiungerò le proprietà
   `trackOutlineUrl` e `meetingName` all'interfaccia `RaceRecapSummary` per
   renderle disponibili al componente UI.
2. **Business Logic (`src/utils/analyticsService.ts`)**: Modificherò la firma di
   `buildRaceRecap` in modo che accetti non solo `history` ma anche il
   `calendar` completo.
   - Sfrutterò l'utilità `getRaceByMeetingKey` o cercherò il matching del
     `gpName` per recuperare i dettagli originali del weekend (come fatto in
     altre parti del backend).
   - Inserirò `trackOutlineUrl` e `meetingName` all'interno dell'oggetto di
     ritorno di `buildRaceRecap`.
   - Aggiornerò di conseguenza le chiamate a `buildRaceRecap` in
     `buildSeasonAnalytics`.
3. **Modifica UI (`src/components/SeasonAnalysisPanel.tsx`)**: Rimuoverò le
   props ridondanti `selectedRaceMeetingName` e `selectedRaceTrackOutlineUrl`
   per il recap, o comunque estrarrò l'immagine direttamente da
   `seasonAnalytics.recap.trackOutlineUrl` e il nome dall'oggetto interno,
   assicurando il totale disaccoppiamento dalla selezione globale dell'utente.
4. **Modifica Container (`src/App.tsx`)**: Rimuoverò le props non più necessarie
   passate a `<SeasonAnalysisPanel>`.

### Fase 3: REFACTOR & Validazione

1. **Esecuzione Test Locali**: Assicurerò che tutti i test superino l'asserzione
   (GREEN).
2. **Copertura Assoluta**: Eseguirò `npm run test:coverage` per garantire che
   l'integrazione del nuovo matching lasci tutti i rami coperti al 100%.
3. **Responsive & Build**: Confermerò che non ci siano regressioni.
4. **Documentazione**: Una volta superato, aggiornerò `CHANGELOG.md` e
   `README.md`.
