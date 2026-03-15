namespace FantaF1.Infrastructure.Standings;

public static class OfficialStandingsReferenceData
{
    public const string BaseUrl = "https://www.formula1.com/en/results.html";
    public const string DriversPathTemplate = "{year}/drivers.html";
    public const string ConstructorsPathTemplate = "{year}/team.html";
    public const string BrowserUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    public const string BrowserAcceptLanguage = "it-IT,it;q=0.9,en;q=0.8";
    public const string DefaultTeamColor = "#5F6673";

    public static IReadOnlyDictionary<string, string> TeamAliases { get; } =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["Red Bull Racing"] = "Red Bull",
            ["Visa Cash App Racing Bulls"] = "Racing Bulls",
            ["Cadillac F1 Team"] = "Cadillac",
        };

    public static IReadOnlyDictionary<string, string> TeamColors { get; } =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["McLaren"] = "#FF8700",
            ["Mercedes"] = "#00D2BE",
            ["Red Bull"] = "#0600EF",
            ["Ferrari"] = "#EF1A2D",
            ["Williams"] = "#005AFF",
            ["Racing Bulls"] = "#6692FF",
            ["Aston Martin"] = "#006F62",
            ["Haas"] = "#FFFFFF",
            ["Audi"] = "#000000",
            ["Alpine"] = "#0090FF",
            ["Cadillac"] = "#C5A66A",
            ["default"] = DefaultTeamColor,
        };

    public static IReadOnlyDictionary<string, string> TeamLogoUrls { get; } =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["McLaren"] = "https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2025/mclaren/2025mclarenlogowhite.webp",
            ["Mercedes"] = "https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2025/mercedes/2025mercedeslogowhite.webp",
            ["Red Bull"] = "https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2025/redbullracing/2025redbullracinglogowhite.webp",
            ["Ferrari"] = "https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2025/ferrari/2025ferrarilogolight.webp",
            ["Williams"] = "https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2025/williams/2025williamslogowhite.webp",
            ["Racing Bulls"] = "https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2025/racingbulls/2025racingbullslogowhite.webp",
            ["Aston Martin"] = "https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2025/astonmartin/2025astonmartinlogowhite.webp",
            ["Haas"] = "https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2025/haas/2025haaslogowhite.webp",
            ["Audi"] = "https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2026/audi/2026audilogowhite.webp",
            ["Alpine"] = "https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2025/alpine/2025alpinelogowhite.webp",
            ["Cadillac"] = "https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2026/cadillac/2026cadillaclogowhite.webp",
        };
}
