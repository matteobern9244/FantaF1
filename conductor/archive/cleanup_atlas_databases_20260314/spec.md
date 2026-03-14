# Track Specification: Analisi e Pulizia Database MongoDB Atlas

## Obiettivo
L'obiettivo di questa track è identificare e pianificare la rimozione dei database su MongoDB Atlas che non sono più necessari, garantendo che lo sviluppo locale, l'ambiente di staging e le pipeline di CI/CD rimangano pienamente operativi senza regressioni. Il database di produzione (`fantaf1`) deve essere preservato e non toccato.

## Requisiti e Vincoli
- **Preservazione Produzione:** Il database `fantaf1` non deve essere modificato o eliminato.
- **Supporto Sviluppo Locale:** Mantenere `fantaf1_dev` (autoritativo per il backend Node.js) e `fantaf1_porting` (autoritativo per il backend C#).
- **Supporto Staging:** Mantenere `fantaf1_staging` (utilizzato per i test su Render.com).
- **Supporto CI/CD:** Mantenere `fantaf1_ci` (utilizzato nei workflow di GitHub Actions).
- **Sicurezza:** Identificare chiaramente i database "orfani" o temporanei prima di procedere.

## Analisi Database (da screenshot `db_on_atlas.png`)
1. `admin`, `config`, `local`: Database di sistema di MongoDB. **NON TOCCARE.**
2. `fantaf1`: Produzione. **NON TOCCARE.**
3. `fantaf1_ci`: Utilizzato da `.github/workflows/pr-ci.yml`. **MANTENERE.**
4. `fantaf1_dev`: Utilizzato per lo sviluppo locale Node.js (secondo `AGENTS.md` e `backend/database.js`). **MANTENERE.**
5. `fantaf1_porting`: Utilizzato per lo sviluppo del porting C# (secondo `docs/backend-csharp-porting-plan.md`). **MANTENERE.**
6. `fantaf1_staging`: Utilizzato per l'ambiente di staging su Render.com. **MANTENERE.**
7. `fantaf1_porting_audit_subphase15`: Database di audit per una fase specifica del porting, non referenziato nel codebase attuale. **CANDIDATO ALL'ELIMINAZIONE.**
8. `mongodbVSCodePlaygroundDB`: Database temporaneo generato da VS Code. **CANDIDATO ALL'ELIMINAZIONE.**

## Criteri di Accettazione
1. Identificazione corretta dei database necessari vs superflui.
2. Conferma che l'eliminazione dei database candidati non impatta alcuno script o workflow.
3. Piano d'azione chiaro per l'utente per procedere alla pulizia manuale su Atlas.
