using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Services;

public interface IResultsService
{
    Task<OfficialResultsDocument> ReadAsync(string meetingKey, CancellationToken cancellationToken);
}
