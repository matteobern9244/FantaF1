import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Dockerfile Vite env propagation', () => {
  it('passes VITE_APP_LOCAL_NAME into the frontend build stage', () => {
    const dockerfile = readFileSync(resolve(process.cwd(), 'Dockerfile'), 'utf8');

    expect(dockerfile).toContain('ARG VITE_APP_LOCAL_NAME');
    expect(dockerfile).toContain('ENV VITE_APP_LOCAL_NAME=$VITE_APP_LOCAL_NAME');
    expect(dockerfile).toContain('RUN npm run build');
  });
});
