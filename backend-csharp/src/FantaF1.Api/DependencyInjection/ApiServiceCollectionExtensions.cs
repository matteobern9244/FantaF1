using Microsoft.Extensions.DependencyInjection;

namespace FantaF1.Api.DependencyInjection;

public static class ApiServiceCollectionExtensions
{
    public static IServiceCollection AddFantaF1Api(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddControllers();
        services.AddProblemDetails();

        return services;
    }
}
