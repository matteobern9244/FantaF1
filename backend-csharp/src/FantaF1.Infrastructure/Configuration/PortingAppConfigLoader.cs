using System.Text.Json;
using FantaF1.Application.Abstractions.System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace FantaF1.Infrastructure.Configuration;

public sealed class PortingAppConfigLoader
{
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _hostEnvironment;
    private readonly IClock _clock;

    public PortingAppConfigLoader(
        IConfiguration configuration,
        IHostEnvironment hostEnvironment,
        IClock clock)
    {
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _hostEnvironment = hostEnvironment ?? throw new ArgumentNullException(nameof(hostEnvironment));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
    }

    public PortingAppConfig Load()
    {
        var currentYear = _clock.UtcNow.Year;
        var document = JsonDocument.Parse(File.ReadAllText(ResolveConfigPath()));
        var root = document.RootElement;
        var driversSource = root.GetProperty("driversSource");
        var calendarSource = root.GetProperty("calendarSource");

        var userAgent = driversSource.GetProperty("requestHeaders").GetProperty("userAgent").GetString() ?? string.Empty;
        var acceptLanguage = driversSource.GetProperty("requestHeaders").GetProperty("acceptLanguage").GetString() ?? string.Empty;

        return new PortingAppConfig(
            currentYear,
            new PortingDriversSourceConfig(
                $"{driversSource.GetProperty("statsBaseUrl").GetString()?.TrimEnd('/')}/{currentYear}.aspx",
                driversSource.GetProperty("formulaOneDriversUrl").GetString() ?? string.Empty,
                driversSource.GetProperty("sortLocale").GetString() ?? "it",
                driversSource.GetProperty("expectedCount").GetInt32(),
                userAgent,
                acceptLanguage,
                ReadStringMap(root, "driverAliases"),
                ReadStringMap(root, "driverIdOverrides"),
                ReadStringMap(root, "teamAliases"),
                ReadStringMap(root, "teamSlugNames"),
                ReadStringMap(root, "teamColors")),
            new PortingCalendarSourceConfig(
                $"{calendarSource.GetProperty("baseUrl").GetString()?.TrimEnd('/')}/{currentYear}",
                calendarSource.GetProperty("expectedMinimumWeekends").GetInt32(),
                userAgent,
                acceptLanguage));
    }

    public string ResolveFrontendBuildPath()
    {
        var configuredPath = _configuration[PortingFrontendOptions.BuildPathConfigurationKey];
        if (!string.IsNullOrWhiteSpace(configuredPath))
        {
            return Path.GetFullPath(configuredPath, _hostEnvironment.ContentRootPath);
        }

        return Path.Combine(ResolveRepositoryRoot(), "dist");
    }

    private string ResolveConfigPath()
    {
        return Path.Combine(ResolveRepositoryRoot(), "config", "app-config.json");
    }

    private string ResolveRepositoryRoot()
    {
        var directory = new DirectoryInfo(_hostEnvironment.ContentRootPath);

        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "AGENTS.md")))
        {
            directory = directory.Parent;
        }

        return directory?.FullName
            ?? throw new DirectoryNotFoundException("Unable to resolve the repository root from the current content root.");
    }

    private static IReadOnlyDictionary<string, string> ReadStringMap(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var property) || property.ValueKind != JsonValueKind.Object)
        {
            return new Dictionary<string, string>(StringComparer.Ordinal);
        }

        return property.EnumerateObject()
            .ToDictionary(
                static entry => entry.Name,
                static entry => entry.Value.GetString() ?? string.Empty,
                StringComparer.Ordinal);
    }
}
