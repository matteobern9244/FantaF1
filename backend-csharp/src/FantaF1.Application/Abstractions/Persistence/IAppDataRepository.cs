using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Persistence;

public interface IAppDataRepository
{
    Task<AppDataDocument?> ReadLatestAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<string>?> ReadPersistedParticipantRosterAsync(CancellationToken cancellationToken);

    Task WriteAsync(AppDataDocument document, CancellationToken cancellationToken);
}
