using System.Text;

namespace FantaF1.Tests.Unit;

public sealed class PortingLegacyRemovalRepositoryConsistencyTests
{
    [Fact]
    public void Legacy_backend_presence_matches_the_subphase_eleven_ledger_state()
    {
        var canonicalPlan = ReadRepositoryFile("docs", "backend-csharp-porting-plan.md");
        var subphaseElevenCompleted = canonicalPlan.Contains("| `Subphase 11` | `completed` |", StringComparison.Ordinal);

        var backendDirectoryExists = Directory.Exists(GetRepositoryPath("backend"));
        var appJsExists = File.Exists(GetRepositoryPath("app.js"));
        var serverJsExists = File.Exists(GetRepositoryPath("server.js"));

        if (subphaseElevenCompleted)
        {
            Assert.False(backendDirectoryExists, "The legacy backend directory must be removed after Subphase 11 is completed.");
            Assert.False(appJsExists, "app.js must be removed after Subphase 11 is completed.");
            Assert.False(serverJsExists, "server.js must be removed after Subphase 11 is completed.");
            return;
        }

        Assert.True(backendDirectoryExists, "The legacy backend directory must still exist before Subphase 11 is completed.");
        Assert.True(appJsExists, "app.js must still exist before Subphase 11 is completed.");
        Assert.True(serverJsExists, "server.js must still exist before Subphase 11 is completed.");
    }

    [Fact]
    public void Final_runtime_wiring_must_drop_legacy_node_backend_references_only_after_subphase_eleven_completion()
    {
        var canonicalPlan = ReadRepositoryFile("docs", "backend-csharp-porting-plan.md");
        var subphaseElevenCompleted = canonicalPlan.Contains("| `Subphase 11` | `completed` |", StringComparison.Ordinal);
        var filesToInspect = new[]
        {
            "start_fantaf1.command",
            "package.json",
            Path.Combine("scripts", "dev-launcher.mjs"),
            Path.Combine("scripts", "save-local-check.mjs"),
            Path.Combine("scripts", "ui-responsive", "stack.mjs"),
        };
        var workflowFiles = Directory.Exists(GetRepositoryPath(".github", "workflows"))
            ? Directory.GetFiles(GetRepositoryPath(".github", "workflows"), "*.yml", SearchOption.TopDirectoryOnly)
            : [];

        var legacyRuntimePatterns = new[]
        {
            "node server.js",
            "['server.js']",
            "\"server.js\"",
            "'server.js'",
        };

        if (!subphaseElevenCompleted)
        {
            return;
        }

        var offendingReferences = new List<string>();

        foreach (var relativePath in filesToInspect)
        {
            var absolutePath = GetRepositoryPath(relativePath);
            if (!File.Exists(absolutePath))
            {
                continue;
            }

            var content = File.ReadAllText(absolutePath, Encoding.UTF8);
            foreach (var pattern in legacyRuntimePatterns)
            {
                if (content.Contains(pattern, StringComparison.Ordinal))
                {
                    offendingReferences.Add($"{relativePath}: {pattern}");
                }
            }
        }

        foreach (var workflowFile in workflowFiles)
        {
            var content = File.ReadAllText(workflowFile, Encoding.UTF8);
            if (content.Contains("node server.js", StringComparison.Ordinal))
            {
                offendingReferences.Add($"{Path.GetRelativePath(GetRepositoryRoot(), workflowFile)}: node server.js");
            }
        }

        Assert.True(
            offendingReferences.Count == 0,
            $"Legacy Node runtime wiring must be absent after Subphase 11 is completed. Offending references: {string.Join(", ", offendingReferences)}");
    }

    private static string ReadRepositoryFile(params string[] segments)
    {
        return File.ReadAllText(GetRepositoryPath(segments), Encoding.UTF8);
    }

    private static string GetRepositoryPath(params string[] segments)
    {
        return Path.Combine([GetRepositoryRoot(), .. segments]);
    }

    private static string GetRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "AGENTS.md")))
        {
            directory = directory.Parent;
        }

        return directory?.FullName
            ?? throw new DirectoryNotFoundException("Repository root not found from the current test base directory.");
    }
}
