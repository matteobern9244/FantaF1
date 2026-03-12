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
    public void Canonical_plan_keeps_production_like_browser_gates_owned_by_subphase_nine_and_marks_subphase_four_completed()
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
        Assert.Contains("| `Subphase 6` | `pending` |", canonicalPlan, StringComparison.Ordinal);
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
    public void Canonical_plan_and_subphase_five_doc_record_the_read_route_slice_as_completed_without_anticipating_subphase_six()
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
            "| `Subphase 6` | `pending` |",
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
            "**Parity Before Optimization:**",
            "**Dual-Run Verification:**",
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

        Assert.Contains("`4777 / 4777` statements", readme, StringComparison.Ordinal);
        Assert.Contains("`388 / 388` functions", readme, StringComparison.Ordinal);
        Assert.Contains("`1984 / 1984` branches", readme, StringComparison.Ordinal);
        Assert.Contains("`4777 / 4777` lines", readme, StringComparison.Ordinal);
        Assert.Contains(
            "**100% statements (4777 / 4777)**, **100% functions (388 / 388)**, **100% branches (1984 / 1984)**, and **100% lines (4777 / 4777)**",
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
