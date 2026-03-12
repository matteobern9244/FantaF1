using FantaF1.Application;
using FantaF1.Domain;

namespace FantaF1.Infrastructure;

public static class InfrastructureAssemblyMarker
{
    public static Type ApplicationDependencyMarker => typeof(ApplicationAssemblyMarker);

    public static Type DomainDependencyMarker => typeof(DomainAssemblyMarker);
}
