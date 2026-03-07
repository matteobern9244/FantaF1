import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const indexHtmlPath = path.join(repoRoot, 'index.html');
const manifestPath = path.join(repoRoot, 'public', 'site.webmanifest');

describe('PWA and browser icon assets', () => {
  it('references the custom browser and PWA icons from index.html', () => {
    const indexHtml = readFileSync(indexHtmlPath, 'utf8');

    expect(indexHtml).not.toContain('/vite.svg');
    expect(indexHtml).toContain('<link rel="icon" type="image/svg+xml" href="/icons/favicon.svg" />');
    expect(indexHtml).toContain('<link rel="icon" type="image/x-icon" href="/favicon.ico" />');
    expect(indexHtml).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
    expect(indexHtml).toContain('<link rel="manifest" href="/site.webmanifest" />');
    expect(indexHtml).toContain('<meta name="theme-color" content="#e10600" />');
  });

  it('declares the expected app metadata and icon files in the web manifest', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

    expect(manifest).toMatchObject({
      name: 'FantaF1',
      short_name: 'FantaF1',
      start_url: '/',
      display: 'standalone',
      background_color: '#05060a',
      theme_color: '#e10600',
    });

    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        }),
        expect.objectContaining({
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        }),
        expect.objectContaining({
          src: '/icons/icon-512-maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        }),
      ]),
    );

    for (const icon of manifest.icons) {
      const relativePath = icon.src.replace(/^\//, '');
      expect(existsSync(path.join(repoRoot, 'public', relativePath))).toBe(true);
    }

    expect(existsSync(path.join(repoRoot, 'public', 'ios-splash-screen.png'))).toBe(true);
  });
});
