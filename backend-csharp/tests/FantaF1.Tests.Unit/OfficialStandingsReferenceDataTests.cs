using FantaF1.Infrastructure.Standings;

namespace FantaF1.Tests.Unit;

public sealed class OfficialStandingsReferenceDataTests
{
    [Fact]
    public void Official_standings_reference_data_exposes_the_expected_constants_and_mappings()
    {
        Assert.Equal("https://www.formula1.com/en/results.html", OfficialStandingsReferenceData.BaseUrl);
        Assert.Equal("{year}/drivers.html", OfficialStandingsReferenceData.DriversPathTemplate);
        Assert.Equal("{year}/team.html", OfficialStandingsReferenceData.ConstructorsPathTemplate);
        Assert.Equal("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36", OfficialStandingsReferenceData.BrowserUserAgent);
        Assert.Equal("it-IT,it;q=0.9,en;q=0.8", OfficialStandingsReferenceData.BrowserAcceptLanguage);
        Assert.Equal("#5F6673", OfficialStandingsReferenceData.DefaultTeamColor);

        Assert.Equal("Red Bull", OfficialStandingsReferenceData.TeamAliases["Red Bull Racing"]);
        Assert.Equal("Racing Bulls", OfficialStandingsReferenceData.TeamAliases["Visa Cash App Racing Bulls"]);
        Assert.Equal("Cadillac", OfficialStandingsReferenceData.TeamAliases["Cadillac F1 Team"]);

        Assert.Equal("#EF1A2D", OfficialStandingsReferenceData.TeamColors["Ferrari"]);
        Assert.Equal("#C5A66A", OfficialStandingsReferenceData.TeamColors["Cadillac"]);
        Assert.Equal(OfficialStandingsReferenceData.DefaultTeamColor, OfficialStandingsReferenceData.TeamColors["default"]);

        Assert.Equal("https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2025/ferrari/2025ferrarilogolight.webp", OfficialStandingsReferenceData.TeamLogoUrls["Ferrari"]);
        Assert.Equal("https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2026/cadillac/2026cadillaclogowhite.webp", OfficialStandingsReferenceData.TeamLogoUrls["Cadillac"]);
    }
}
