using FantaF1.Api.Controllers;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Tests.Integration;

public sealed class ResultsControllerTests
{
    [Fact]
    public void Results_controller_rejects_a_null_results_service()
    {
        Assert.Throws<ArgumentNullException>(() => new ResultsController(null!));
    }

    [Fact]
    public async Task Results_controller_returns_the_node_compatible_500_payload()
    {
        var controller = new ResultsController(new ThrowingResultsService());

        var result = await controller.GetResults("race-1", CancellationToken.None);

        var objectResult = Assert.IsType<Microsoft.AspNetCore.Mvc.ObjectResult>(result);
        Assert.Equal(500, objectResult.StatusCode);
        var payload = objectResult.Value!;
        Assert.Equal("Failed to fetch results", payload.GetType().GetProperty("error")!.GetValue(payload));
        Assert.Equal("controller failure", payload.GetType().GetProperty("details")!.GetValue(payload));
    }

    private sealed class ThrowingResultsService : IResultsService
    {
        public Task<OfficialResultsDocument> ReadAsync(string meetingKey, CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("controller failure");
        }
    }
}
