# Changelog

Cronologia sintetica delle release documentate del progetto Fanta Formula 1.

## In sviluppo

- **Hardening Database**: Implementata la risoluzione dinamica del database tramite `MONGODB_URI`. Il backend ora estrae il nome del database dal path della URI e verifica all'avvio che coincida esattamente con quello atteso per l'ambiente (`fantaf1_dev` in locale, `fantaf1` in produzione), prevenendo errori di connessione accidentali.
- **Error Handling Avanzato**: Introdotto un sistema di tracciamento degli errori con `requestId` e codici specifici (es. `race_locked`, `participants_invalid`), migliorando drasticamente la diagnosi dei problemi e la sicurezza dei dati.
- **Automazione CI/CD Locale**: Lo script `start_fantaf1.command` e il launcher locale sono stati potenziati. Ora eseguono una suite completa di pre-volo: Lint, Unit Test, Build, Test UI Responsive e Smoke Test di salvataggio prima dell'apertura effettiva dell'app.
- **Controllo Responsive Automatizzato**: Aggiunto lo script `ui-responsive-check.mjs` (Playwright) che valida automaticamente 5 breakpoint (Mobile, Tablet, Laptop, Desktop, Desktop-XL), garantendo l'assenza di overflow o clipping del testo.
- **Consolidamento Ambiente**: Eliminazione di `.env.local` a favore di un unico file `.env` per semplificare la configurazione tra locale e produzione.
- **Semplificazione UI**: Rimossa l'indicazione dell'Admin dall'intestazione dei pronostici, ora semplificata in "Pronostici dei giocatori".
- Titolo hero reso deterministico su due righe quando `VITE_APP_LOCAL_NAME` estende il titolo base: prima riga `Fanta Formula 1`, seconda riga con il suffisso configurato.
- Il titolo hero usa ora un fit reale basato sulla larghezza del contenitore: mantiene il massimo visivo sui desktop larghi e riduce il `font-size` solo quanto necessario per evitare clipping su viewport medi e piccoli.
- Introdotta la utility `src/utils/title.ts` per centralizzare la scomposizione del titolo hero e riusare una logica coerente tra runtime e test.
- Aggiunti test unitari specifici sul parsing del titolo hero e ripristinata la coverage globale allo standard del repo sullo scope configurato (`100%` lines/statements/functions, branch sopra soglia).
- Formalizzato in `AGENTS.md` e `PROJECT.md` l'obbligo di aggiornare sempre `CHANGELOG.md` per ogni nuova versione applicativa, tag git o release GitHub.

## v1.3.3 - Produzione attuale

- Riallineata e ampliata la documentazione tecnica e di business logic nel `README.md` per riflettere con precisione il comportamento reale del repository.
- Estratto il changelog operativo dal `README.md` in un file dedicato `CHANGELOG.md`, mantenendo la cronologia separata dalla documentazione evergreen.
- Aggiornata la sezione release per indicare `v1.3.3` come versione in produzione e mantenere coerenti versione applicativa, footer UI, tag e release GitHub.
- Rimosso l'asset inutilizzato `src/assets/flag.png`, che non era referenziato dal codice ed era in realta' contenuto HTML non valido.

## v1.3.2

