# Implementation Plan: Verifica Anti-Regressione Porting C# (Fase 1-9)

## Fase 1: Baseline Ingegneristica e Qualità

- [ ] Task: Verifica Stato Salute Node/React
  - [ ] Eseguire `npm run lint` e `npm run build`.
  - [ ] Eseguire `npm run test:coverage` e certificare il 100%.
- [ ] Task: Verifica Stato Salute C#
  - [ ] Eseguire `dotnet build backend-csharp/FantaF1.Backend.sln -c Release`.
  - [ ] Eseguire `dotnet test backend-csharp/FantaF1.Backend.sln -c Release`.
  - [ ] Eseguire `npm run test:csharp-coverage` e certificare il 100% su
        `backend-csharp/src/`.
- [ ] Task: Conductor - User Manual Verification 'Fase 1 - Qualità' (Protocollo
      in workflow.md)

## Fase 2: Verifica Funzionalità Porting (Fasi 1-8)

- [ ] Task: Verifica Parità API
  - [ ] Eseguire i test di integrazione/parità C# contro Node.
- [ ] Task: Verifica Bootstrap e Background Sync (Fase 8)
  - [ ] Validare log di avvio C# per `PortingBootstrapHostedService`.
  - [ ] Verificare popolamento iniziale `fantaf1_porting` (admin seed).
- [ ] Task: Conductor - User Manual Verification 'Fase 2 - Parità' (Protocollo
      in workflow.md)

## Fase 3: Verifica Strumenti e Launcher (Fase 9)

- [ ] Task: Verifica Launcher Canonico
  - [ ] Test avvio con `./start_fantaf1.command --runtime node` (default).
  - [ ] Test avvio con `./start_fantaf1.command --runtime csharp` (opt-in).
- [ ] Task: Verifica Script Parametrizzati
  - [ ] Eseguire `npm run test:save-local` forzando il target C#.
  - [ ] Eseguire `npm run test:ui-responsive` (check viste) puntando al frontend
        servito da C#.
- [ ] Task: Conductor - User Manual Verification 'Fase 3 - Strumenti'
      (Protocollo in workflow.md)
