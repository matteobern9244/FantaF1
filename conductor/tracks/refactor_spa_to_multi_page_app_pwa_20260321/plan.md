# Piano di Implementazione: Refactoring "FantaF1 Pro APP" (v4.0)

_Conformità Assoluta a GEMINI.md, AGENTS.md e Utilizzo Integrale delle Skill._

## Fase 0: Audit & Stabilizzazione Infrastrutturale (Categorico)

_Obiettivo: Validazione totale e preparazione del workspace._

- [x] **Task 0.1: Audit Invarianti di Business e Domain Mapping**
  - [x] Skill: `fantaf1-core-audit` -> Generare report stato attuale domini.
  - [x] Ispezionare `AGENTS.md` e `PROJECT.md` per garantire coerenza.
- [x] **Task 0.2: Validazione Script Dual-OS & Monitoraggio Launcher**
  - [x] Verificare `./start_fantaf1.command` e `start_fantaf1.bat`.
  - [x] Test di fumo avvio locale per confermare `dev-launcher.mjs`.
- [x] **Task 0.3: Audit CI/CD e Allineamento**
  - [x] Analizzare e allineare i workflow GitHub Actions senza alterare la
        logica esistente.
- [x] **Task 0.4: Conductor - User Manual Verification 'Fase 0: Audit Totale'
      (Protocollo in workflow.md)**

## Fase 1: Infrastruttura di Routing e Layout (TDD 80%)

_Obiettivo: Trasformazione in App multi-pagina mantenendo la logica atomica._

- [ ] **Task 1.1: Setup Routing Professionale (`react-router-dom`)**
  - [ ] **RED:** Test di navigazione per le rotte `/dashboard`, `/pronostici`,
        `/classifiche`, `/analisi`, `/admin`.
  - [ ] **GREEN:** Implementazione router e migrazione componenti.
  - [ ] Skill: `fantaf1-tdd-coverage` -> Certificare 80% di copertura sul nuovo
        strato di routing.
- [ ] **Task 1.2: Refactoring del Layout "Gestionale" (Desktop/Mobile)**
  - [ ] **RED:** Test per il componente `AppLayout` (Sidebar Desktop vs Bottom
        Tab Bar Mobile).
  - [ ] **GREEN:** Implementazione UI responsive rispettando i breakpoint di
        progetto.
- [ ] **Task 1.3: Conductor - User Manual Verification 'Fase 1: Routing &
      Layout' (Protocollo in workflow.md)**

## Fase 2: Navigazione Mobile (Bottom Tab Bar) e UX

_Obiettivo: Esperienza "App Nativa" e validazione visuale._

- [ ] **Task 2.1: Implementazione Bottom Tab Bar**
  - [ ] **RED:** Testare interazione icone e caricamento rotte associate.
  - [ ] **GREEN:** Creazione componente `BottomNavigation.tsx`.
- [ ] **Task 2.2: Verifica Browser e Responsive (Categorico)**
  - [ ] Skill: `fantaf1-browser-verification` (`check viste`) -> Validazione
        iPhone/Android.
- [ ] **Task 2.3: Conductor - User Manual Verification 'Fase 2: Navigazione UI'
      (Protocollo in workflow.md)**

## Fase 3: Hardening PWA e Sistema Notifiche Push (Integrazione C#)

_Obiettivo: Funzionalità di sistema e persistenza avanzata._

- [ ] **Task 3.1: Ottimizzazione PWA "Standalone"**
  - [ ] Configurazione `manifest.json` (display: standalone) e Service Worker
        (Caching).
- [ ] **Task 3.2: Backend Push Support (DI & Repository Pattern)**
  - [ ] **RED:** Test per `PushController.cs` e
        `MongoPushSubscriptionRepository`.
  - [ ] **GREEN:** Implementazione endpoint di sottoscrizione e persistenza su
        MongoDB Atlas.
- [ ] **Task 3.3: Frontend Push Subscription**
  - [ ] Integrazione `PushManager` nel Service Worker e gestione permessi.
- [ ] **Task 3.4: Conductor - User Manual Verification 'Fase 3: PWA & Push'
      (Protocollo in workflow.md)**

## Fase 4: Validazione Finale e Copertura 80% Totale

_Obiettivo: Garanzia di stabilità assoluta e allineamento documentale._

- [ ] **Task 4.1: Simulazione Build Render.com (Smoke Test)**
  - [ ] Eseguire `npm run build` e testare la build risultante localmente
        tramite launcher.
- [ ] **Task 4.2: Documentazione Operativa e Compliance**
  - [ ] Skill: `fantaf1-readme-manager` & `fantaf1-changelog-manager` ->
        Documentare evoluzione.
  - [ ] Skill: `markdown-formatter` -> Qualità formale documentazione.
- [ ] **Task 4.3: Copertura 80% Totale (Requisito Categorico)**
  - [ ] Eseguire `fantaf1-tdd-coverage` su TUTTO il repository (Frontend &
        Backend).
- [ ] **Task 4.4: Verifica Protocolli di Deploy**
  - [ ] Validare conformità ai protocolli `fantaf1-deploy` e
        `fantaf1_deploy_staging` (senza eseguire Git).
- [ ] **Task 4.5: Conductor - User Manual Verification 'Fase 4: Conclusione'
      (Protocollo in workflow.md)**
