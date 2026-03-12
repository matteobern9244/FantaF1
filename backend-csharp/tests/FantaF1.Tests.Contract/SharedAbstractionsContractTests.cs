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
            typeof(IResultsService),
            typeof(ISaveRequestService),
            typeof(ISignedCookieService),
            typeof(IWeekendRepository),
        };

        Assert.Equal(10, abstractionTypes.Length);
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
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(ISaveRequestService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IAdminSessionService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IResultsService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IBackgroundSyncService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.System", typeof(IClock).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.System", typeof(ISignedCookieService).Namespace);
    }
}
