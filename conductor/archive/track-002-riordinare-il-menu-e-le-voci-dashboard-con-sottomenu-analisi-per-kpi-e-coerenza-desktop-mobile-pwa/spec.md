# Spec

## Request

Riordinare il menu e le voci dashboard con sottomenu Analisi per KPI e coerenza
desktop/mobile/PWA

## Track

- Id: `track-002`
- Title: Riordinare il menu e le voci dashboard con sottomenu Analisi per KPI e
  coerenza desktop/mobile/PWA

## Goal

Rendere il menu di navigazione e l'ordine delle sezioni dashboard coerenti con
il nuovo ordine richiesto dall'utente, introducendo un sottomenu `Analisi` che
contiene solo `Deep-dive KPI dashboard` e `User KPI Dashboard`, mantenendo la
stessa esperienza su desktop browser, mobile browser e PWA.

## Success Criteria

- In vista desktop il menu mostra nell'ordine: `Calendario stagione`,
  `Pronostici dei giocatori`, `Weekend Pulse`, `Analisi stagione`, `Analisi` >
  `Deep-dive KPI dashboard`, `User KPI Dashboard`, `Classifiche reali`,
  `Storico gare`, `Come funziona`.
- In vista mobile/PWA il menu overlay mostra la stessa gerarchia e lo stesso
  ordine.
- Il contenuto dashboard segue lo stesso ordine riflesso nella pagina, non solo
  nella sidebar/overlay.
- `Installa applicazione` e `Accesso admin` restano nel footer/in fondo come
  oggi.
- Il sottomenu `Analisi` non ingloba altre voci oltre a
  `Deep-dive KPI dashboard` e `User KPI Dashboard`.
- Non vengono introdotte regressioni su view mode admin/public.
- Tutti i test rilevanti passano e la coverage resta al 80%.

## In Scope

- Navigazione sezioni in
  [src/utils/sectionNavigation.ts](/Users/matteobernardini/code/FantaF1/src/utils/sectionNavigation.ts)
- Rendering menu desktop in
  [src/components/Sidebar.tsx](/Users/matteobernardini/code/FantaF1/src/components/Sidebar.tsx)
- Rendering menu mobile/PWA in
  [src/components/MobileOverlay.tsx](/Users/matteobernardini/code/FantaF1/src/components/MobileOverlay.tsx)
- Eventuale ordine di rendering delle sezioni dashboard in
  [src/App.tsx](/Users/matteobernardini/code/FantaF1/src/App.tsx)
- Test frontend per sidebar, overlay mobile, roadmap/dashboard e responsive
- Aggiornamento artefatti Conductor del track

## Out of Scope

- Cambi al backend C#
- Modifiche ai contenuti testuali oltre a quelle strettamente necessarie alla
  nuova navigazione
- Refactor visuali non richiesti del design system
- Commit o push
- Cambi a workflow CI/CD non collegati a questo task

## Constraints

- Applicare integralmente
  [AGENTS.md](/Users/matteobernardini/code/FantaF1/AGENTS.md)
- TDD obbligatoria `RED -> GREEN -> REFACTOR`
- Coverage totale al 80% da preservare
- Nessun commit
- Nessun push
- La modifica deve valere su desktop browser, mobile browser e PWA
- `Installa applicazione` e `Accesso admin` devono restare nella parte finale
  del menu, separati dal blocco principale di navigazione
- Il branch operativo del track e' `change-menu-options-dashboard`

## Open Questions

- Nessuna al momento: il requisito di ordine e gerarchia e' sufficientemente
  esplicito per procedere all'implementazione nel turno successivo.

## Confirmed Decisions

- La voce di gruppo sara' `Analisi`.
- `Deep-dive KPI dashboard` e `User KPI Dashboard` saranno figli di `Analisi`
  solo nel menu; il contenuto dashboard restera' navigabile per sezione.
- `Risultati del weekend` resta disponibile nella vista admin e mantiene la sua
  collocazione operativa corrente tra le superfici admin.
- L'ordine target del blocco principale sara':
  1. `Calendario stagione`
  2. `Pronostici dei giocatori`
  3. `Weekend Pulse`
  4. `Analisi stagione`
  5. `Analisi`
     - `Deep-dive KPI dashboard`
     - `User KPI Dashboard`
  6. `Classifiche reali`
  7. `Storico gare`
  8. `Come funziona`
- Il footer conservera' in fondo:
  - `Installa applicazione`
  - `Accesso admin`
