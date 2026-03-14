using FantaF1.Domain;

namespace FantaF1.Application;

public static class ApplicationAssemblyMarker
{
    public static Type DomainDependencyMarker => typeof(DomainAssemblyMarker);
}
