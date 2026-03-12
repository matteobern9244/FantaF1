using Microsoft.Extensions.DependencyInjection;
using System.Text.Json.Serialization;

namespace FantaF1.Api.DependencyInjection;

public static class ApiServiceCollectionExtensions
{
    public static IServiceCollection AddFantaF1Api(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
            });
        services.AddProblemDetails();

        return services;
    }
}
