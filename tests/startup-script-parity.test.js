// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, describe } from 'vitest';

describe('Startup Scripts Parity', () => {
  const commandPath = path.resolve(process.cwd(), 'start_fantaf1.command');
  const batPath = path.resolve(process.cwd(), 'start_fantaf1.bat');

  test('start_fantaf1.command should exist', () => {
    expect(fs.existsSync(commandPath)).toBe(true);
  });

  test('start_fantaf1.bat should exist', () => {
    expect(fs.existsSync(batPath)).toBe(true);
  });

  test('both scripts should define the same core variables', () => {
    const commandContent = fs.readFileSync(commandPath, 'utf8');
    const batContent = fs.readFileSync(batPath, 'utf8');

    expect(commandContent).toContain('NODE_ENV=development');
    expect(batContent).toContain('NODE_ENV=development');

    expect(commandContent).toContain('FANTAF1_LOCAL_RUNTIME');
    expect(batContent).toContain('FANTAF1_LOCAL_RUNTIME');
  });

  test('both scripts should perform the same preflight steps', () => {
    const commandContent = fs.readFileSync(commandPath, 'utf8');
    const batContent = fs.readFileSync(batPath, 'utf8');

    // Check for MongoDB validation
    expect(commandContent).toContain('import { MongoClient } from \'mongodb\'');
    expect(batContent).toContain('import { MongoClient } from \'mongodb\'');

    // Check for build steps
    expect(commandContent).toContain('dotnet build');
    expect(batContent).toContain('dotnet build');

    expect(commandContent).toContain('npm run build');
    expect(batContent).toContain('npm run build');

    // Check for final handover
    expect(commandContent).toContain('node ./scripts/dev-launcher.mjs');
    expect(batContent).toContain('node ./scripts/dev-launcher.mjs');
  });

  test('the Windows launcher preserves MongoDB URIs with embedded equals signs', () => {
    const batContent = fs.readFileSync(batPath, 'utf8');

    expect(batContent).toContain('tokens=1* delims==');
    expect(batContent).toContain('set "MONGODB_URI=%%b"');
  });
});