- Coverage del layer di business logic e utils portata al massimo standard del progetto, con 117 test totali, 100% su lines/functions/statements e una suite estesa su parsing, formattazione temporale, storage MongoDB e failure di rete per prevenire regressioni.
- Rimossi i riferimenti hard-coded all'anno corrente: frontend, backend, titolo e test usano ora l'anno di sistema in modo dinamico.
- La card "Prossimo weekend" mostra il programma completo delle sessioni con orari sincronizzati in tempo reale.
- Introdotto un sistema di icone dinamiche (`Timer`, `Zap`, `FastForward`, `Flag`) per distinguere visivamente prove libere, qualifiche, sprint e gara.
- Formattazione date e orari raffinata sullo standard italiano `Giorno dd/MM/yyyy HH:mm` e localizzazione piu' coerente dell'intero calendario weekend.
- Track map ingrandita, centrata e ottimizzata per una resa ad alta definizione.
- Loader "Pit Stop 2.0" rivisto con animazioni piu' fluide e messaggi di stato dinamici.
- Restyling UI "Pro" di livello piu' avanzato, con glassmorphism, glow neon e animazioni piu' fluide per un'impostazione visiva piu' immersiva e coerente con il linguaggio Formula 1.
- Rimossi i vecchi riferimenti alle cache locali legacy di piloti e calendario, con persistenza ormai interamente appoggiata a MongoDB Atlas.
- Ottimizzazione tipografica con revisione dell'uso del font Formula 1 nelle card e nelle etichette per migliorare la leggibilita'.
- Riorganizzati i controlli di reset e salvataggio dei pronostici per una disposizione piu' coerente sotto la griglia dei giocatori.
- Pulsanti principali resi full-width per migliorare accessibilita' e coerenza tra desktop e mobile.
- Migliorata l'automazione del launcher locale, inclusa la gestione intelligente di apertura, chiusura e riassetto della finestra Chrome durante stop e riavvio dell'app.

## v1.3.1

- Risolto il problema dei pulsanti di reset e salvataggio in produzione su Render, rendendo piu' flessibile la validazione lato server per accettare anche nomi partecipanti personalizzati gia' presenti nel database.
- Spostata la sincronizzazione iniziale di piloti e calendario in background all'avvio del server, riducendo il rischio di timeout in deploy.
- Corretti i problemi di parsing delle date su mobile e Safari per mantenere affidabili lock gara e gestione weekend.
- Corretta una regressione sui nomi dei partecipanti durante modifica o cancellazione dello storico, preservando i nomi personalizzati nei ricalcoli.
- Migliorata l'estrazione del nome database dalla URI MongoDB Atlas per rendere piu' stabile la connessione in ambienti cloud.

## v1.3.0

- Risolta una race condition logica nel frontend che poteva mostrare un salvataggio riuscito in anticipo rispetto alla persistenza reale.
- Il reset dei pronostici correnti azzera i dati e li salva immediatamente nel database.
- Introdotto il modulo di validazione backend dedicato `backend/validation.js`.
- Rafforzata in modo significativo la suite di test automatizzati, arrivando alla milestone dei 54 test passanti del ciclo di release.
- Migliorato il parsing del calendario, incluso il supporto agli eventi di un solo giorno e una maggiore resilienza del recupero dati.

## v1.2.1

- Aggiornata la versione applicativa a `1.2.1` e riallineato il changelog del progetto.
- Centrato il footer dell'applicazione.
- Riallineati i controlli dell'area pronostici per una disposizione piu' coerente.

## v1.2.0

- Migrazione completa a MongoDB Atlas per dati di gioco, cache piloti e calendario, con impostazione cloud-ready per locale e produzione.
- Integrazione visuale con nuovi asset grafici principali, inclusi `pitstop.png`, `tire.png` e l'asset storico `flag.png`.
- Rafforzata la validazione server-side su salvataggi, partecipanti e blocco temporale delle gare.
- Migliorato il process management locale tramite launcher piu' robusto e migliore gestione dell'apertura browser.
- Aggiornamento del backend per la piena compatibilita' con Express 5 e risoluzione dei problemi critici di routing/catch-all.
- Inserimento del numero di versione nel footer dell'applicazione.

## v1.1.0

- Introdotta la classifica live con proiezioni dei punti durante il weekend di gara.
- Implementato il blocco automatico dei pronostici all'orario ufficiale di inizio gara.
- Aggiunto il recupero automatico dei risultati reali a fine weekend.
- Introdotto il salvataggio manuale dei pronostici con validazione di completezza per tutti i partecipanti.
- Rafforzata l'ottimizzazione backend con meccanismi di retry per sincronizzazione calendario e roster piloti.
- Introdotti loader tematico Pit Stop e font Formula 1 personalizzati nell'interfaccia.
