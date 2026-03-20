import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appCssPath = path.resolve(__dirname, '..', 'src', 'App.css');
const appCssContent = readFileSync(appCssPath, 'utf8');

describe('mobile overlay styles', () => {
  it('defines taller centered mobile menu items', () => {
    expect(appCssContent).toMatch(/\.mobile-nav-item\s*\{[\s\S]*min-height:\s*68px;/);
    expect(appCssContent).toMatch(/\.mobile-nav-item\s*\{[\s\S]*justify-content:\s*center;/);
    expect(appCssContent).toMatch(/\.mobile-nav-copy\s*\{[\s\S]*align-items:\s*center;/);
    expect(appCssContent).toMatch(/\.mobile-nav-copy\s*\{[\s\S]*text-align:\s*center;/);
  });

  it('uses Formula1 for mobile menu labels without Formula1Wide or aggressive wrapping', () => {
    expect(appCssContent).toMatch(/\.mobile-nav-label\s*\{[\s\S]*font-family:\s*'Formula1',\s*sans-serif;/);
    expect(appCssContent).toMatch(/\.mobile-nav-group-label\s*\{[\s\S]*font-family:\s*'Formula1',\s*sans-serif;/);
    expect(appCssContent).not.toMatch(/\.mobile-nav-group-label\s*\{[\s\S]*Formula1Wide/);
    expect(appCssContent).not.toMatch(/\.mobile-nav-label\s*\{[\s\S]*Formula1Wide/);
    expect(appCssContent).not.toMatch(/\.mobile-nav-label\s*\{[\s\S]*overflow-wrap:\s*anywhere;/);
  });

  it('prevents horizontal overflow in desktop and mobile navigation containers', () => {
    expect(appCssContent).toMatch(/\.sidebar-nav\s*\{[\s\S]*overflow-x:\s*hidden;/);
    expect(appCssContent).toMatch(/\.mobile-nav-content\s*\{[\s\S]*overflow-x:\s*hidden;/);
  });

  it('keeps enough lateral room for active desktop and mobile menu borders', () => {
    expect(appCssContent).toContain('--sidebar-width: 304px;');
    expect(appCssContent).toMatch(/\.sidebar-item\s*\{[\s\S]*width:\s*calc\(100%\s*-\s*4px\);/);
    expect(appCssContent).toMatch(/\.sidebar-item\s*\{[\s\S]*margin-inline:\s*2px;/);
    expect(appCssContent).toMatch(/\.mobile-nav-item\s*\{[\s\S]*width:\s*calc\(100%\s*-\s*4px\);/);
    expect(appCssContent).toMatch(/\.mobile-nav-item\s*\{[\s\S]*margin-inline:\s*2px;/);
  });

  it('adds visual separation after the Analisi group in desktop and mobile menus', () => {
    expect(appCssContent).toMatch(/\.sidebar-group\s*\+\s*\.sidebar-item\s*\{[\s\S]*margin-top:\s*10px;/);
    expect(appCssContent).toMatch(/\.mobile-nav-group\s*\+\s*\.mobile-nav-item\s*\{[\s\S]*margin-top:\s*12px;/);
  });
});
