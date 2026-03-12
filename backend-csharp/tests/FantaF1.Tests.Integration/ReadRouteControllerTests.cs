using FantaF1.Api.Controllers;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;
using Microsoft.AspNetCore.Mvc;

namespace FantaF1.Tests.Integration;

public sealed class ReadRouteControllerTests
{
    [Fact]
    public void Read_route_controllers_reject_null_dependencies()
    {
        Assert.Throws<ArgumentNullException>(() => new AppDataController(null!));
        Assert.Throws<ArgumentNullException>(() => new DriversController(null!));
        Assert.Throws<ArgumentNullException>(() => new CalendarController(null!));
    }

    [Fact]
    public async Task Read_route_controllers_return_ok_when_the_services_succeed()
    {
        var appDataController = new AppDataController(new StubAppDataReadService());
        var driversController = new DriversController(new StubDriverReadService());
        var calendarController = new CalendarController(new StubCalendarReadService());

        var dataResult = await appDataController.GetData(CancellationToken.None);
        var driversResult = await driversController.GetDrivers(CancellationToken.None);
        var calendarResult = await calendarController.GetCalendar(CancellationToken.None);

        Assert.IsType<OkObjectResult>(dataResult);
        Assert.IsType<OkObjectResult>(driversResult);
        Assert.IsType<OkObjectResult>(calendarResult);
    }

    private sealed class StubAppDataReadService : IAppDataReadService
    {
        public Task<AppDataDocument> ReadAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult(new AppDataDocument([], [], string.Empty, new PredictionDocument("", "", "", ""), string.Empty, new Dictionary<string, WeekendPredictionStateDocument>()));
        }
    }

    private sealed class StubDriverReadService : IDriverReadService
    {
        public Task<IReadOnlyList<DriverDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<DriverDocument>>([]);
        }
    }

    private sealed class StubCalendarReadService : ICalendarReadService
    {
        public Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<WeekendDocument>>([]);
        }
    }
}
