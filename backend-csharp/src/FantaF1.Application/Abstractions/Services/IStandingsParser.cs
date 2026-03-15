using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Services;

public interface IStandingsParser
{
    IReadOnlyList<DriverStandingDocument> ParseDriverStandings(
        string rawContent,
        IReadOnlyList<DriverDocument> drivers);

    IReadOnlyList<ConstructorStandingDocument> ParseConstructorStandings(string rawContent);
}
