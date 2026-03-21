# Verify Subphase 07 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to
> implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Certificare formalmente che la Subphase 7 sia stata applicata
completamente e correttamente nel porting C#.

**Architecture:** Audit di copertura automatizzato + Revisione statica del
codice per la parità dei contratti API.

**Tech Stack:** .NET 10.0, Coverlet, Vitest (parity baseline).

---

### Task 1: Audit di Copertura Automatica

**Files:**

- Test: `backend-csharp/tests/FantaF1.Tests.Unit/`
- Test: `backend-csharp/tests/FantaF1.Tests.Integration/`

- [ ] **Step 1: Eseguire la suite di test con raccolta della copertura**

Run:
`dotnet test backend-csharp/FantaF1.Backend.sln -c Release --collect:"XPlat Code Coverage"`
Expected: Tutti i test PASS.

- [ ] **Step 2: Verificare il report di copertura aggregato**

Run: `npm run test:csharp-coverage` Expected: 100% su `FantaF1.Api`,
`FantaF1.Application`, `FantaF1.Domain`, `FantaF1.Infrastructure` (limitatamente
all'ambito Results).

### Task 2: Verifica Statica del Contratto Results

**Files:**

- Modify: `backend-csharp/src/FantaF1.Api/Controllers/ResultsController.cs`
- Modify: `backend-csharp/src/FantaF1.Application/Services/ResultsService.cs`

- [ ] **Step 1: Confrontare il DTO di risposta con il payload Node**

Verificare in `OfficialResultsModels.cs` che i nomi dei campi siano esattamente:
`first`, `second`, `third`, `pole`, `racePhase`, `highlightsVideoUrl`.

- [ ] **Step 2: Verificare la gestione degli errori 500**

Assicurarsi che `ResultsController` restituisca `{ error, details }` come in
Node.

### Task 3: Chiusura Formale in Conductor

- [ ] **Step 1: Aggiornare il ledger di porting**

Aggiornare `docs/backend-csharp-porting-plan.md` se necessario (anche se già
segnato come completed, certifichiamo la verifica).

- [ ] **Step 2: Commit dei risultati della verifica**

```bash
git add conductor/archive/verify-subphase-07/
git commit -m "verify: subphase 07 formal verification audit"
```
