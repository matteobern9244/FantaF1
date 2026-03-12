using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;

namespace FantaF1.Tests.Contract;

public sealed class SharedAbstractionsContractTests
{
    [Fact]
    public void Required_shared_abstractions_are_public_interfaces()
    {
        var abstractionTypes = new[]
        {
            typeof(IAdminCredentialRepository),
            typeof(IAdminSessionService),
            typeof(IAppDataRepository),
            typeof(IBackgroundSyncService),
            typeof(IClock),
            typeof(IDriverRepository),
            typeof(IHealthReportService),
            typeof(IResultsService),
            typeof(IRuntimeEnvironmentProfileResolver),
            typeof(ISaveRequestService),
            typeof(ISignedCookieService),
            typeof(IWeekendRepository),
        };

        Assert.Equal(12, abstractionTypes.Length);
        Assert.All(abstractionTypes, type =>
        {
            Assert.True(type.IsInterface);
            Assert.True(type.IsPublic);
        });
    }

    [Fact]
    public void Shared_abstractions_stay_grouped_by_their_technical_seam()
    {
        Assert.Equal("FantaF1.Application.Abstractions.Persistence", typeof(IAppDataRepository).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Persistence", typeof(IDriverRepository).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Persistence", typeof(IWeekendRepository).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Persistence", typeof(IAdminCredentialRepository).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IHealthReportService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(ISaveRequestService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IAdminSessionService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IResultsService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IBackgroundSyncService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.System", typeof(IClock).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.System", typeof(IRuntimeEnvironmentProfileResolver).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.System", typeof(ISignedCookieService).Namespace);
    }

    [Fact]
    public void Admin_session_and_credential_abstractions_expose_the_subphase_four_contract_shape()
    {
        var ensureDefaultCredentialAsync = typeof(IAdminCredentialRepository).GetMethod(nameof(IAdminCredentialRepository.EnsureDefaultCredentialAsync));
        var verifyPasswordAsync = typeof(IAdminCredentialRepository).GetMethod(nameof(IAdminCredentialRepository.VerifyPasswordAsync));
        var getSessionAsync = typeof(IAdminSessionService).GetMethod(nameof(IAdminSessionService.GetSessionAsync));
        var loginAsync = typeof(IAdminSessionService).GetMethod(nameof(IAdminSessionService.LoginAsync));
        var logout = typeof(IAdminSessionService).GetMethod(nameof(IAdminSessionService.Logout));

        Assert.NotNull(ensureDefaultCredentialAsync);
        Assert.Equal(typeof(Task), ensureDefaultCredentialAsync.ReturnType);

        Assert.NotNull(verifyPasswordAsync);
        Assert.Equal(typeof(Task<bool>), verifyPasswordAsync.ReturnType);

        Assert.NotNull(getSessionAsync);
        Assert.Equal(typeof(Task<AdminSessionResponse>), getSessionAsync.ReturnType);

        Assert.NotNull(loginAsync);
        Assert.Equal(typeof(Task<AdminSessionLoginResult>), loginAsync.ReturnType);

        Assert.NotNull(logout);
        Assert.Equal(typeof(AdminSessionCommandResult), logout.ReturnType);
    }
}
