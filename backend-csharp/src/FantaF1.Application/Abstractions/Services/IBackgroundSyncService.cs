namespace FantaF1.Application.Abstractions.Services;

public interface IBackgroundSyncService
{
    Task RunAsync(CancellationToken cancellationToken);
}
