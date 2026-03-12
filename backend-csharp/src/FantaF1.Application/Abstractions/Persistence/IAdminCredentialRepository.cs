namespace FantaF1.Application.Abstractions.Persistence;

public interface IAdminCredentialRepository
{
    Task EnsureDefaultCredentialAsync(CancellationToken cancellationToken);

    Task<bool> VerifyPasswordAsync(string password, CancellationToken cancellationToken);
}
