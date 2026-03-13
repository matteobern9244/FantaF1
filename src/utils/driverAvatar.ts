const FORMULA1_MEDIA_PREFIX = 'https://media.formula1.com/image/upload/';
const LOW_RES_AVATAR_TOKEN = 'c_lfill,w_64';
const HI_RES_AVATAR_TOKEN = 'c_lfill,w_256';

export function getDriverPortraitUrl(avatarUrl: string): string {
  if (!avatarUrl) {
    return '';
  }

  if (!avatarUrl.startsWith(FORMULA1_MEDIA_PREFIX) || !avatarUrl.includes(LOW_RES_AVATAR_TOKEN)) {
    return avatarUrl;
  }

  return avatarUrl.replace(LOW_RES_AVATAR_TOKEN, HI_RES_AVATAR_TOKEN);
}

export function getPodiumAvatarUrl(avatarUrl: string): string {
  return getDriverPortraitUrl(avatarUrl);
}
