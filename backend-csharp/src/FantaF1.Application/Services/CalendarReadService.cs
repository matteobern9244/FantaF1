using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Services;

public sealed class CalendarReadService : ICalendarReadService
{
    private readonly IWeekendRepository _weekendRepository;
    private readonly CalendarOrderingService _calendarOrderingService;

    public CalendarReadService(
        IWeekendRepository weekendRepository,
        CalendarOrderingService calendarOrderingService)
    {
        _weekendRepository = weekendRepository ?? throw new ArgumentNullException(nameof(weekendRepository));
        _calendarOrderingService = calendarOrderingService ?? throw new ArgumentNullException(nameof(calendarOrderingService));
    }

    public async Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken)
    {
        IReadOnlyList<WeekendDocument> weekends;

        try
        {
            weekends = await _weekendRepository.ReadAllAsync(cancellationToken);
        }
        catch
        {
            return [];
        }

        return _calendarOrderingService.Order(weekends);
    }
}
