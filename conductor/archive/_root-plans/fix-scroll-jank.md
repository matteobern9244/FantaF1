# Fix Mobile Scroll Jank Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Risolvere la latenza residua ("jank") durante lo scroll su dispositivi mobili rimuovendo le proprietà CSS più pesanti da renderizzare frame-by-frame (come `backdrop-filter: blur()`) sui pannelli principali.

**Architecture:** La causa principale di frame drops su smartphone durante lo scroll è la ricalcolazione in tempo reale dei filtri grafici su sfondi complessi (come i nostri `radial-gradient`). Per la versione desktop, l'hardware è solitamente abbastanza potente da mantenere i 60fps con `backdrop-filter`. Per la versione mobile (`max-width: 767px`), disabiliteremo il blur e compenseremo rendendo il colore di sfondo del pannello opaco (quasi solido) in modo da preservare la leggibilità del testo.

**Tech Stack:** CSS (Media Queries), React.

---

### Task 1: Ottimizzazione Rendering CSS (GREEN)

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Rimuovere il backdrop-filter sui pannelli in vista mobile**
  - All'interno della media query `@media (max-width: 767px)`, sovrascrivere le proprietà per le classi che causano latenza grafica:
  ```css
  @media (max-width: 767px) {
    .hero-card,
    .panel,
    .calendar-panel {
      backdrop-filter: none;
      background: rgba(24, 28, 39, 0.95); /* Opacità aumentata per compensare la mancanza di blur rispetto alla var(--panel-glass) */
    }
    /* Resto delle regole esistenti... */
  }
  ```

### Task 2: Refactoring e Validazione TDD (REFACTOR)

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Run: `tests/ui-responsive-validation.test.js`

- [ ] **Step 1: Eseguire lint e build**
  - Run: `npm run lint && npm run build`

- [ ] **Step 2: Validare l'integrità dei test responsive**
  - Run: `npm run test:ui-responsive`
  - Assicurarsi che la rimozione del blur non infranga i controlli di trasparenza o contrasto stabiliti nel DOM analyzer.

- [ ] **Step 3: Mantenere la Copertura**
  - Run: `npm run test:coverage`
  - Expected: 100% Statements, Branches, Functions, Lines. (Le modifiche puramente CSS non dovrebbero impattare l'AST JavaScript, ma è un check obbligatorio).

- [ ] **Step 4: Aggiornare la documentazione**
  - Aggiungere al `CHANGELOG.md` e al `README.md` la documentazione riguardante la disattivazione hardware-intensive del `backdrop-filter` su mobile per perfezionare la fluidità di scorrimento.
