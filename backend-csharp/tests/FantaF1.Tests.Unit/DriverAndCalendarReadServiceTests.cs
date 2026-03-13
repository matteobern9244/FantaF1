using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Services;
using FantaF1.Domain.ReadModels;
using System.Reflection;

namespace FantaF1.Tests.Unit;

public sealed class DriverAndCalendarReadServiceTests
{
    [Fact]
    public void Driver_and_calendar_read_services_reject_null_dependencies()
    {
        var driverRepository = new StubDriverRepository();
        var weekendRepository = new StubWeekendRepository();
        var driverOrderingService = new DriverOrderingService();
        var calendarOrderingService = new CalendarOrderingService();

        Assert.Throws<ArgumentNullException>(() => new DriverReadService(null!, driverOrderingService));
        Assert.Throws<ArgumentNullException>(() => new DriverReadService(driverRepository, null!));
        Assert.Throws<ArgumentNullException>(() => new CalendarReadService(null!, calendarOrderingService));
        Assert.Throws<ArgumentNullException>(() => new CalendarReadService(weekendRepository, null!));
    }

    [Fact]
    public async Task Driver_read_service_returns_it_locale_sorted_drivers_and_falls_back_to_an_empty_payload_on_repository_errors()
    {
        var service = new DriverReadService(
            new StubDriverRepository(
            [
                new DriverDocument("zed", "Zed Driver", "Team A", "red", null, null),
                new DriverDocument("ecl", "Èclair Driver", "Team A", "blue", null, null),
                new DriverDocument("alpha", "alpha driver", "Team A", "green", null, null),
            ]),
            new DriverOrderingService());

        var orderedDrivers = await service.ReadAllAsync(CancellationToken.None);
        var fallbackDrivers = await new DriverReadService(
            new StubDriverRepository(exception: new InvalidOperationException("driver read failed")),
            new DriverOrderingService())
            .ReadAllAsync(CancellationToken.None);

        Assert.Equal(
            ["alpha driver", "Èclair Driver", "Zed Driver"],
            orderedDrivers.Select(driver => driver.Name).ToArray());
        Assert.Empty(fallbackDrivers);
    }

    [Fact]
    public async Task Calendar_read_service_returns_round_sorted_weekends_and_falls_back_to_an_empty_payload_on_repository_errors()
    {
        var service = new CalendarReadService(
            new StubWeekendRepository(
            [
                new WeekendDocument("race-2", "Race 2", "Grand Prix 2", 2, null, null, null, null, false, null, null, null, [], string.Empty, string.Empty, string.Empty, string.Empty),
                new WeekendDocument("race-1", "Race 1", "Grand Prix 1", 1, null, null, null, null, false, null, null, null, [], string.Empty, string.Empty, string.Empty, string.Empty),
            ]),
            new CalendarOrderingService());

        var orderedCalendar = await service.ReadAllAsync(CancellationToken.None);
        var fallbackCalendar = await new CalendarReadService(
            new StubWeekendRepository(exception: new InvalidOperationException("calendar read failed")),
            new CalendarOrderingService())
            .ReadAllAsync(CancellationToken.None);

        Assert.Equal(["race-1", "race-2"], orderedCalendar.Select(weekend => weekend.MeetingKey).ToArray());
        Assert.Empty(fallbackCalendar);
    }

    [Fact]
    public void Driver_name_comparer_handles_reference_null_and_locale_cases()
    {
        var alphaDriver = new DriverDocument("alpha", "alpha", "Team", "blue", null, null);
        var accentedDriver = new DriverDocument("accent", "Èclair", "Team", "red", null, null);

        Assert.Equal(0, CompareDrivers(alphaDriver, alphaDriver));
        Assert.Equal(-1, CompareDrivers(null, alphaDriver));
        Assert.Equal(1, CompareDrivers(alphaDriver, null));
        Assert.True(CompareDrivers(alphaDriver, accentedDriver) < 0);
    }

