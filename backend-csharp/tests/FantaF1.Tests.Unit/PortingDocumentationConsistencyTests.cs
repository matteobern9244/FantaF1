using System.Text;

namespace FantaF1.Tests.Unit;

public sealed class PortingDocumentationConsistencyTests
{
    [Fact]
    public void Legacy_porting_document_directories_are_removed_from_the_repository()
    {
        Assert.False(Directory.Exists(GetRepositoryPath("docs")));
        Assert.False(Directory.Exists(GetRepositoryPath("guide-porting-c#")));
    }

    [Fact]
    public void Canonical_docs_do_not_reference_removed_porting_paths()
    {
        var readme = ReadRepositoryFile("README.md");
        var project = ReadRepositoryFile("PROJECT.md");
        var agents = ReadRepositoryFile("AGENTS.md");

        Assert.DoesNotContain("docs/backend-csharp-porting-plan.md", readme, StringComparison.Ordinal);
        Assert.DoesNotContain("docs/backend-csharp-porting-plan.md", agents, StringComparison.Ordinal);
        Assert.DoesNotContain("guide-porting-c#", readme, StringComparison.Ordinal);
        Assert.DoesNotContain("guide-porting-c#", agents, StringComparison.Ordinal);
        Assert.DoesNotContain("docs/render-migration-guide.md", readme, StringComparison.Ordinal);
        Assert.DoesNotContain("docs/backend-csharp-porting-subphases", readme, StringComparison.Ordinal);
        Assert.DoesNotContain("docs/backend-csharp-porting-subphases", project, StringComparison.Ordinal);
    }

    [Fact]
    public void Canonical_docs_align_the_current_branch_with_the_csharp_runtime_and_cutover_guardrails()
    {
        var readme = NormalizeWhitespace(ReadRepositoryFile("README.md"));
        var agents = NormalizeWhitespace(ReadRepositoryFile("AGENTS.md"));

        Assert.Contains("Il backend autorevole del repository e' C#", readme, StringComparison.Ordinal);
        Assert.Contains("`main` resta il target di rilascio protetto", readme, StringComparison.Ordinal);
        Assert.Contains("`README.md` is the canonical operational document", agents, StringComparison.Ordinal);
        Assert.Contains("`CHANGELOG.md` is the canonical release and audit history.", agents, StringComparison.Ordinal);
        Assert.Contains(
            "Before starting, also verify that `main` is already the branch that represents the current releasable stack and that the current working branch is `staging`.",
            agents,
            StringComparison.Ordinal);
        Assert.Contains("Il branch `staging` e' il branch di certificazione corrente.", readme, StringComparison.Ordinal);
    }

    [Fact]
    public void Project_and_readme_align_with_current_persistence_runtime_and_local_database_rules()
    {
        var project = NormalizeWhitespace(ReadRepositoryFile("PROJECT.md"));
        var readme = NormalizeWhitespace(ReadRepositoryFile("README.md"));

        Assert.Contains("`appdatas`", project, StringComparison.Ordinal);
        Assert.Contains("`standingscaches`", project, StringComparison.Ordinal);
        Assert.Contains("`admincredentials`", project, StringComparison.Ordinal);
        Assert.Contains("There are always exactly 3 participant slots.", project, StringComparison.Ordinal);
        Assert.Contains("Participant names are runtime data persisted in the application state;", project, StringComparison.Ordinal);
        Assert.Contains("stato globale del gioco (`appdatas`)", readme, StringComparison.Ordinal);
        Assert.Contains("cache standings piloti/costruttori (`standingscaches`)", readme, StringComparison.Ordinal);
        Assert.Contains("credenziali admin hashate e metadata auth (`admincredentials`)", readme, StringComparison.Ordinal);
        Assert.Contains("fantaf1_local_dev", readme, StringComparison.Ordinal);
        Assert.Contains("fantaf1_local_staging", readme, StringComparison.Ordinal);
        Assert.Contains("I runner locali mutanti non devono mai toccare `fantaf1` o `fantaf1_staging`.", readme, StringComparison.Ordinal);
        Assert.Contains("local mutating runners must never target shared databases", project, StringComparison.Ordinal);
    }

