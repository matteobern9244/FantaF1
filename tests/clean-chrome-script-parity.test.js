import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('Chrome cleanup scripts parity', () => {
  const commandPath = path.resolve(process.cwd(), 'clean_google_chrome.command');
  const batPath = path.resolve(process.cwd(), 'clean_google_chrome.bat');

  test('clean_google_chrome.command should exist', () => {
    expect(fs.existsSync(commandPath)).toBe(true);
  });

  test('clean_google_chrome.bat should exist', () => {
    expect(fs.existsSync(batPath)).toBe(true);
  });

  test('both scripts should target the same automation cleanup patterns', () => {
    const commandContent = fs.readFileSync(commandPath, 'utf8');
    const batContent = fs.readFileSync(batPath, 'utf8');

    expect(commandContent).toContain('playwright_chromiumdev_profile-');
    expect(commandContent).toContain('chrome-devtools-mcp');
    expect(batContent).toContain('playwright_chromiumdev_profile-');
    expect(batContent).toContain('chrome-devtools-mcp');
  });

  test('both scripts should relaunch Chrome after cleanup', () => {
    const commandContent = fs.readFileSync(commandPath, 'utf8');
    const batContent = fs.readFileSync(batPath, 'utf8');

    expect(commandContent).toContain('Riavvio Google Chrome');
    expect(commandContent).toContain('verify_chrome_running');
    expect(batContent).toContain('Riavvio Google Chrome');
    expect(batContent).toContain(':verify_chrome_running');
  });
});
