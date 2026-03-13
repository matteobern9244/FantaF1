using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Persistence;

public interface IWeekendRepository
{
    Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken);

    Task WriteHighlightsLookupAsync(string meetingKey, HighlightsLookupDocument lookup, CancellationToken cancellationToken);
}
