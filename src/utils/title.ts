type HeroTitleLines = {
  primaryLine: string;
  secondaryLine: string | null;
};

function normalizeTitle(value: string) {
  return String(value).trim().replace(/\s+/g, ' ');
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function splitHeroTitle(title: string, baseTitle: string): HeroTitleLines {
  const normalizedTitle = normalizeTitle(title);
  const normalizedBaseTitle = normalizeTitle(baseTitle);

  if (!normalizedTitle) {
    return { primaryLine: '', secondaryLine: null };
  }

  if (!normalizedBaseTitle) {
    return { primaryLine: normalizedTitle, secondaryLine: null };
  }

  if (normalizedTitle.toLowerCase() === normalizedBaseTitle.toLowerCase()) {
    return { primaryLine: normalizedBaseTitle, secondaryLine: null };
  }

  const prefixedTitleMatch = normalizedTitle.match(
    new RegExp(`^${escapeRegex(normalizedBaseTitle)}\\s+(.+)$`, 'i'),
  );

  if (!prefixedTitleMatch) {
    return { primaryLine: normalizedTitle, secondaryLine: null };
  }

  return {
    primaryLine: normalizedBaseTitle,
    secondaryLine: prefixedTitleMatch[1].trim(),
  };
}
