namespace FantaF1.Domain.Results;

internal static class OfficialResultsDriverReferenceData
{
    public static readonly IReadOnlyDictionary<string, string> DriverAliases =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["Alex Albon"] = "Alexander Albon",
            ["Ollie Bearman"] = "Oliver Bearman",
        };

    public static readonly IReadOnlyDictionary<string, string> DriverIdOverrides =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["Max Verstappen"] = "ver",
            ["Isack Hadjar"] = "had",
            ["George Russell"] = "rus",
            ["Kimi Antonelli"] = "ant",
            ["Charles Leclerc"] = "lec",
            ["Lewis Hamilton"] = "ham",
            ["Lando Norris"] = "nor",
            ["Oscar Piastri"] = "pia",
            ["Fernando Alonso"] = "alo",
            ["Lance Stroll"] = "str",
            ["Pierre Gasly"] = "gas",
            ["Franco Colapinto"] = "col",
            ["Alexander Albon"] = "alb",
            ["Alex Albon"] = "alb",
            ["Carlos Sainz"] = "sai",
            ["Liam Lawson"] = "law",
            ["Arvid Lindblad"] = "lin",
            ["Esteban Ocon"] = "oco",
            ["Oliver Bearman"] = "bea",
            ["Ollie Bearman"] = "bea",
            ["Nico Hulkenberg"] = "hul",
            ["Gabriel Bortoleto"] = "bor",
            ["Sergio Perez"] = "per",
            ["Valtteri Bottas"] = "bot",
        };
}
