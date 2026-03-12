using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace FantaF1.Api.Endpoints;

public static class PortingBootstrapEndpointRouteBuilderExtensions
{
    public const string ReadyMessage = "FantaF1 backend-csharp bootstrap ready";

    public static IEndpointRouteBuilder MapPortingBootstrapEndpoints(this IEndpointRouteBuilder endpoints)
    {
        ArgumentNullException.ThrowIfNull(endpoints);

        endpoints.MapGet("/", () => Results.Text(ReadyMessage, "text/plain"));

        return endpoints;
    }
}
