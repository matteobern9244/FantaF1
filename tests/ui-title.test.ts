/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { splitHeroTitle } from '../src/utils/title';

describe('Hero title layout logic', () => {
  it('splits the configured base title from the custom suffix', () => {
    expect(splitHeroTitle('Fanta Formula 1 Tristoiesi', 'Fanta Formula 1')).toEqual({
      primaryLine: 'Fanta Formula 1',
      secondaryLine: 'Tristoiesi',
    });
  });

  it('preserves the base title as a single line when no suffix is present', () => {
    expect(splitHeroTitle('Fanta Formula 1', 'Fanta Formula 1')).toEqual({
      primaryLine: 'Fanta Formula 1',
      secondaryLine: null,
    });
  });

  it('normalizes extra spaces before splitting', () => {
    expect(splitHeroTitle('  Fanta   Formula 1   Tristoiesi  ', 'Fanta Formula 1')).toEqual({
      primaryLine: 'Fanta Formula 1',
      secondaryLine: 'Tristoiesi',
    });
  });

  it('matches the base title case-insensitively', () => {
    expect(splitHeroTitle('FANTA FORMULA 1 Tristoiesi', 'Fanta Formula 1')).toEqual({
      primaryLine: 'Fanta Formula 1',
      secondaryLine: 'Tristoiesi',
    });
  });

  it('leaves unrelated titles untouched', () => {
    expect(splitHeroTitle('Fantaf1 Championship', 'Fanta Formula 1')).toEqual({
      primaryLine: 'Fantaf1 Championship',
      secondaryLine: null,
    });
  });

  it('returns empty output when the title is empty after normalization', () => {
    expect(splitHeroTitle('   ', 'Fanta Formula 1')).toEqual({
      primaryLine: '',
      secondaryLine: null,
    });
  });

  it('keeps the whole title on a single line when the base title is empty', () => {
    expect(splitHeroTitle('Fanta Formula 1 Tristoiesi', '   ')).toEqual({
      primaryLine: 'Fanta Formula 1 Tristoiesi',
      secondaryLine: null,
    });
  });
});
