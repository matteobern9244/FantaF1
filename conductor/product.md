# Initial Concept

FantaF1: Un'applicazione full-stack privata per gestire una lega di Fanta
Formula 1 con 3 partecipanti fissi e un amministratore.

# Product Definition

## Panoramica

FantaF1 è una piattaforma specializzata per una lega fantasy privata,
focalizzata su un flusso di lavoro amministrato per 3 partecipanti fissi.
L'applicazione offre un'esperienza fluida su browser desktop e mobile,
funzionando come una Progressive Web App (PWA). L'interfaccia adotta un design
adattivo con una sidebar fissa a sinistra per desktop e un menu overlay a tutto
schermo per mobile, garantendo un'esperienza immersiva in stile F1.

## Pubblico di Riferimento

- **Amministratore della Lega Privata:** Responsabile della gestione dei
  weekend, dei pronostici e dei risultati reali delle gare.
- **3 Partecipanti Fissi:** Utenti che inseriscono i pronostici e seguono le
  classifiche.
- **Utenti Browser/PWA:** Utenti che accedono alla piattaforma tramite browser
  web su vari dispositivi.

## Funzionalità Core

- **Logica dei Pronostici:** Gestione di 4 pronostici per partecipante a weekend
  (Vincitore, 2°, 3° e Pole/Sprint).
- **Punteggi e Proiezioni:** Calcolo dei punti storici consolidati e proiezioni
  live in tempo reale durante i weekend di gara.
- **Analytics e Pulse:** Analisi stagionale, KPI per utente e riepilogo "Weekend
  Pulse".
- **Gestione Storico:** Storico gare modificabile con ricalcolo automatico dei
  punteggi.

## Requisiti Tecnici e Sicurezza

- **Sincronizzazione API Esterne:** Recupero automatico dei risultati reali
  delle gare da Formula1.com.
- **Sessione di Autenticazione Admin:** Accesso amministrativo sicuro protetto
  da sessioni cookie HTTP-only.
- **Persistenza MongoDB:** Archiviazione robusta dello stato del gioco, del
  roster piloti e del calendario stagionale.

## Standard di Qualità

- **Copertura TDD al 100%:** Sviluppo guidato dai test (TDD) obbligatorio per
  ogni cambiamento comportamentale per garantire la massima stabilità.
- **Mobile-First Responsive:** Navigazione ed elementi UI ottimizzati per
  un'esperienza fluida su smartphone.
- **Production-Safe Mindset:** Rispetto rigoroso degli standard ingegneristici
  con zero delta funzionale tra codice e produzione live.
