using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Services;

public interface ICalendarReadService
{
    Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken);
}
