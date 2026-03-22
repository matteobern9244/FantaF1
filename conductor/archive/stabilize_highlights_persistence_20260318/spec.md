# Specification: Persistenza Definitiva Highlights Per Gara

## Problem Summary

- Gli highlights sono gia' persistiti per gara tramite `meetingKey` nei
  documenti `weekends`.
- Il sync calendario C# ricostruisce la collezione `weekends` e puo'
  sovrascrivere un `found` gia' persistito con un nuovo `missing`.
- Questo produce divergenze tra locale e staging a parita' di versione quando
  bootstrap e lookup esterni avvengono in momenti diversi.

## In Scope

- Backend C# autorevole:
  - persistenza highlights per gara nei documenti `weekends`
  - merge policy anti-downgrade durante `OfficialCalendarSyncService.SyncAsync`
  - allineamento del clock del sync calendario a `IClock`
- Test backend regressivi su persistenza `found`, `missing`, eccezioni e gating
  temporale
- Verifiche UI/browser anti-regressione gia' esistenti sui CTA highlights
- Artifact Conductor per tracciare lavoro, verifiche e decisioni

## Out Of Scope

- Nuova collection Mongo dedicata agli highlights
- Cambi di contratto API/frontend
- Modifiche a scoring, projections, lock, history, save flows
- Qualsiasi operazione git di commit/push/pull/merge/rebase/tag

## Success Criteria

- Un `highlightsVideoUrl` gia' trovato per una gara non viene piu' perso da un
  sync successivo che restituisce `missing` o che fallisce.
- Un nuovo lookup `found` continua ad aggiornare correttamente la gara
  corrispondente.
- Il sync calendario usa il clock iniettato e non legge il tempo globale in modo
  diretto.
- Le validazioni repository richieste restano verdi e la coverage ufficiale
  rimane al 80%.
