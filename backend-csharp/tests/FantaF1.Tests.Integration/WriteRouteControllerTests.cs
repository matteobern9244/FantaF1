using FantaF1.Api.Controllers;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace FantaF1.Tests.Integration;

public sealed class WriteRouteControllerTests
{
    [Fact]
    public async Task Save_controllers_translate_success_and_error_outcomes()
    {
        var appDataController = new AppDataController(new StubAppDataReadService(), new StubSaveRequestService(new SaveSuccessOutcome(new SaveSuccessPayload("ok"))));
        var predictionsController = new PredictionsController(new StubSaveRequestService(new SaveErrorOutcome(
            SaveRouteContract.ForbiddenStatusCode,
            new SaveErrorPayload("locked", SaveRouteContract.RaceLockedCode, "req-1", "details"))));
        appDataController.ControllerContext = BuildControllerContext();
        predictionsController.ControllerContext = BuildControllerContext();

        var dataResult = await appDataController.SaveData(CreatePayload(), CancellationToken.None);
        var predictionsResult = await predictionsController.SavePredictions(CreatePayload(), CancellationToken.None);

        Assert.IsType<OkObjectResult>(dataResult);
        var predictionStatus = Assert.IsType<ObjectResult>(predictionsResult);
        Assert.Equal(SaveRouteContract.ForbiddenStatusCode, predictionStatus.StatusCode);
    }

    [Fact]
    public async Task Save_controllers_fall_back_to_a_500_for_unexpected_outcomes()
    {
        var appDataController = new AppDataController(new StubAppDataReadService(), new StubSaveRequestService(new UnknownOutcome()));
        var predictionsController = new PredictionsController(new StubSaveRequestService(new UnknownOutcome()));
        appDataController.ControllerContext = BuildControllerContext();
        predictionsController.ControllerContext = BuildControllerContext();

        var dataResult = await appDataController.SaveData(CreatePayload(), CancellationToken.None);
        var predictionsResult = await predictionsController.SavePredictions(CreatePayload(), CancellationToken.None);

        var dataStatus = Assert.IsType<StatusCodeResult>(dataResult);
        var predictionsStatus = Assert.IsType<StatusCodeResult>(predictionsResult);
        Assert.Equal(500, dataStatus.StatusCode);
        Assert.Equal(500, predictionsStatus.StatusCode);
    }

    private static AppDataDocument CreatePayload()
    {
        return new AppDataDocument([], [], string.Empty, new PredictionDocument("", "", "", ""), string.Empty, null);
    }

    private static ControllerContext BuildControllerContext()
    {
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext(),
        };
    }

    private sealed class StubAppDataReadService : IAppDataReadService
    {
        public Task<AppDataDocument> ReadAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult(CreatePayload());
        }
    }

    private sealed class StubSaveRequestService : ISaveRequestService
    {
        private readonly SaveRequestOutcome _outcome;

        public StubSaveRequestService(SaveRequestOutcome outcome)
        {
            _outcome = outcome;
        }

        public Task<SaveRequestOutcome> SaveDataAsync(AppDataDocument? requestBody, string? cookieHeader, CancellationToken cancellationToken)
        {
            return Task.FromResult(_outcome);
        }

        public Task<SaveRequestOutcome> SavePredictionsAsync(AppDataDocument? requestBody, string? cookieHeader, CancellationToken cancellationToken)
        {
            return Task.FromResult(_outcome);
        }
    }

    private sealed record UnknownOutcome : SaveRequestOutcome;
}
