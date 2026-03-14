namespace FantaF1.Infrastructure.Configuration;

public sealed record PortingDriversSourceConfig(
    string StatsUrl,
    string FormulaOneDriversUrl,
    string SortLocale,
    int ExpectedCount,
    string UserAgent,
    string AcceptLanguage,
    IReadOnlyDictionary<string, string> DriverAliases,
    IReadOnlyDictionary<string, string> DriverIdOverrides,
    IReadOnlyDictionary<string, string> TeamAliases,
    IReadOnlyDictionary<string, string> TeamSlugNames,
    IReadOnlyDictionary<string, string> TeamColors);

public sealed record PortingCalendarSourceConfig(
    string SeasonUrl,
    int ExpectedMinimumWeekends,
    string UserAgent,
    string AcceptLanguage);

public sealed record PortingAppConfig(
    int CurrentYear,
    PortingDriversSourceConfig Drivers,
    PortingCalendarSourceConfig Calendar);
