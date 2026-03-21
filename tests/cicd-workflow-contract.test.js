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

    expect(readme).toContain('`RENDER_STAGING_HEALTHCHECK_URL`');
    expect(readme).toContain('`RENDER_HEALTHCHECK_URL`');
    expect(workflow).toContain('RENDER_STAGING_HEALTHCHECK_URL');
    expect(workflow).toContain('RENDER_HEALTHCHECK_URL');
    expect(workflow).not.toContain('RENDER_PRODUCTION_HEALTHCHECK_URL');
  });

  it('keeps README aligned with the actual workflow inventory and deploy triggers', () => {
    const readme = readRepositoryFile('README.md').replace(/\s+/g, ' ');
    const agents = readRepositoryFile('AGENTS.md').replace(/\s+/g, ' ');
    const conductorWorkflow = readRepositoryFile('conductor/workflow.md').replace(/\s+/g, ' ');
    const deploySkill = readRepositoryFile('.gemini/skills/fantaf1-deploy/SKILL.md').replace(/\s+/g, ' ');
    const deployStagingSkill = readRepositoryFile('.gemini/skills/fantaf1_deploy_staging/SKILL.md').replace(/\s+/g, ' ');

    expect(readme).toContain('`deploya-staging`');
    expect(readme).toContain('`develop -> staging`');
    expect(readme).toContain('`deploya`');
    expect(readme).toContain('`staging -> main`');
    expect(readme).toContain('abbassa temporaneamente la protection di `staging`');
    expect(readme).toContain('forza `staging` e `develop` allo SHA finale di `main`');
    expect(readme).toContain('`matteobern9244` come assignee');
    expect(readme).toContain('label aderenti alle modifiche reali');
    expect(agents).toContain('The Pull Request body must be idonea');
    expect(agents).toContain('`matteobern9244` must be assigned as assignee');
    expect(agents).toContain('Pull Request labels must reflect the work actually performed');
    expect(agents).toContain('Temporarily lower the protection on `staging`');
    expect(agents).toContain('force `staging` to that final `main` commit SHA');
    expect(agents).toContain('Force `develop` to that same final `main` commit SHA');
    expect(conductorWorkflow).toContain('La descrizione della PR deve essere idonea');
    expect(conductorWorkflow).toContain('`matteobern9244` deve essere impostato come assignee');
    expect(conductorWorkflow).toContain('Le label della PR devono riflettere esclusivamente il lavoro');
    expect(conductorWorkflow).toContain('riallineare `staging` e `develop` allo SHA finale di `main`');
    expect(deploySkill).toContain('The Pull Request body must be suitable');
    expect(deploySkill).toContain('`matteobern9244` must be assigned as assignee');
    expect(deploySkill).toContain('Temporarily lower the protection on `staging`');
    expect(deploySkill).toContain('force `staging` to that final `main` commit SHA');
    expect(deploySkill).toContain('Force `develop` to that same final `main` commit SHA');
    expect(deployStagingSkill).toContain('The Pull Request body must be suitable');
    expect(deployStagingSkill).toContain('`matteobern9244` must be assigned as assignee');
    expect(readme).not.toContain('workflow aggiuntivi `gemini-*`');
  });
});
