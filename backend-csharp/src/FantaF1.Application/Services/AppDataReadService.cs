using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Services;

public sealed class AppDataReadService : IAppDataReadService
{
    private readonly IAppDataRepository _appDataRepository;
    private readonly IWeekendRepository _weekendRepository;
    private readonly IClock _clock;
    private readonly AppDataSanitizer _appDataSanitizer;

    public AppDataReadService(
        IAppDataRepository appDataRepository,
        IWeekendRepository weekendRepository,
        IClock clock,
        AppDataSanitizer appDataSanitizer)
    {
        _appDataRepository = appDataRepository ?? throw new ArgumentNullException(nameof(appDataRepository));
        _weekendRepository = weekendRepository ?? throw new ArgumentNullException(nameof(weekendRepository));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        _appDataSanitizer = appDataSanitizer ?? throw new ArgumentNullException(nameof(appDataSanitizer));
    }

    public async Task<AppDataDocument> ReadAsync(CancellationToken cancellationToken)
    {
        var calendar = await TryReadCalendarAsync(cancellationToken);

        try
        {
            var storedDocument = await _appDataRepository.ReadLatestAsync(cancellationToken);
            return _appDataSanitizer.Sanitize(storedDocument, calendar, _clock.UtcNow);
        }
        catch
        {
            return _appDataSanitizer.CreateDefaultAppData(calendar, _clock.UtcNow);
        }
    }

    private async Task<IReadOnlyList<WeekendDocument>> TryReadCalendarAsync(CancellationToken cancellationToken)
    {
        try
        {
            return await _weekendRepository.ReadAllAsync(cancellationToken);
        }
        catch
        {
            return [];
        }
    }
}
