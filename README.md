# FantaF1 2026

Applicazione privata per gestire il Fanta Formula 1 2026 tra Fabio, Adriano e Matteo.

## Partecipanti

- Matteo e' l'admin dell'applicazione.
- Fabio e Adriano inviano i propri pronostici via WhatsApp.
- Matteo inserisce manualmente nell'app i pronostici di tutti, compreso il proprio.

## Flusso operativo

Prima che inizi il weekend rilevante, Matteo raccoglie e registra i pronostici.

- I pronostici devono essere inseriti prima che partano qualifica, sprint o gara, in base al weekend.
- Per ogni partecipante vengono registrate quattro preferenze:
  - pilota vincitore della gara
  - pilota al secondo posto
  - pilota al terzo posto
  - pole position oppure vincitore della sprint

## Regole di punteggio

- 5 punti per il pilota corretto in prima posizione.
- 3 punti per il pilota corretto in seconda posizione.
- 2 punti per il pilota corretto in terza posizione.
- 1 punto extra per la pole position.
- Nei weekend con Sprint, il punto extra viene assegnato a chi indovina il vincitore della Sprint al posto della pole.

## Cosa fa l'app oggi

- Gestisce la classifica cumulativa dei partecipanti.
- Permette l'inserimento manuale dei pronostici per Fabio, Adriano e Matteo.
- Permette l'inserimento dei risultati reali del Gran Premio.
- Assegna automaticamente i punti in base al regolamento.
- Mantiene uno storico delle gare gia' registrate.
- Salva i dati localmente in `F1Result/data.json`.

## Struttura del progetto

- Frontend: React + TypeScript + Vite
- Backend: Express
- Persistenza locale: cartella `F1Result/`
  - `data.json` per stato dell'app e storico
  - `drivers.json` per la lista piloti disponibile localmente

## Avvio locale

1. Installare le dipendenze:

```bash
npm install
```

2. Avviare il backend:

```bash
node server.js
```

3. Avviare il frontend in sviluppo:

```bash
npm run dev
```

## Nota

Questo repository e' pensato per uso personale e privato, con gestione manuale da parte dell'admin.
