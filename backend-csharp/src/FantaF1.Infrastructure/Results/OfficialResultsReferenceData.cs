namespace FantaF1.Infrastructure.Results;

internal static class OfficialResultsReferenceData
{
    public const string BrowserUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    public const string BrowserAcceptLanguage = "it-IT,it;q=0.9,en;q=0.8";

    public const string HighlightsChannelHandle = "@skysportf1";
    public const string HighlightsChannelId = "UCMQ7Gx6v-pQy_gsRoMJYzOA";
    public const string HighlightsChannelSearchBaseUrl = "https://www.youtube.com/@skysportf1/search?query=";
    public const string HighlightsFeedUrl = "https://www.youtube.com/feeds/videos.xml?channel_id=UCMQ7Gx6v-pQy_gsRoMJYzOA";
    public const string HighlightsSearchBaseUrl = "https://www.youtube.com/results?search_query=";
    public const string HighlightsOEmbedBaseUrl = "https://www.youtube.com/oembed?format=json&url=";
    public const string HighlightsPublisherLabel = "Sky Sport Italia F1";
    public const int HighlightsLookupMissingTtlHours = 6;

    public static readonly string[] HighlightsPublisherKeywords =
    [
        "sky sport f1",
        "sky sport formula 1",
        "sky sport italia f1",
    ];

    public static readonly string[] HighlightsPositiveKeywords =
    [
        "gli highlights",
        "highlights gara",
        "highlights",
    ];

    public static readonly string[] HighlightsSecondaryKeywords =
    [
        "sintesi",
        "sintesi lunga",
    ];

    public static readonly string[] HighlightsRequiredKeywords =
    [
        "highlight",
        "highlights",
        "sintesi",
    ];

    public static readonly string[] HighlightsNegativeKeywords =
    [
        "intervista",
        "interviste",
        "commento",
        "analisi",
        "qualifiche",
        "prove libere",
        "fp1",
        "fp2",
        "fp3",
        "notebook",
        "ultimo giro",
    ];

    public static readonly IReadOnlyDictionary<string, string[]> HighlightsRaceAliases =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["emilia romagna"] = ["imola"],
            ["great britain"] = ["silverstone"],
            ["azerbaijan"] = ["baku"],
            ["spain"] = ["barcelona"],
            ["canada"] = ["montreal"],
            ["usa"] = ["austin"],
            ["mexico"] = ["mexico city"],
            ["las vegas"] = ["vegas"],
            ["abu dhabi"] = ["yas marina"],
        };
}
