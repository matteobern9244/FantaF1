using FantaF1.Application;

namespace FantaF1.Tests.Unit;

public sealed class ApplicationAssemblyMarkerTests
{
    [Fact]
    public void Domain_dependency_marker_points_to_the_domain_assembly()
    {
        Assert.Equal("FantaF1.Domain", ApplicationAssemblyMarker.DomainDependencyMarker.Assembly.GetName().Name);
    }
}
