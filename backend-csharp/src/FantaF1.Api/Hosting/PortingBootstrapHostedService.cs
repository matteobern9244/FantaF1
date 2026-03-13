using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using Microsoft.Extensions.Hosting;

namespace FantaF1.Api.Hosting;

public sealed class PortingBootstrapHostedService : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHostApplicationLifetime _applicationLifetime;
    private readonly ILogger<PortingBootstrapHostedService> _logger;

    public PortingBootstrapHostedService(
        IServiceScopeFactory scopeFactory,
        IHostApplicationLifetime applicationLifetime,
        ILogger<PortingBootstrapHostedService> logger)
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _applicationLifetime = applicationLifetime ?? throw new ArgumentNullException(nameof(applicationLifetime));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var services = scope.ServiceProvider;

        _ = services.GetRequiredService<IRuntimeEnvironmentProfileResolver>().ResolveCurrentProfile();
        await services.GetRequiredService<IAdminCredentialRepository>().EnsureDefaultCredentialAsync(cancellationToken);

        _applicationLifetime.ApplicationStarted.Register(() =>
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await using var backgroundScope = _scopeFactory.CreateAsyncScope();
                    await backgroundScope.ServiceProvider
                        .GetRequiredService<IBackgroundSyncService>()
                        .RunAsync(CancellationToken.None);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Background sync bootstrap execution failed.");
                }
            });
        });
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
