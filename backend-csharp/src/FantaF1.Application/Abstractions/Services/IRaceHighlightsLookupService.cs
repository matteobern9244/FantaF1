using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Services;

public interface IRaceHighlightsLookupService
{
    bool ShouldLookup(WeekendDocument race, DateTimeOffset now);

    Task<HighlightsLookupDocument> ResolveAsync(WeekendDocument race, CancellationToken cancellationToken);
}
