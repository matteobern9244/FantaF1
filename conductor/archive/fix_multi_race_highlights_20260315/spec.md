# Specification: Fix Multi Race Highlights

## Objective

Ensure the highlights resolver finds videos for every finished race when
available, not just the first race that happens to match current naming
assumptions, and align the unavailable CTA copy to `HIGHLIGHTS NON PRESENTI`.

## Scope

- C# highlights lookup and matching
- Frontend unavailable highlights label
- Conductor track state and verification

## Non-Goals

- No redesign of the results recap UI
- No API contract changes outside the existing `highlightsVideoUrl`
