# Specifica: Refactoring "FantaF1 Pro APP" (PWA Multi-Pagina)

## 1. Obiettivo

Evolvere la shell frontend da SPA hash-only a shell multi-route client-side
route-aware, mantenendo invariata la business logic, rimuovendo il vecchio
overlay mobile dal runtime attivo, rafforzando le capacità PWA e chiudendo un
flusso reale di notifiche push end-to-end sul backend C# autorevole.

## 2. Requisiti Funzionali

### 2.1 Architettura e Routing

- La shell usa `react-router-dom` con le rotte reali:
  - `/dashboard`
  - `/pronostici`
  - `/gara`
  - `/classifiche`
  - `/analisi`
  - `/admin`
- `/gara#weekend-live` è la superficie pubblica canonica per il weekend live.
- `/gara#results-section` è la superficie admin canonica per i risultati gara.
- Un accesso non admin a `/gara#results-section` deve ricadere
  deterministicamente su `/gara#weekend-live`.

### 2.2 Navigazione e UI

- **Mobile:** il runtime attivo non usa più il fullscreen overlay menu.
- **Mobile:** la navigazione primaria è la bottom tab bar route-aware.
- **Mobile:** le azioni di installazione PWA, toggle admin/public e logout
  vivono in una utility bar dedicata.
- **Desktop:** resta la sidebar gestionale route-aware senza full reload.

### 2.3 Funzionalità PWA Avanzate

- Service worker reale con supporto offline della shell e degli asset già
  caricati.
- Manifest ottimizzato per la modalità standalone installabile.
- Supporto reale alle push:
  - recupero configurazione client e public key dal backend
  - subscribe/unsubscribe della browser subscription
  - persistenza backend della subscription
  - test delivery reale tramite `POST /api/push-notifications/test-delivery`

## 3. Requisiti Non Funzionali e Ingegneristici

- **Business Logic Isolation:** la logica di business deve restare invariata.
- **Strict TDD:** obbligatorio il ciclo `RED -> GREEN -> REFACTOR`.
- **Coverage 100% totale:** copertura obbligatoria al `100%` su statements,
  functions, branches e lines per lo scope frontend/repository e al `100%` su
  line, branch e method coverage per `backend-csharp/src/`.
- **DI & Repository Pattern:** applicazione rigorosa degli standard di
  ingegneria backend C# e frontend React.
- **Responsive Certification:** verifiche obbligatorie desktop/mobile in
  development e production-like.

## 4. Fuori Scopo

- Migrazione a framework nativi (React Native/Capacitor).
- Cambi dei criteri di calcolo punteggi.
- Scheduler complessi o reminder automatici avanzati per le push oltre al test
  delivery reale certificabile.
