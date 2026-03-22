# Specifica: Refactoring "FantaF1 Pro APP" (PWA Multi-Pagina)

## 1. Obiettivo

Evolvere l'attuale Single Page Application (SPA) in un'applicazione multi-pagina
(MPA-like via Client-side Routing) che offra un'esperienza utente da "vera APP".
Il focus è sulla separazione delle responsabilità, il miglioramento della
navigazione mobile e desktop, e il potenziamento delle capacità offline,
mantenendo la logica di business atomica e invariata.

## 2. Requisiti Funzionali

### 2.1 Architettura e Routing

- **Routing Client-side:** Introdurre `react-router-dom` per dividere
  l'applicazione in rotte distinte.
- **Struttura Pagine Proposta:**
  - `/dashboard`: Panoramica, KPI principali e "Weekend Pulse".
  - `/pronostici`: Inserimento e modifica dei pronostici per il weekend attivo.
  - `/gara`: Risultati reali e proiezioni live durante il weekend.
  - `/classifiche`: Classifica stagionale consolidata (Piloti, Costruttori,
    Utenti).
  - `/analisi`: Analytics avanzate e statistiche storiche.
  - `/admin`: Area di gestione per l'amministratore della lega.

### 2.2 Navigazione e UI

- **Mobile (Bottom Tab Bar):** Sostituire il menu overlay con una barra di
  navigazione fissa in basso con icone (Dashboard, Pronostici, Classifiche,
  Analisi).
- **Desktop (Sidebar Gestionale):** Mantenere e rifinire la sidebar sinistra in
  stile "dashboard gestionale", garantendo che ogni voce carichi una rotta
  specifica senza ricaricare l'intera applicazione.

### 2.3 Funzionalità PWA Avanzate

- **Offline Support:** Migliorare il Service Worker per permettere la
  consultazione dei dati già caricati anche senza connessione (Caching
  Stale-While-Revalidate).
- **Push Notifications:** Implementare il supporto alle notifiche push (Web Push
  API) per promemoria pronostici e alert risultati.
- **Home Screen Experience:** Ottimizzare il manifest per una visualizzazione
  "standalone" (senza UI del browser).

## 3. Requisiti Non Funzionali e Ingegneristici

- **Business Logic Isolation:** La logica di business NON DEVE CAMBIARE. Tutte
  le funzionalità presenti devono rimanere invariate.
- **Strict TDD:** Obbligatorio il ciclo RED-GREEN-REFACTOR per ogni modifica
  comportamentale.
- **80% Coverage:** La copertura dei test deve essere mantenuta al 80%
  (Statements, Functions, Branches, Lines).
- **DI & Repository Pattern:** Applicazione rigorosa degli standard di
  ingegneria backend C# e frontend React.

## 4. Fuori Scopo (Out of Scope)

- Migrazione a framework nativi (React Native/Capacitor).
- Modifica dei criteri di calcolo dei punteggi.
