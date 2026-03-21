using FantaF1.Infrastructure;

namespace FantaF1.Tests.Unit;

public sealed class InfrastructureAssemblyMarkerTests
{
    [Fact]
    public void Application_and_domain_dependency_markers_point_to_the_expected_assemblies()
    {
        Assert.Equal("FantaF1.Application", InfrastructureAssemblyMarker.ApplicationDependencyMarker.Assembly.GetName().Name);
        Assert.Equal("FantaF1.Domain", InfrastructureAssemblyMarker.DomainDependencyMarker.Assembly.GetName().Name);
    }
}
