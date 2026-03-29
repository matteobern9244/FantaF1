import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readRepositoryFile(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('CI/CD workflow contract', () => {
  it('documents the Render healthcheck secrets actually used by the workflow', () => {
    const readme = readRepositoryFile('README.md').replace(/\s+/g, ' ');
    const workflow = readRepositoryFile('.github/workflows/post-merge-health.yml');

    expect(readme).toContain('`RENDER_HEALTHCHECK_URL`');
    expect(workflow).toContain('RENDER_HEALTHCHECK_URL');
    expect(workflow).not.toContain('RENDER_PRODUCTION_HEALTHCHECK_URL');
  });

  it('keeps README aligned with the actual workflow inventory and deploy triggers', () => {
    const readme = readRepositoryFile('README.md').replace(/\s+/g, ' ');
    const agents = readRepositoryFile('AGENTS.md').replace(/\s+/g, ' ');
    const conductorWorkflow = readRepositoryFile('conductor/workflow.md').replace(/\s+/g, ' ');
    const deploySkill = readRepositoryFile('.gemini/skills/fantaf1-deploy/SKILL.md').replace(/\s+/g, ' ');

    expect(readme).toContain('`deploya`');
    expect(readme).toContain('`develop -> main`');
    expect(readme).toContain('`matteobern9244` come assignee');
    expect(readme).toContain('label aderenti alle modifiche reali');
    expect(agents).toContain('The Pull Request body must be idonea');
    expect(agents).toContain('`matteobern9244` must be assigned as assignee');
    expect(agents).toContain('Pull Request labels must reflect the work actually performed');
    expect(conductorWorkflow).toContain('La descrizione della PR deve essere idonea');
    expect(conductorWorkflow).toContain('`matteobern9244` deve essere impostato come assignee');
    expect(conductorWorkflow).toContain('Le label della PR devono riflettere esclusivamente il lavoro');
    expect(deploySkill).toContain('The Pull Request body must be suitable');
    expect(deploySkill).toContain('`matteobern9244` must be assigned as assignee');
    expect(deploySkill).toContain('Create or update a Pull Request from `develop` into `main`');
    expect(readme).not.toContain('workflow aggiuntivi `gemini-*`');
  });

  it('keeps the responsive-dev workflow aligned with the in-process Playwright runner', () => {
    const workflow = readRepositoryFile('.github/workflows/pr-ci.yml').replace(/\s+/g, ' ');
    const packageJson = readRepositoryFile('package.json').replace(/\s+/g, ' ');
    const runnerEntrypoint = readRepositoryFile('scripts/ui-responsive-check.mjs');
    const runnerImplementation = readRepositoryFile('scripts/ui-responsive/run-responsive-check.mjs');
    const adapter = readRepositoryFile('scripts/ui-responsive/playwright-adapter.mjs');

    expect(packageJson).toContain('"test:ui-responsive": "node scripts/ui-responsive-check.mjs"');
    expect(workflow).toContain('name: responsive-dev');
    expect(workflow).toContain('run: npm ci');
    expect(workflow).toContain('run: npx playwright install --with-deps chromium');
    expect(workflow).toContain('dotnet run --project backend-csharp/src/FantaF1.Api/FantaF1.Api.csproj -c Release --no-launch-profile');
    expect(workflow).toContain('npm run dev:frontend');
    expect(workflow).toContain('timeout 60 bash -lc \'until curl --fail --silent http://127.0.0.1:3002/api/health >/dev/null; do sleep 1; done\'');
    expect(workflow).toContain('timeout 60 bash -lc \'until curl --fail --silent http://127.0.0.1:5173 >/dev/null; do sleep 1; done\'');
    expect(workflow).toContain('run: xvfb-run -a npm run test:ui-responsive');
    expect(workflow).toContain('name: Dump local stack logs on failure');
    expect(workflow).toContain('name: Stop local stack');
    expect(runnerEntrypoint).not.toContain('playwright-cli');
    expect(runnerImplementation).not.toContain('ensureNpx');
    expect(runnerImplementation).not.toContain('playwright-cli');
    expect(adapter).toContain("import { chromium } from 'playwright';");
  });
});
