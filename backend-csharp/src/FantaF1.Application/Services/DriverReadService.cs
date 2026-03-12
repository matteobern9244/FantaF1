using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Services;

public sealed class DriverReadService : IDriverReadService
{
    private readonly IDriverRepository _driverRepository;
    private readonly DriverOrderingService _driverOrderingService;

    public DriverReadService(
        IDriverRepository driverRepository,
        DriverOrderingService driverOrderingService)
    {
        _driverRepository = driverRepository ?? throw new ArgumentNullException(nameof(driverRepository));
        _driverOrderingService = driverOrderingService ?? throw new ArgumentNullException(nameof(driverOrderingService));
    }

    public async Task<IReadOnlyList<DriverDocument>> ReadAllAsync(CancellationToken cancellationToken)
    {
        IReadOnlyList<DriverDocument> drivers;

        try
        {
            drivers = await _driverRepository.ReadAllAsync(cancellationToken);
        }
        catch
        {
            return [];
        }

        return _driverOrderingService.Order(drivers);
    }
}
