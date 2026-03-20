# Track Specification: Verifica Anti-Regressione Porting C# (Fase 1-9)

## Obiettivo

Verificare l'integrità e la qualità del porting C# implementato fino alla Fase
9, assicurando l'assenza di regressioni rispetto al backend Node (autoritativo)
e il rispetto degli standard ingegneristici del progetto FantaF1.

## Criteri di Accettazione

1.  **Copertura Totale:** Entrambi gli stack (Node/React e C#) devono mantenere
    il 100% di copertura test.
2.  **Parità Funzionale:** Tutte le rotte migrate (Fasi 1-7) devono restituire
    payload identici (flat shape, field names, HTTP status) tra Node e C#.
3.  **Integrità Bootstrap (Fase 8):** Il backend C# deve eseguire correttamente
    l'admin seed e la sincronizzazione in background senza bloccare lo startup.
4.  **Validità Strumenti (Fase 9):** Il launcher e gli script di verifica devono
    supportare correttamente il runtime C# senza fallback silenti su
    `fantaf1_dev`.
5.  **Sicurezza:** Nessuna mutazione ammessa su `fantaf1` o `fantaf1_dev`
    durante i test di porting.
