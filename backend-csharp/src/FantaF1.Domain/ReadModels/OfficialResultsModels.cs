namespace FantaF1.Domain.ReadModels;

public sealed record HighlightsLookupDocument(
    string HighlightsVideoUrl,
    string HighlightsLookupCheckedAt,
    string HighlightsLookupStatus,
    string HighlightsLookupSource);

public sealed record OfficialResultsDocument(
    string First,
    string Second,
    string Third,
    string Pole,
    string RacePhase,
    string HighlightsVideoUrl);
