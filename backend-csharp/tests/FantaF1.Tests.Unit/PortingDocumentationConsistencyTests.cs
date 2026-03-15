using System.Text;

namespace FantaF1.Tests.Unit;

public sealed class PortingDocumentationConsistencyTests
{
    [Fact]
    public void Canonical_porting_docs_do_not_reference_the_removed_guide_plan_path()
    {
        var canonicalPlan = ReadRepositoryFile("docs", "backend-csharp-porting-plan.md");
        var subphaseOnePlan = ReadRepositoryFile(
            "docs",
            "backend-csharp-porting-subphases",
            "subphase-01-foundation-and-safety-rails.md");

        Assert.DoesNotContain("guide-porting-c#/backend-csharp-porting-plan.md", canonicalPlan, StringComparison.Ordinal);
        Assert.DoesNotContain("guide-porting-c#/backend-csharp-porting-plan.md", subphaseOnePlan, StringComparison.Ordinal);
    }

    [Fact]
    public void Canonical_docs_align_the_current_branch_with_the_csharp_runtime_and_keep_main_cutover_pending()
    {
        var canonicalPlan = ReadRepositoryFile("docs", "backend-csharp-porting-plan.md");
        var subphaseElevenPlan = ReadRepositoryFile(
            "docs",
            "backend-csharp-porting-subphases",
            "subphase-11-future-cicd-cutover-certification-and-legacy-removal.md");

        Assert.Contains("| `Subphase 10` | `completed` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains("| `Subphase 11` | `pending` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains(
            "the authoritative runtime path for the migrated branch is the ASP.NET Core backend under `backend-csharp/`",
            canonicalPlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "`main` resta invece il branch legacy protetto fino a certificazione utente e autorizzazione esplicita al cutover",
            subphaseElevenPlan,
            StringComparison.Ordinal);
    }

    [Fact]
    public void Render_docs_reference_the_root_dockerfile_and_current_staging_environment_variables()
    {
        var readme = ReadRepositoryFile("README.md");
        var renderGuide = ReadRepositoryFile("docs", "render-migration-guide.md");
        var subphaseTenPlan = ReadRepositoryFile(
            "docs",
            "backend-csharp-porting-subphases",
            "subphase-10-docker-render-staging-and-atlas-operationalization.md");

        Assert.Contains("Dockerfile path: `./Dockerfile`", readme, StringComparison.Ordinal);
        Assert.Contains("`./Dockerfile`", renderGuide, StringComparison.Ordinal);
        Assert.Contains("`Frontend__BuildPath=./dist`", renderGuide, StringComparison.Ordinal);
        Assert.Contains("`PORT=3001`", renderGuide, StringComparison.Ordinal);
        Assert.Contains("`Dockerfile` root", subphaseTenPlan, StringComparison.Ordinal);
        Assert.DoesNotContain("backend-csharp/Dockerfile", renderGuide, StringComparison.Ordinal);
        Assert.DoesNotContain("backend-csharp/Dockerfile", subphaseTenPlan, StringComparison.Ordinal);
    }

    [Fact]
    public void Project_and_readme_align_with_current_persistence_and_participant_runtime_rules()
    {
        var project = ReadRepositoryFile("PROJECT.md");
        var readme = ReadRepositoryFile("README.md");

        Assert.Contains("`appdatas`", project, StringComparison.Ordinal);
        Assert.Contains("`standingscaches`", project, StringComparison.Ordinal);
        Assert.Contains("`admincredentials`", project, StringComparison.Ordinal);
        Assert.DoesNotContain("There are always exactly 3 players: Adriano, Fabio, Matteo.", project, StringComparison.Ordinal);
        Assert.Contains("There are always exactly 3 participant slots.", project, StringComparison.Ordinal);
        Assert.Contains("Participant names are runtime data persisted in the application state;", project, StringComparison.Ordinal);
        Assert.Contains("- standings must synchronize from the external source", project, StringComparison.Ordinal);
        Assert.Contains("stato globale del gioco (`appdatas`)", readme, StringComparison.Ordinal);
        Assert.Contains("cache classifiche piloti/costruttori (`standingscaches`)", readme, StringComparison.Ordinal);
        Assert.Contains("credenziali admin hashate e metadata di autenticazione (`admincredentials`)", readme, StringComparison.Ordinal);
        Assert.Contains("Se il sync fallisce ma la cache esiste gia', il backend continua a servire l'ultimo snapshot valido disponibile.", readme, StringComparison.Ordinal);
    }

    [Fact]
    public void Readme_and_agents_align_on_current_ci_jobs_and_deploya_cutover_guard()
    {
        var readme = ReadRepositoryFile("README.md");
        var agents = ReadRepositoryFile("AGENTS.md");

        Assert.Contains(
            "`lint`, `build`, `format-csharp`, `build-csharp`, `test-csharp`, `responsive-dev` e `smoke-ci-db`",
            readme,
            StringComparison.Ordinal);
        Assert.Contains(
            "If `main` intentionally still points to a legacy or cutover-pending structure, stop immediately and report that `deploya` is not currently activatable.",
            agents,
            StringComparison.Ordinal);
        Assert.Contains(
            "If there are staged files and `main` is the correct release target, proceed with the workflow.",
            agents,
            StringComparison.Ordinal);
    }

    [Fact]
    public void Canonical_porting_docs_use_the_official_csharp_coverage_command()
    {
        var canonicalPlan = ReadRepositoryFile("docs", "backend-csharp-porting-plan.md");
        var portingDocs = Directory.GetFiles(
            GetRepositoryPath("docs", "backend-csharp-porting-subphases"),
            "*.md",
            SearchOption.TopDirectoryOnly)
            .Select(path => File.ReadAllText(path, Encoding.UTF8))
            .Append(canonicalPlan)
            .ToArray();

        Assert.All(portingDocs, content =>
            Assert.DoesNotContain(
                "dotnet test backend-csharp/FantaF1.Backend.sln -c Release /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura",
                content,
                StringComparison.Ordinal));
        Assert.Contains("`npm run test:csharp-coverage`", canonicalPlan, StringComparison.Ordinal);
    }

    [Fact]
    public void Subphase_eleven_doc_makes_legacy_removal_inventory_and_verified_runtime_rules_explicit()
    {
        var subphaseElevenPlan = ReadRepositoryFile(
            "docs",
            "backend-csharp-porting-subphases",
            "subphase-11-future-cicd-cutover-certification-and-legacy-removal.md");

        Assert.Contains("## Inventario esplicito dei path legacy", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("- Da rimuovere:", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("- Da migrare o aggiornare:", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("- Da conservare:", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("`backend/`", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("`app.js`", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("`server.js`", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("remove only after C# becomes the verified runtime", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("diff minimale e senza bridge permanenti", subphaseElevenPlan, StringComparison.Ordinal);
    }

    [Fact]
    public void Agents_doc_explicitly_records_the_required_migration_template_principles()
    {
        var agents = ReadRepositoryFile("AGENTS.md");
        var requiredPhrases = new[]
        {
            "**Behavior Preservation First:**",
            "**Incremental Migration:**",
            "**Strangler Mindset:**",
            "**Business Logic Isolation:**",
            "**SOLID Principles:**",
            "**Dependency Injection by Default:**",
            "**No Hidden Collaborator Graphs:**",
            "**Compatibility Layers Must Be Intentional:**",
            "**Avoid Legacy Leakage:**",
            "**Delete Dead Paths Promptly:**",
            "**Static Logic Policy:**",
            "**Cross-Platform Discipline:**",
            "**Source Of Truth:**",
            "**Data Safety:**",
            "**Contract Preservation:**",
            "**Feature Flags For Cutover:**",
            "**Legacy Decommission Rule:**",
            "**Observability During Migration:**",
            "**No Silent Fallbacks:**",
            "**TDD By Default:**",
            "**Deterministic Tests Only:**",
            "**Parity Tests:**",
            "**Contract Tests:**",
            "**Mock Narrowly:**",
            "**Migration Regression Coverage:**",
            "**Time And Clock Access:**",
            "**Test Data Management:**",
            "**Separation Of Concerns:**",
            "**Abstraction Naming:**",
            "**Configuration Discipline:**",
            "**Credential Secrecy:**",
            "**Localization:**",
            "**Error Handling:**",
            "**Documentation:**",
            "Read the affected legacy and target implementations before proposing structural changes.",
            "Do not collapse migration, refactor, and feature work into one edit unless explicitly requested.",
            "Prefer edits that improve the seam between old and new systems.",
            "If a task risks breaking parity, state the risk explicitly and verify with targeted tests before finishing.",
            "If the repository contains current migration docs, treat them as part of the specification.",
            "Passwords and equivalent credentials must never appear in clear text in versioned files, including production code, tests, fixtures, documentation, and examples.",
        };

        Assert.All(requiredPhrases, requiredPhrase =>
            Assert.Contains(requiredPhrase, agents, StringComparison.Ordinal));
    }

    [Fact]
    public void Coverage_baseline_numbers_are_aligned_between_readme_and_agents()
    {
        var readme = ReadRepositoryFile("README.md");
        var agents = ReadRepositoryFile("AGENTS.md");

        Assert.Contains("`5176 / 5176` statements", readme, StringComparison.Ordinal);
        Assert.Contains("`408 / 408` functions", readme, StringComparison.Ordinal);
        Assert.Contains("`2096 / 2096` branches", readme, StringComparison.Ordinal);
        Assert.Contains("`5176 / 5176` lines", readme, StringComparison.Ordinal);
        Assert.Contains(
            "**100% statements (5176 / 5176)**, **100% functions (408 / 408)**, **100% branches (2096 / 2096)**, and **100% lines (5176 / 5176)**",
            agents,
            StringComparison.Ordinal);
        Assert.Contains("`2927 / 2927` lines", readme, StringComparison.Ordinal);
        Assert.Contains("`1647 / 1647` branches", readme, StringComparison.Ordinal);
        Assert.Contains("**100% line coverage (2927 / 2927)**", agents, StringComparison.Ordinal);
        Assert.Contains("**100% branch coverage (1647 / 1647)**", agents, StringComparison.Ordinal);
    }

    [Fact]
    public void Referenced_migration_template_still_exists_in_the_repository()
    {
        Assert.True(File.Exists(GetRepositoryPath("guide-porting-c#", "AGENTS_migration_template.md")));
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
