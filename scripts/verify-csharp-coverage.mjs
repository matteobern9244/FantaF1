import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const backendCsharpRoot = path.join(repositoryRoot, 'backend-csharp');
const officialCoverageRoot = path.join(backendCsharpRoot, 'TestResults', 'OfficialCoverage');
const sourceRoot = path.join(backendCsharpRoot, 'src') + path.sep;
const excludedPathFragments = ['/obj/', '\\obj\\'];
const excludedFileSuffixes = ['.g.cs'];
const projects = [
  {
    label: 'unit',
    path: path.join(backendCsharpRoot, 'tests', 'FantaF1.Tests.Unit', 'FantaF1.Tests.Unit.csproj'),
  },
  {
    label: 'integration',
    path: path.join(backendCsharpRoot, 'tests', 'FantaF1.Tests.Integration', 'FantaF1.Tests.Integration.csproj'),
  },
  {
    label: 'contract',
    path: path.join(backendCsharpRoot, 'tests', 'FantaF1.Tests.Contract', 'FantaF1.Tests.Contract.csproj'),
  },
];

function runCommand(command, args) {
  const env = { ...process.env };
  delete env.MONGODB_URI;
  delete env.MONGODB_DB_NAME_OVERRIDE;
  delete env.NODE_ENV;

  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    stdio: 'inherit',
    env: env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function includeFile(filePath) {
  if (!filePath.startsWith(sourceRoot)) {
    return false;
  }

  if (excludedPathFragments.some(fragment => filePath.includes(fragment))) {
    return false;
  }

  return !excludedFileSuffixes.some(suffix => filePath.endsWith(suffix));
}

function mergeCoverage(target, source) {
  for (const [assemblyName, files] of Object.entries(source)) {
    const assemblyEntry = target[assemblyName] ??= {};
    for (const [filePath, classes] of Object.entries(files)) {
      const fileEntry = assemblyEntry[filePath] ??= {};
      for (const [className, methods] of Object.entries(classes)) {
        const classEntry = fileEntry[className] ??= {};
        for (const [methodName, methodCoverage] of Object.entries(methods)) {
          const methodEntry = classEntry[methodName] ??= {
            Lines: {},
            Branches: [],
          };

          for (const [lineNumber, hits] of Object.entries(methodCoverage.Lines ?? {})) {
            methodEntry.Lines[lineNumber] = (methodEntry.Lines[lineNumber] ?? 0) + hits;
          }

          const mergedBranches = new Map(
            methodEntry.Branches.map(branch => [branchIdentity(branch), branch]));

          for (const branch of methodCoverage.Branches ?? []) {
            const key = branchIdentity(branch);
            const existingBranch = mergedBranches.get(key);
            if (existingBranch) {
              existingBranch.Hits += branch.Hits ?? 0;
            } else {
              mergedBranches.set(key, { ...branch });
            }
          }

          methodEntry.Branches = [...mergedBranches.values()];
        }
      }
    }
  }
}

function branchIdentity(branch) {
  return [
    branch.Line,
    branch.Offset,
    branch.EndOffset,
    branch.Path,
    branch.Ordinal,
  ].join(':');
}

function createMetricsBundle(filePath) {
  return {
    file: filePath,
    lineHits: new Map(),
    branchHits: new Map(),
    methodHits: new Map(),
  };
}

function calculateMetrics(mergedCoverage) {
  const files = new Map();

  for (const [assemblyName, assemblies] of Object.entries(mergedCoverage)) {
    for (const [filePath, classes] of Object.entries(assemblies)) {
      if (!includeFile(filePath)) {
        continue;
      }

      const fileMetrics = files.get(filePath) ?? createMetricsBundle(filePath);
      files.set(filePath, fileMetrics);

      for (const [className, methods] of Object.entries(classes)) {
        for (const [methodName, methodCoverage] of Object.entries(methods)) {
          const lines = Object.entries(methodCoverage.Lines ?? {});
          const branches = methodCoverage.Branches ?? [];
          if (lines.length === 0 && branches.length === 0) {
            continue;
          }

          const methodKey = `${assemblyName}::${className}::${methodName}`;
          const methodWasCovered =
            lines.some(([, hits]) => hits > 0)
            || branches.some(branch => (branch.Hits ?? 0) > 0);

          fileMetrics.methodHits.set(methodKey, methodWasCovered);

          for (const [lineNumber, hits] of lines) {
            const existingHits = fileMetrics.lineHits.get(lineNumber) ?? 0;
            fileMetrics.lineHits.set(lineNumber, existingHits + hits);
          }

          for (const branch of branches) {
            const key = branchIdentity(branch);
            const existingHits = fileMetrics.branchHits.get(key) ?? 0;
            fileMetrics.branchHits.set(key, existingHits + (branch.Hits ?? 0));
          }
        }
      }
    }
  }

  const fileSummaries = [...files.values()]
    .map(fileMetrics => {
      const coveredLines = [...fileMetrics.lineHits.values()].filter(hits => hits > 0).length;
      const totalLines = fileMetrics.lineHits.size;
      const coveredBranches = [...fileMetrics.branchHits.values()].filter(hits => hits > 0).length;
      const totalBranches = fileMetrics.branchHits.size;
      const coveredMethods = [...fileMetrics.methodHits.values()].filter(Boolean).length;
      const totalMethods = fileMetrics.methodHits.size;

      return {
        file: fileMetrics.file,
        coveredLines,
        totalLines,
        coveredBranches,
        totalBranches,
        coveredMethods,
        totalMethods,
        lineCoverage: coveragePercentage(coveredLines, totalLines),
        branchCoverage: coveragePercentage(coveredBranches, totalBranches),
        methodCoverage: coveragePercentage(coveredMethods, totalMethods),
      };
    })
    .sort((left, right) => left.file.localeCompare(right.file));

  const totals = fileSummaries.reduce(
    (aggregate, file) => ({
      coveredLines: aggregate.coveredLines + file.coveredLines,
      totalLines: aggregate.totalLines + file.totalLines,
      coveredBranches: aggregate.coveredBranches + file.coveredBranches,
      totalBranches: aggregate.totalBranches + file.totalBranches,
      coveredMethods: aggregate.coveredMethods + file.coveredMethods,
      totalMethods: aggregate.totalMethods + file.totalMethods,
    }),
    {
      coveredLines: 0,
      totalLines: 0,
      coveredBranches: 0,
      totalBranches: 0,
      coveredMethods: 0,
      totalMethods: 0,
    });

  return {
    sourceRoot,
    excludedPathFragments,
    excludedFileSuffixes,
    totals: {
      ...totals,
      lineCoverage: coveragePercentage(totals.coveredLines, totals.totalLines),
      branchCoverage: coveragePercentage(totals.coveredBranches, totals.totalBranches),
      methodCoverage: coveragePercentage(totals.coveredMethods, totals.totalMethods),
    },
    files: fileSummaries,
    failingFiles: fileSummaries.filter(file =>
      file.lineCoverage < 100
      || file.branchCoverage < 100
      || file.methodCoverage < 100),
  };
}

function coveragePercentage(covered, total) {
  if (total === 0) {
    return 100;
  }

  return Number(((covered / total) * 100).toFixed(2));
}

function writeSummary(summary) {
  fs.mkdirSync(officialCoverageRoot, { recursive: true });

  const summaryPath = path.join(officialCoverageRoot, 'summary.json');
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  const failingLines = summary.failingFiles.length === 0
    ? ['All included files are at 100% line, branch, and method coverage.']
    : summary.failingFiles.map(file =>
      [
        `${path.relative(repositoryRoot, file.file)}`,
        `lines ${file.coveredLines}/${file.totalLines} (${file.lineCoverage}%)`,
        `branches ${file.coveredBranches}/${file.totalBranches} (${file.branchCoverage}%)`,
        `methods ${file.coveredMethods}/${file.totalMethods} (${file.methodCoverage}%)`,
      ].join(' | '));

  const text = [
    'Official C# coverage summary',
    `Source root: ${path.relative(repositoryRoot, summary.sourceRoot)}`,
    `Excluded path fragments: ${summary.excludedPathFragments.join(', ')}`,
    `Excluded file suffixes: ${summary.excludedFileSuffixes.join(', ')}`,
    `Included files: ${summary.files.length}`,
    `Line coverage: ${summary.totals.coveredLines}/${summary.totals.totalLines} (${summary.totals.lineCoverage}%)`,
    `Branch coverage: ${summary.totals.coveredBranches}/${summary.totals.totalBranches} (${summary.totals.branchCoverage}%)`,
    `Method coverage: ${summary.totals.coveredMethods}/${summary.totals.totalMethods} (${summary.totals.methodCoverage}%)`,
    '',
    'Files below 100%:',
    ...failingLines,
  ].join('\n');

  fs.writeFileSync(path.join(officialCoverageRoot, 'Summary.txt'), `${text}\n`);
  console.log(text);
}

function main() {
  fs.rmSync(officialCoverageRoot, { recursive: true, force: true });

  const mergedCoverage = {};
  for (const project of projects) {
    const outputBase = path.join(officialCoverageRoot, project.label, 'coverage');
    fs.mkdirSync(path.dirname(outputBase), { recursive: true });

    runCommand('dotnet', [
      'test',
      project.path,
      '-c',
      'Release',
      '--nologo',
      '/p:CollectCoverage=true',
      '/p:CoverletOutputFormat=json',
      `/p:CoverletOutput=${outputBase}`,
    ]);

    const projectCoverage = JSON.parse(fs.readFileSync(`${outputBase}.json`, 'utf8'));
    mergeCoverage(mergedCoverage, projectCoverage);
  }

  const summary = calculateMetrics(mergedCoverage);
  writeSummary(summary);

  if (
    summary.totals.lineCoverage < 100
    || summary.totals.branchCoverage < 100
    || summary.totals.methodCoverage < 100
  ) {
    process.exit(1);
  }
}

main();
