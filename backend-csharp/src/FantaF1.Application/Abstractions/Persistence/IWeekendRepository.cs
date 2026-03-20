using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Persistence;

public interface IWeekendRepository : IRepository<WeekendDocument, string>
{
    Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken);
    Task WriteAllAsync(IReadOnlyList<WeekendDocument> weekends, CancellationToken cancellationToken);
    Task WriteHighlightsLookupAsync(string meetingKey, HighlightsLookupDocument lookup, CancellationToken cancellationToken);
}
