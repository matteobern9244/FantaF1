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

    expect(readme).toContain('`deploya-staging`');
    expect(readme).toContain('`develop -> staging`');
    expect(readme).toContain('`deploya`');
    expect(readme).toContain('`staging -> main`');
    expect(readme).toContain('`matteobern9244` come assignee');
    expect(readme).toContain('label aderenti alle modifiche reali');
    expect(agents).toContain('The Pull Request body must be idonea');
    expect(agents).toContain('`matteobern9244` must be assigned as assignee');
    expect(agents).toContain('Pull Request labels must reflect the work actually performed');
    expect(readme).not.toContain('workflow aggiuntivi `gemini-*`');
  });
});
