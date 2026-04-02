let accessTokenCache: string | null = null;

export function setAccessToken(token?: string | null) {
  accessTokenCache = token || null;
}

export function getAccessToken() {
  return accessTokenCache;
}

export function clearAccessToken() {
  accessTokenCache = null;
}