    [Fact]
    public void Readme_documents_the_required_render_and_ci_environment_variables()
    {
        var readme = NormalizeWhitespace(ReadRepositoryFile("README.md"));
        var envExample = NormalizeWhitespace(ReadRepositoryFile(".env.example"));

        Assert.Contains("`MONGODB_URI=<uri che punta a fantaf1_staging>`", readme, StringComparison.Ordinal);
        Assert.Contains("`ADMIN_SESSION_SECRET=<secret lungo e casuale>`", readme, StringComparison.Ordinal);
        Assert.Contains("`ASPNETCORE_ENVIRONMENT=Staging`", readme, StringComparison.Ordinal);
        Assert.Contains("`ASPNETCORE_ENVIRONMENT=Production`", readme, StringComparison.Ordinal);
        Assert.Contains("`Frontend__BuildPath=./dist`", readme, StringComparison.Ordinal);
        Assert.Contains("`PORT=3001`", readme, StringComparison.Ordinal);
        Assert.Contains("`VITE_APP_LOCAL_NAME=<opzionale; solo se serve un titolo hero differenziato>`", readme, StringComparison.Ordinal);
        Assert.Contains("`VITE_APP_LOCAL_NAME=<opzionale; normalmente da lasciare vuota>`", readme, StringComparison.Ordinal);
        Assert.Contains("`VITE_APP_LOCAL_NAME` viene letta dal frontend Vite a build-time", readme, StringComparison.Ordinal);
        Assert.Contains("richiede un rebuild/redeploy per diventare visibile", readme, StringComparison.Ordinal);
        Assert.Contains("`MONGODB_URI_CI`", readme, StringComparison.Ordinal);
        Assert.Contains("`ADMIN_SESSION_SECRET_CI`", readme, StringComparison.Ordinal);
        Assert.Contains("`RENDER_STAGING_HEALTHCHECK_URL`", readme, StringComparison.Ordinal);
        Assert.Contains("`RENDER_HEALTHCHECK_URL`", readme, StringComparison.Ordinal);
        Assert.Contains("ASPNETCORE_ENVIRONMENT=Development", envExample, StringComparison.Ordinal);
        Assert.Contains("MONGODB_DB_NAME_OVERRIDE=", envExample, StringComparison.Ordinal);
        Assert.DoesNotContain("NODE_ENV=", envExample, StringComparison.Ordinal);
    }

    [Fact]
    public void Readme_contains_an_explicit_render_cutover_runbook_for_production()
    {
        var readme = NormalizeWhitespace(ReadRepositoryFile("README.md"));

        Assert.Contains("### Runbook di switch produzione post-merge", readme, StringComparison.Ordinal);
        Assert.Contains("Environment type: `Docker`", readme, StringComparison.Ordinal);
        Assert.Contains("Dockerfile path: `./Dockerfile`", readme, StringComparison.Ordinal);
        Assert.Contains("branch: `main`", readme, StringComparison.Ordinal);
        Assert.Contains("`GET /api/health`", readme, StringComparison.Ordinal);
        Assert.Contains("`databaseTarget=fantaf1`", readme, StringComparison.Ordinal);
        Assert.Contains("`environment=production`", readme, StringComparison.Ordinal);
        Assert.Contains("vecchie env Node/Express non piu' usate", readme, StringComparison.Ordinal);
    }

