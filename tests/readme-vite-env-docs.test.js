import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('README VITE_APP_LOCAL_NAME docs', () => {
  it('documents that VITE_APP_LOCAL_NAME is a frontend build-time variable on Render', () => {
    const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8').replace(/\s+/g, ' ');

    expect(readme).toContain('`VITE_APP_LOCAL_NAME` viene letta dal frontend Vite a build-time');
    expect(readme).toContain('richiede un rebuild/redeploy per diventare visibile');
  });
});
