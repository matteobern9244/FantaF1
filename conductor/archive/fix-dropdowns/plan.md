# Fix Dropdown Mobile Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to
> implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Risolvere la regressione visiva su Chrome (mobile emulation) dove le
opzioni delle dropdown appaiono disallineate, ripristinando il comportamento
nativo del selettore su dispositivi mobili.

**Architecture:** Modifica del CSS globale per differenziare l'aspetto delle
dropdown tra desktop (stilizzate) e mobile (native). Questo elimina i conflitti
di posizionamento dell'emulatore Chrome mantenendo un'esperienza utente coerente
con il sistema operativo.

**Tech Stack:** CSS (Media Queries), React (identificazione selettori).

---

### Task 1: Ricerca e Analisi (RED)

**Files:**

- Modify: `src/App.css`
- Test: `tests/ui-responsive-validation.test.js`

- [ ] **Step 1: Identificare tutti i selettori di dropdown nel progetto**
  - Già mappati: `.race-selector select`, `.field-row select`,
    `#meeting-selector`, `#insights-user-selector`, `.results-grid select`,
    `.insights-picker select`, `.history-filters select`.

- [ ] **Step 2: Aggiungere un test di regressione (se possibile)**
  - Nota: In JSDOM/Vitest è difficile testare il posizionamento dei menu popup
    nativi di Chrome. Verificheremo invece che le proprietà CSS vengano
    applicate correttamente tramite i test responsive esistenti.

### Task 2: Implementazione Fix CSS (GREEN)

**Files:**

- Modify: `src/App.css`

- [ ] **Step 1: Applicare il reset nativo su mobile**
  - Modificare `src/App.css` aggiungendo all'interno della media query
    `@media (max-width: 767px)` le regole per ripristinare `appearance: auto` e
    rimuovere la `background-image` custom che verrebbe sovrapposta all'icona di
    sistema.

```css
@media (max-width: 767px) {
  select {
    appearance: auto !important;
    -webkit-appearance: menulist !important;
    background-image: none !important;
    padding-right: 12px;
  }
}
```

- [ ] **Step 2: Verificare la coerenza visiva**
  - Assicurarsi che i bordi e il raggio (radius) delle select rimangano
    armoniosi con il resto del layout `.panel` anche in modalità nativa.

### Task 3: Validazione e Pulizia (REFACTOR)

**Files:**

- Modify: `CHANGELOG.md`
- Modify: `README.md`

- [ ] **Step 1: Eseguire lint e build**
  - Run: `npm run lint && npm run build`

- [ ] **Step 2: Eseguire i test e la copertura**
  - Run: `npm run test:coverage`
  - Expected: 100% Statements, Branches, Functions, Lines.

- [ ] **Step 3: Eseguire lo smoke test responsive**
  - Run: `npm run test:ui-responsive`
  - Verificare che non ci siano errori di layout o overflow dovuti al cambio di
    appearance.

- [ ] **Step 4: Aggiornare documentazione**
  - Documentare il fix della regressione mobile nel `CHANGELOG.md` e nel
    `README.md`.
