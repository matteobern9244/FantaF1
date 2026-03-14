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
    public void Subphase_two_doc_keeps_the_production_like_browser_gate_out_of_scope()
    {
        var subphaseTwoPlan = ReadRepositoryFile(
            "docs",
            "backend-csharp-porting-subphases",
            "subphase-02-backend-csharp-solution-and-shared-abstractions.md");

        Assert.Contains(
            "- Desktop admin/public in sviluppo: `npm run test:ui-responsive` contro il runtime Node baseline resta obbligatorio.",
            subphaseTwoPlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "- Produzione-like locale: non applicabile come gate di chiusura di questa subphase; il riuso condiviso del responsive check resta demandato a `Subphase 9`.",
            subphaseTwoPlan,
            StringComparison.Ordinal);
    }

    [Fact]
    public void Canonical_plan_keeps_production_like_browser_gates_owned_by_subphase_nine_and_marks_subphase_seven_completed()
    {
        var canonicalPlan = ReadRepositoryFile("docs", "backend-csharp-porting-plan.md");
        var subphaseFourPlan = ReadRepositoryFile(
            "docs",
            "backend-csharp-porting-subphases",
            "subphase-04-session-and-admin-auth-parity.md");

        Assert.Contains(
            "For avoidance of doubt, the closure gate for `Subphase 2` is limited to the C# solution scope plus the Node baseline browser check in `Development`. The reusable local `production-like` browser gate remains owned by `Subphase 9` and must not block `Subphase 2` closure.",
            canonicalPlan,
            StringComparison.Ordinal);
        Assert.Contains("| `Subphase 3` | `completed` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains("| `Subphase 4` | `completed` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains("| `Subphase 5` | `completed` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains("| `Subphase 6` | `completed` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains("| `Subphase 6A` | `completed` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains("| `Subphase 7` | `completed` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains("Wait for explicit user authorization before starting `Subphase 8`.", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains(
            "| Canonical launcher and shared verification scripts, including local development and production-like browser gate reuse, and the ban on implicit `fantaf1_dev` fallback | `Subphase 9` |",
            canonicalPlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "- Desktop admin/public in sviluppo: `npm run test:ui-responsive` contro il runtime Node baseline resta obbligatorio.",
            subphaseFourPlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "- Produzione-like locale: il browser gate riusabile non blocca la chiusura di questa subphase; la semantica auth/cookie production-like va verificata con integration e contract tests HTTP, mentre il gate browser condiviso resta demandato a `Subphase 9`.",
            subphaseFourPlan,
            StringComparison.Ordinal);
    }

    [Fact]
    public void Canonical_plan_and_subphase_five_doc_record_the_read_route_slice_as_completed_before_subphase_seven()
    {
        var canonicalPlan = ReadRepositoryFile("docs", "backend-csharp-porting-plan.md");
        var subphaseFivePlan = ReadRepositoryFile(
            "docs",
            "backend-csharp-porting-subphases",
            "subphase-05-read-routes-data-drivers-calendar.md");

        Assert.Contains(
            "| `Subphase 5` | `completed` |",
            canonicalPlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "| `Subphase 6` | `completed` |",
            canonicalPlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "| `Subphase 6A` | `completed` |",
            canonicalPlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "| `Subphase 7` | `completed` |",
            canonicalPlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "- `GET /api/data`",
            subphaseFivePlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "- `GET /api/drivers`",
            subphaseFivePlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "- `GET /api/calendar`",
            subphaseFivePlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "- `GET /api/standings`, demandata a `Subphase 6A`.",
            subphaseFivePlan,
            StringComparison.Ordinal);
    }

    [Fact]
    public void Canonical_plan_records_subphase_six_a_and_the_main_delta_assimilation_matrix()
    {
        var canonicalPlan = ReadRepositoryFile("docs", "backend-csharp-porting-plan.md");
        var subphaseSixAPlan = ReadRepositoryFile(
            "docs",
            "backend-csharp-porting-subphases",
            "subphase-06a-main-delta-assimilation-and-standings-parity.md");

        Assert.Contains("| `Subphase 6A` | `completed` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains(
            "| `Subphase 6A` | [`docs/backend-csharp-porting-subphases/subphase-06a-main-delta-assimilation-and-standings-parity.md`",
            canonicalPlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "Wait for explicit user authorization before starting `Subphase 7`.",
            canonicalPlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "| Results route `GET /api/results/:meetingKey`, including `racePhase`, highlights and fallback behavior | `Subphase 7` |",
            canonicalPlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "| Standings route `GET /api/standings`, standings cache, official-source parsing, and reusable standings sync capability | `Subphase 6A` |",
            canonicalPlan,
            StringComparison.Ordinal);
        Assert.Contains("### Delta assimilation matrix (`2c53c157..main`)", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains("| File | Delta type | Merge status | C# porting impact | Subphase owner | Validation evidence |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains("| `backend/standings.js` | `feature` | `merged` | New backend baseline to port with parity in C#. | `Subphase 6A` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains("| `src/App.tsx` | `fix+feature` | `merged` | Consumes `/api/standings` and the new navigation baseline that later browser gates must preserve. | `Subphase 9` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains("| `scripts/ui-responsive/state-validation.mjs` | `fix` | `merged` | Shared browser validation baseline to be parameterized for the migrated stack. | `Subphase 9` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains("| `tests/standings.test.js` | `test` | `merged` | Legacy parity reference for C# standings parser and sync behavior. | `Subphase 6A` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains("Invocazione canonica: `Subphase 6A`", subphaseSixAPlan, StringComparison.Ordinal);
        Assert.Contains("- Portare in C# `GET /api/standings`.", subphaseSixAPlan, StringComparison.Ordinal);
        Assert.Contains("- Portare in C# la capability riusabile di sync standings con fallback a cache.", subphaseSixAPlan, StringComparison.Ordinal);
        Assert.Contains("`npm run test:csharp-coverage`", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains("`npm run test:csharp-coverage`", subphaseSixAPlan, StringComparison.Ordinal);
    }

    [Fact]
    public void Canonical_plan_and_subphase_seven_doc_record_the_results_route_slice_as_completed()
    {
        var canonicalPlan = ReadRepositoryFile("docs", "backend-csharp-porting-plan.md");
        var subphaseSevenPlan = ReadRepositoryFile(
            "docs",
            "backend-csharp-porting-subphases",
            "subphase-07-results-route-race-phase-and-highlights.md");

        Assert.Contains("| `Subphase 7` | `completed` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains("Invocazione canonica: `Subphase 7`", subphaseSevenPlan, StringComparison.Ordinal);
        Assert.Contains("## Stato verificato di chiusura", subphaseSevenPlan, StringComparison.Ordinal);
        Assert.Contains("- `GET /api/results/:meetingKey` e' portata in C# con payload flat Node-compatible.", subphaseSevenPlan, StringComparison.Ordinal);
        Assert.Contains("- `npm run test:ui-responsive`", subphaseSevenPlan, StringComparison.Ordinal);
        Assert.Contains("il browser gate riusabile resta formalmente demandato a `Subphase 9`", subphaseSevenPlan, StringComparison.Ordinal);
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
        var canonicalPlan = ReadRepositoryFile("docs", "backend-csharp-porting-plan.md");
        var subphaseElevenPlan = ReadRepositoryFile(
            "docs",
            "backend-csharp-porting-subphases",
            "subphase-11-future-cicd-cutover-certification-and-legacy-removal.md");

        Assert.Contains(
            "| `Subphase 11` | [`docs/backend-csharp-porting-subphases/subphase-11-future-cicd-cutover-certification-and-legacy-removal.md`",
            canonicalPlan,
            StringComparison.Ordinal);
        Assert.DoesNotContain("| `Subphase 12` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains(
            "Only after those criteria are green does the C# stack become the verified runtime for legacy removal.",
            canonicalPlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "use an explicit remove/migrate/keep inventory and a minimal diff with no permanent bridges.",
            canonicalPlan,
            StringComparison.Ordinal);
        Assert.Contains("## Inventario esplicito dei path legacy", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("- Da rimuovere:", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("- Da migrare o aggiornare:", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("- Da conservare:", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("`backend/`", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("`app.js`", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("`server.js`", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("`backend/standings.js`", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("`start_fantaf1.command`", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("`src/`", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("`public/`", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("`vite.config.ts`", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("remove only after C# becomes the verified runtime", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains("diff minimale e senza bridge permanenti", subphaseElevenPlan, StringComparison.Ordinal);
        Assert.Contains(
            "- non spostare il backend Node in cartelle `legacy/`, `archive/` o simili;",
            subphaseElevenPlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "- non lasciare stub `app.js`/`server.js`;",
            subphaseElevenPlan,
            StringComparison.Ordinal);
        Assert.Contains(
            "- non mantenere proxy, shim o wrapper che inoltrano al runtime C# solo per \"compatibilita' storica\" interna al repository;",
            subphaseElevenPlan,
            StringComparison.Ordinal);
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
