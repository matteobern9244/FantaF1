import { describe, expect, it } from 'vitest';
import { getPodiumAvatarUrl } from '../src/utils/driverAvatar';

describe('driverAvatar helpers', () => {
  it('promotes Formula1 low-resolution avatars for podium rendering', () => {
    expect(
      getPodiumAvatarUrl(
        'https://media.formula1.com/image/upload/c_lfill,w_64/q_auto/v1740000000/common/f1/2026/mercedes/rusgeo01/2026mercedesrusgeo01right.webp',
      ),
    ).toBe(
      'https://media.formula1.com/image/upload/c_lfill,w_256/q_auto/v1740000000/common/f1/2026/mercedes/rusgeo01/2026mercedesrusgeo01right.webp',
    );
  });

  it('leaves non Formula1 or already suitable avatar urls unchanged', () => {
    expect(getPodiumAvatarUrl('https://media.example.com/russell.webp')).toBe(
      'https://media.example.com/russell.webp',
    );
    expect(
      getPodiumAvatarUrl(
        'https://media.formula1.com/image/upload/c_lfill,w_256/q_auto/v1740000000/common/f1/2026/mercedes/rusgeo01/2026mercedesrusgeo01right.webp',
      ),
    ).toBe(
      'https://media.formula1.com/image/upload/c_lfill,w_256/q_auto/v1740000000/common/f1/2026/mercedes/rusgeo01/2026mercedesrusgeo01right.webp',
    );
  });

  it('returns an empty string for missing avatar urls', () => {
    expect(getPodiumAvatarUrl('')).toBe('');
  });
});
