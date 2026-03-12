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
    public void Canonical_plan_keeps_production_like_browser_gates_owned_by_subphase_nine_and_subphase_three_pending()
    {
        var canonicalPlan = ReadRepositoryFile("docs", "backend-csharp-porting-plan.md");

        Assert.Contains(
            "For avoidance of doubt, the closure gate for `Subphase 2` is limited to the C# solution scope plus the Node baseline browser check in `Development`. The reusable local `production-like` browser gate remains owned by `Subphase 9` and must not block `Subphase 2` closure.",
            canonicalPlan,
            StringComparison.Ordinal);
        Assert.Contains("| `Subphase 3` | `pending` |", canonicalPlan, StringComparison.Ordinal);
        Assert.Contains(
            "| Canonical launcher and shared verification scripts, including local development and production-like browser gate reuse, and the ban on implicit `fantaf1_dev` fallback | `Subphase 9` |",
            canonicalPlan,
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
