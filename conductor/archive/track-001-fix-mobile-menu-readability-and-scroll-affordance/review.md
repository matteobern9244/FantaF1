# Review

## Findings

- Il font mobile non era sbagliato di per se': il problema veniva dalla
  geometria delle card e dal wrapping troppo compresso per una typeface larga.
- L'overlay mobile non comunicava bene la sezione corrente dopo lo scroll o alla
  riapertura del menu, quindi l'orientamento era peggiore rispetto alla sidebar
  desktop.
- Il layout esistente spendeva troppo spazio in gap e padding laterali,
  lasciando poca larghezza utile alla label.

## Risks

- Basso rischio di regressione desktop: il fix e' confinato ai selettori mobile
  dell'overlay e non cambia la sidebar desktop.
- Basso rischio di regressione semantica: il menu mantiene gli stessi item, lo
  stesso font family e la stessa logica di navigazione.

## Open Gaps

- Nessuno rilevato dopo lint, suite test, build, coverage e responsive checks.

## Decision

- Track completata.
- Manteniamo il font attuale e correggiamo leggibilita' e affordance tramite
  layout, copy container e riepilogo sticky della sezione corrente.
