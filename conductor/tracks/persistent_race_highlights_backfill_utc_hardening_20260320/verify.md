# Verification: persistent_race_highlights_backfill_utc_hardening_20260320

## Planned Commands

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:csharp-coverage`
- `npm run test:ui-responsive`

## Planned Environment Checks

- Verifica desktop/mobile admin/public in development
- Verifica production-like con build reale
- Verifica startup locale su Mac
- Verifica parita' del launcher Windows dove applicabile
- Verifica coerenza UTC in scenari simulati locali e Render-like

## Executed So Far

- Workspace Conductor materializzato per il nuovo track live
- Track archiviate incoerenti riallineate
- Piano e specifica iniziali creati
- `dotnet test backend-csharp/tests/FantaF1.Tests.Unit/FantaF1.Tests.Unit.csproj --filter "FullyQualifiedName~ResultsServiceTests|FullyQualifiedName~ResultsInfrastructureTests"`
  - Status: failed as expected in RED
  - Failure 1:
    `Highlights_lookup_policy_does_not_consider_a_same_day_race_finished_before_race_start_time`
  - Failure 2:
    `Highlights_lookup_service_uses_the_injected_clock_year_when_the_race_does_not_expose_a_season_year`
- `dotnet test backend-csharp/tests/FantaF1.Tests.Unit/FantaF1.Tests.Unit.csproj --filter "FullyQualifiedName~ResultsServiceTests|FullyQualifiedName~ResultsInfrastructureTests"`
  - Status: passed after minimal GREEN fix
  - Result: `57` tests passed, `0` failed
- `dotnet test backend-csharp/tests/FantaF1.Tests.Unit/FantaF1.Tests.Unit.csproj --filter "FullyQualifiedName~ResultsServiceTests|FullyQualifiedName~ResultsInfrastructureTests|FullyQualifiedName~SubphaseEightBootstrapTests"`
  - Status: passed
  - Result: `112` tests passed, `0` failed
- `dotnet test backend-csharp/tests/FantaF1.Tests.Unit/FantaF1.Tests.Unit.csproj --filter "FullyQualifiedName~MongoWriteRepositoryTests|FullyQualifiedName~SubphaseEightBootstrapTests"`
  - Status: failed as expected in RED
  - Failure 3:
    `Mongo_weekend_repository_does_not_remove_persisted_found_highlights_when_a_new_lookup_is_missing`
  - Failure 4:
    `Official_calendar_sync_service_preserves_persisted_highlights_when_f1_changes_slug_but_round_and_dates_match`
- `dotnet test backend-csharp/tests/FantaF1.Tests.Unit/FantaF1.Tests.Unit.csproj --filter "FullyQualifiedName~MongoWriteRepositoryTests|FullyQualifiedName~SubphaseEightBootstrapTests"`
  - Status: passed after append-only/reconciliation GREEN fix
  - Result: `73` tests passed, `0` failed
- `dotnet test backend-csharp/tests/FantaF1.Tests.Unit/FantaF1.Tests.Unit.csproj --filter "FullyQualifiedName~ResultsInfrastructureTests.Highlights_lookup_service_uses_the_skysportf1_playlists_page_before_channel_search_when_it_contains_a_matching_video"`
  - Status: failed as expected in RED, then passed after playlist priority GREEN
    fix
  - Result: `1` test passed, `0` failed
- `dotnet test backend-csharp/tests/FantaF1.Tests.Unit/FantaF1.Tests.Unit.csproj --filter "FullyQualifiedName~ResultsInfrastructureTests.Highlights_lookup_service_falls_back_to_the_sky_sport_highlights_page_when_youtube_sources_do_not_match"`
  - Status: failed as expected in RED, then passed after Sky page fallback GREEN
    fix
  - Result: `1` test passed, `0` failed
- `dotnet test backend-csharp/tests/FantaF1.Tests.Unit/FantaF1.Tests.Unit.csproj --filter "FullyQualifiedName~ResultsInfrastructureTests.Highlights_lookup_service_falls_back_to_the_sky_sport_highlights_page_when_youtube_sources_do_not_match|FullyQualifiedName~ResultsInfrastructureTests.Highlights_lookup_service_uses_the_skysportf1_playlists_page_before_channel_search_when_it_contains_a_matching_video|FullyQualifiedName~ResultsInfrastructureTests.Highlights_lookup_service_falls_back_to_channel_search_when_the_feed_is_empty|FullyQualifiedName~MongoWriteRepositoryTests|FullyQualifiedName~SubphaseEightBootstrapTests|FullyQualifiedName~ResultsServiceTests|FullyQualifiedName~ResultsInfrastructureTests.Highlights_lookup_service_uses_the_injected_clock_year_when_the_race_does_not_expose_a_season_year"`
  - Status: passed
  - Result: `94` tests passed, `0` failed
- `npm run test:csharp-coverage`
  - Status: passed
  - Result: official backend C# coverage restored to `100%` lines, `100%`
    branches, `100%` methods on `backend-csharp/src`
- `npm run lint`
  - Status: passed
- `npm run test`
  - Status: passed
  - Result: `45` test files passed, `301` tests passed
- `npm run build`
  - Status: passed
- `npm run test:ui-responsive`
  - Status: passed
  - Result: responsive checks passed on mobile, iphone-16-pro-max, tablet,
    laptop, desktop, desktop-xl

## Outcome So Far

- RED confermato su due difetti UTC ad alto rischio locale/Render
- Primo ciclo GREEN completato sui due difetti UTC iniziali
- Regressione startup coperta: niente backfill highlights prima del
  `RaceStartTime` reale nella stessa giornata
- Append-only Mongo coperto: un lookup `missing` non rimuove piu' un link
  highlights gia' persistito
- Riconciliazione calendario rafforzata: slug/URL cambiati da `f1.com` non fanno
  piu' perdere highlights storici se round/date coincidono
- Matching esteso: priorita' alla pagina playlist `@skysportf1` e fallback alla
  pagina highlights `sport.sky.it`
- Validazione repository-wide completata: lint, tests, build, responsive e
  coverage ufficiale backend C# tutti verdi
- Nessun commit o push eseguito
