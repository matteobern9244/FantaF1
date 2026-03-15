# Fix Scroll Performance Mobile Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminare la latenza ("jank") durante lo scroll su dispositivi mobili causata dall'event listener sincrono di React che valuta continuamente lo stato del bottone `back-to-top`.

**Architecture:** Sostituire l'event listener nativo dello scorrimento `window.addEventListener('scroll')` con un meccanismo ottimizzato, preferibilmente tramite `IntersectionObserver` mirato su un elemento "sentinella" in cima alla pagina (es. la root dell'header). Questo approccio scarica il thread principale su mobile dal dover ricalcolare il tree React a ogni frame di pixel scrollato.

**Tech Stack:** React (Hooks, IntersectionObserver).

---

### Task 1: Preparazione e Test TDD (RED)

**Files:**
- Modify: `tests/ui-mockup-roadmap.test.tsx`

- [ ] **Step 1: Adattare il test del back-to-top per usare IntersectionObserver al posto del fireEvent('scroll')**
  - Visto che cambieremo l'implementazione da `scroll` a `IntersectionObserver`, dovremo far sì che il mock nel test copra la visibilità di un elemento superiore (sentinella) per attivare o disattivare il bottone, e non l'evento di window scroll diretto.

### Task 2: Implementazione Ottimizzata (GREEN)

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Aggiungere l'elemento sentinella (se non si vuole usare la cima dell'header)**
  - Aggiungere una ref (`heroRef = useRef<HTMLElement>(null)`) all'elemento `<header className="hero-panel">`.

- [ ] **Step 2: Sostituire l'hook `useEffect` dello scroll con `IntersectionObserver`**
  - Rimuovere:
  ```typescript
  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(window.scrollY > 400);
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  ```
  - Sostituire con:
  ```typescript
  useEffect(() => {
    if (typeof window.IntersectionObserver !== 'function' || !heroRef.current) {
      // Fallback minimale per i browser molto vecchi o ambienti di test non polyfilled totalmente
      return;
    }

    const observer = new window.IntersectionObserver(
      ([entry]) => {
        // Mostra il pulsante se l'header esce dalla viewport (verso l'alto)
        setShowBackToTop(!entry.isIntersecting);
      },
      {
        rootMargin: '0px',
        threshold: 0,
      },
    );

    observer.observe(heroRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);
  ```

### Task 3: Refactoring e Validazione (REFACTOR)

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`

- [ ] **Step 1: Eseguire la suite di test globale**
  - Run: `npm run test`
  - Assicurarsi che le modifiche ai mock dell'IntersectionObserver nel test non rompano gli altri test di routing o rendering.

- [ ] **Step 2: Validare la Coverage**
  - Run: `npm run test:coverage`
  - Verificare il mantenimento del 100% per Statement, Branches, Functions, Lines. Se necessario, aggiungere test coverage al fallback del vecchio browser.

- [ ] **Step 3: Documentare la fix nel Changelog**
  - Aggiungere al `CHANGELOG.md` un'annotazione riguardante l'ottimizzazione del rendering durante lo scroll per i dispositivi mobili e la rimozione del listener passivo globale.
