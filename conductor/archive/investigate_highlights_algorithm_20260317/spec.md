# Specification: Investigation of "HIGHLIGHTS" Algorithm

## Problem Summary
- China race highlights are currently visible.
- Australia race highlights have disappeared unexpectedly.
- Other races do not have highlights yet because they have not been run yet (which is expected).

## Scope
- The investigation is **strictly Backend-focused**. It will inspect race-name/slug normalization, date logic, filters, caching, fallback rules, and visibility rules on the backend side.
- Consider the behavior exhibited by the external source: https://sport.sky.it/formula-1/video/highlights
- Evaluate whether the external source's filters affect fetching, parsing, matching, ordering, or visibility.
- **Constraints**: 
  - Do not implement code yet unless required by the plan.
  - Do not modify files unless strictly needed for analysis.
  - Do not execute any git operation (no commit, push, pull, merge, rebase, checkout, branch creation, or other repository-writing git command).

## Expected Outcome
The outcome will be a diagnostic report detailing the root cause, followed by an actionable Implementation Plan to apply the fix. 
Output format of the investigation report must include:
- Problem summary
- Assumptions
- Investigation plan
- Hypotheses
- Validation plan
- Risks
- Clarifying questions (if needed)

## Out of Scope
- Frontend logic for fetching and filtering.
- Direct code changes without a confirmed fix plan.
- Unrelated algorithmic processes outside the scope of Highlights.