    [Fact]
    public void Readme_and_agents_align_on_current_ci_jobs_and_dotnet_format_gate()
    {
        var readme = NormalizeWhitespace(ReadRepositoryFile("README.md"));
        var agents = NormalizeWhitespace(ReadRepositoryFile("AGENTS.md"));
        var packageJson = NormalizeWhitespace(ReadRepositoryFile("package.json"));

        Assert.Contains(
            "`lint`", readme, StringComparison.Ordinal);
        Assert.Contains("`format-csharp`", readme, StringComparison.Ordinal);
        Assert.Contains("`build-csharp`", readme, StringComparison.Ordinal);
        Assert.Contains("`test-csharp`", readme, StringComparison.Ordinal);
        Assert.Contains("`responsive-dev`", readme, StringComparison.Ordinal);
        Assert.Contains("`smoke-ci-db`", readme, StringComparison.Ordinal);
        Assert.Contains("GitHub Actions workflows under `.github/workflows/` must stay aligned", agents, StringComparison.Ordinal);
        Assert.Contains("dotnet format backend-csharp/FantaF1.Backend.sln --verify-no-changes", packageJson, StringComparison.Ordinal);
        Assert.Contains("`deploya-staging`", readme, StringComparison.Ordinal);
        Assert.Contains("`develop -> staging`", readme, StringComparison.Ordinal);
        Assert.Contains("`deploya`", readme, StringComparison.Ordinal);
        Assert.Contains("`staging -> main`", readme, StringComparison.Ordinal);
        Assert.Contains("abbassa temporaneamente la protection di `staging`", readme, StringComparison.Ordinal);
        Assert.Contains("forza `staging` e `develop` allo SHA finale di `main`", readme, StringComparison.Ordinal);
        Assert.DoesNotContain("workflow aggiuntivi `gemini-*`", readme, StringComparison.Ordinal);
    }

    [Fact]
    public void Coverage_thresholds_are_aligned_between_readme_and_agents()
    {
        var readme = StripAllWhitespace(ReadRepositoryFile("README.md"));
        var agents = StripAllWhitespace(ReadRepositoryFile("AGENTS.md"));
        var project = NormalizeWhitespace(ReadRepositoryFile("PROJECT.md"));

        Assert.Contains("Le soglie repository restano a `100%` su statements, branches, functions e lines.", NormalizeWhitespace(ReadRepositoryFile("README.md")), StringComparison.Ordinal);
        Assert.Contains(StripAllWhitespace("**100% statements**, **100% functions**, **100% branches**, and **100% lines**"), agents, StringComparison.Ordinal);
        Assert.Contains(StripAllWhitespace("**100% line coverage**, **100% branch coverage**, and **100% method coverage**"), agents, StringComparison.Ordinal);
        Assert.Contains("coverage for the official application-code scope remains at 100% for lines, branches, functions, and statements", project, StringComparison.Ordinal);
    }

    [Fact]
    public void Changelog_records_the_latest_documentation_cleanup_and_database_audit()
    {
        var changelog = NormalizeWhitespace(ReadRepositoryFile("CHANGELOG.md"));

        Assert.Contains("## [1.5.1] - 2026-03-15", changelog, StringComparison.Ordinal);
        Assert.Contains("Runbook Ufficiale di Cutover Render Produzione", changelog, StringComparison.Ordinal);
        Assert.Contains("Fix Propagazione `VITE_APP_LOCAL_NAME` nel Docker Build", changelog, StringComparison.Ordinal);
        Assert.Contains("Documentazione Canonica Consolidata", changelog, StringComparison.Ordinal);
        Assert.Contains("Audit Finale Database Pre-Cutover", changelog, StringComparison.Ordinal);
        Assert.Contains("Workflow CI/CD Riverificati Localmente", changelog, StringComparison.Ordinal);
        Assert.Contains("Dotnet Format Formalizzato Come Gate Reale", changelog, StringComparison.Ordinal);
    }

    private static string StripAllWhitespace(string input)
    {
        return System.Text.RegularExpressions.Regex.Replace(input, @"\s+", "");
    }

    private static string NormalizeWhitespace(string input)
    {
        return System.Text.RegularExpressions.Regex.Replace(input, @"\s+", " ");
    }

    private static string ReadRepositoryFile(params string[] segments)
    {
        return File.ReadAllText(GetRepositoryPath(segments), Encoding.UTF8);
    }

    private static string GetRepositoryPath(params string[] segments)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "AGENTS.md")))
        {
            directory = directory.Parent;
        }

        var repositoryRoot = directory?.FullName
            ?? throw new DirectoryNotFoundException("Repository root not found from the current test base directory.");

        return Path.Combine([repositoryRoot, .. segments]);
    }
}