    [Fact]
    public void Weekend_round_comparer_handles_reference_null_and_equal_round_cases()
    {
        var firstWeekend = new WeekendDocument("race-1", "Race 1", "Grand Prix 1", 1, null, null, null, null, false, null, null, null, [], string.Empty, string.Empty, string.Empty, string.Empty);
        var secondWeekend = new WeekendDocument("race-2", "Race 2", "Grand Prix 2", 2, null, null, null, null, false, null, null, null, [], string.Empty, string.Empty, string.Empty, string.Empty);
        var equalRoundWeekend = new WeekendDocument("race-3", "Race 3", "Grand Prix 3", 2, null, null, null, null, false, null, null, null, [], string.Empty, string.Empty, string.Empty, string.Empty);
        var missingRoundWeekend = new WeekendDocument("race-4", "Race 4", "Grand Prix 4", null, null, null, null, null, false, null, null, null, [], string.Empty, string.Empty, string.Empty, string.Empty);

        Assert.Equal(0, CompareWeekends(secondWeekend, secondWeekend));
        Assert.Equal(-1, CompareWeekends(null, firstWeekend));
        Assert.Equal(1, CompareWeekends(firstWeekend, null));
        Assert.True(CompareWeekends(firstWeekend, secondWeekend) < 0);
        Assert.Equal(0, CompareWeekends(secondWeekend, equalRoundWeekend));
        Assert.Equal(0, CompareWeekends(missingRoundWeekend, equalRoundWeekend));
    }

    private static int CompareDrivers(DriverDocument? firstDriver, DriverDocument? secondDriver)
    {
        var comparerType = typeof(DriverOrderingService).GetNestedType("DriverNameComparer", BindingFlags.NonPublic)!;
        var instance = comparerType.GetProperty("Instance", BindingFlags.Public | BindingFlags.Static)!.GetValue(null)!;
        var compare = comparerType.GetMethod("Compare", BindingFlags.Instance | BindingFlags.Public)!;
        return (int)compare.Invoke(instance, [firstDriver, secondDriver])!;
    }

    private static int CompareWeekends(WeekendDocument? firstWeekend, WeekendDocument? secondWeekend)
    {
        var comparerType = typeof(CalendarOrderingService).GetNestedType("WeekendRoundComparer", BindingFlags.NonPublic)!;
        var instance = comparerType.GetProperty("Instance", BindingFlags.Public | BindingFlags.Static)!.GetValue(null)!;
        var compare = comparerType.GetMethod("Compare", BindingFlags.Instance | BindingFlags.Public)!;
        return (int)compare.Invoke(instance, [firstWeekend, secondWeekend])!;
    }

    private sealed class StubDriverRepository : IDriverRepository
    {
        private readonly IReadOnlyList<DriverDocument> _documents;
        private readonly Exception? _exception;

        public StubDriverRepository(IReadOnlyList<DriverDocument>? documents = null, Exception? exception = null)
        {
            _documents = documents ?? [];
            _exception = exception;
        }

        public Task<IReadOnlyList<DriverDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            if (_exception is not null)
            {
                throw _exception;
            }

            return Task.FromResult(_documents);
        }
    }

    private sealed class StubWeekendRepository : IWeekendRepository
    {
        private readonly IReadOnlyList<WeekendDocument> _documents;
        private readonly Exception? _exception;

        public StubWeekendRepository(IReadOnlyList<WeekendDocument>? documents = null, Exception? exception = null)
        {
            _documents = documents ?? [];
            _exception = exception;
        }

        public Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            if (_exception is not null)
            {
                throw _exception;
            }

            return Task.FromResult(_documents);
        }

        public Task WriteHighlightsLookupAsync(string meetingKey, HighlightsLookupDocument lookup, CancellationToken cancellationToken)
        {
            throw new NotSupportedException();
        }
    }
}
