# Piano di Implementazione: Fix Mobile Menu Readability And Scroll Affordance

## Sintesi

Applichero' integralmente le istruzioni di `AGENTS.md` e lavorero' sulla sola
superficie mobile del menu per eliminare l'effetto di testo "stirato/compresso",
migliorare la leggibilita' e rendere piu' intuitiva la percezione della sezione
corrente durante l'uso del menu mobile. La vista desktop va preservata.

## Principi Applicati

- `AGENTS.md` applicato e seguito integralmente
- Behavior preservation first
- Minimal safe change
- Accessibilita' e leggibilita' prima del polish visivo
- TDD rigoroso
- `RED -> GREEN -> REFACTOR`
- Copertura `100% totale` obbligatoria

## Diagnosi Tecnica Iniziale

- Il problema non sembra essere il font family, ma il modo in cui il font wide
  viene fatto rientrare nel layout mobile.
- I principali sospetti sono:
  1. card troppo strette rispetto al ritmo del font wide
  2. interazione non ottimale tra `gap`, `line-height`, `letter-spacing`,
     wrapping e larghezza effettiva della label
  3. label che non ricevono una geometria propria abbastanza stabile dentro il
     flex container
  4. affordance debole della voce attiva quando il menu viene riaperto o quando
     l'utente usa il menu per orientarsi nello scroll

## RED -> GREEN -> REFACTOR

- **RED**
  1. riprodurre il problema con screenshot/browser e in test, includendo
     leggibilita' e stato attivo mobile
  2. aggiungere test che falliscono se le label restano compresse o se la
     sezione corrente non e' chiaramente persistente
- **GREEN**
  1. applicare il minimo fix a layout e CSS del menu mobile
  2. migliorare l'affordance della voce attiva mobile se emerge un gap reale
     nello scroll/navigation flow
- **REFACTOR**
  1. pulire eventuali regole ridondanti
  2. lasciare la soluzione stabile, leggibile e coerente con la UI esistente

## Fase 1: Spec

- [x] Step 1. Formalizzare il problema, i vincoli e i criteri di successo della
      track

## Fase 2: Discovery E Design

- [ ] Step 1. Riprodurre il problema reale su mobile con browser reale e misure
      CSS/computed style.
- [ ] Step 2. Verificare se la causa e' principalmente tipografica, di layout
      flex, di wrapping o di state affordance.
- [ ] Step 3. Definire il fix minimo:
  - geometria della card mobile
  - area utile della label
  - ritmo verticale/orizzontale
  - stato attivo/scroll affordance mobile

## Fase 3: Implementazione TDD

- [ ] Step 1. Aggiungere test RED per il rendering mobile e per la chiarezza
      dello stato attivo della voce corrente.
- [ ] Step 2. Implementare il fix minimo in `App.css` e, solo se serve, in
      `MobileOverlay.tsx`.
- [ ] Step 3. Rifinire la soluzione per evitare regressioni su desktop e sul
      menu footer mobile.

## Fase 4: Verifica

- [ ] Step 1. Verificare in browser reale che le label non appaiano piu'
      stretchate/compressse.
- [ ] Step 2. Verificare che il menu mobile resti intuitivo quando l'utente lo
      usa dopo lo scroll.
- [ ] Step 3. Eseguire l'intera pipeline richiesta.
- [ ] Step 4. Aggiornare `verify.md`, `review.md`, `metadata.json`,
      `conductor/index.md` e `conductor/tracks.md`.

## Criteri Di Accettazione

- Le etichette del menu mobile sono leggibili e non appaiono piu' stretchate.
- Il font family resta invariato.
- Le card mobile mantengono una gerarchia visiva chiara e leggibile.
- La voce attiva/corrente nel menu mobile e' intuitiva e facile da riconoscere.
- La vista desktop non subisce regressioni.
- Nessuna regressione su apertura/chiusura overlay, click voci, footer menu,
  install/admin/logout.

## Regression Checks

- Desktop browser view, development
  1. il menu desktop deve restare invariato nel comportamento e nella
     leggibilita'
  2. active state e click di tutte le voci devono restare corretti
- Mobile browser view, development
  1. overlay leggibile su larghezze strette
  2. testo non compresso
  3. voce attiva chiara dopo click e dopo riapertura overlay
  4. footer menu leggibile e coerente
- Desktop browser view, production-like
  1. smoke del bundle buildato senza regressioni al menu
- Mobile browser view, production-like
  1. check responsive del bundle su device matrix supportata

## Coverage 100% totale

- Verificare e mantenere `100%` statements, branches, functions e lines sullo
  scope frontend/repository.
- Verificare e mantenere `100%` line, branch e method coverage sullo scope
  ufficiale `backend-csharp/src/`.
- Se la track fa scendere anche un solo valore sotto il `100%`, aggiungere test
  e fix fino al ripristino completo.

## Comandi Di Validazione Previsti

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:coverage`
- `npm run test:csharp-coverage`
- `npm run test:ui-responsive`

## Assunzioni

- Il problema principale e' sul menu mobile overlay e non richiede redesign
  desktop.
- Il font va preservato; si interverra' su geometria, spacing, wrapping, line
  rhythm e affordance.
- Se durante la riproduzione emergono altri problemi strettamente collegati alla
  leggibilita' o all'intuibilita' del menu mobile, verranno corretti nella
  stessa track senza ampliare lo scope ad aree non correlate.
