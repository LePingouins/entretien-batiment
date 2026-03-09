const ACCESS_TOKEN_KEY = 'accessToken';
const ROLE_KEY = 'role';
const USER_ID_KEY = 'userId';
const REMEMBER_ME_KEY = 'authRememberMe';

export type StoredAuth = {
  accessToken: string | null;
  role: string | null;
  userId: string | null;
  rememberMe: boolean;
};

function inferRememberMeFromLegacyState(): boolean {
  return !!localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRememberMePreference(): boolean {
  const raw = localStorage.getItem(REMEMBER_ME_KEY);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return inferRememberMeFromLegacyState();
}

function getStorageByPreference(rememberMe: boolean): Storage {
  return rememberMe ? localStorage : sessionStorage;
}

export function getStoredAuth(): StoredAuth {
  const rememberMe = getRememberMePreference();
  const storage = getStorageByPreference(rememberMe);
  return {
    accessToken: storage.getItem(ACCESS_TOKEN_KEY),
    role: storage.getItem(ROLE_KEY),
    userId: storage.getItem(USER_ID_KEY),
    rememberMe,
  };
}

export function getStoredAccessToken(): string | null {
  return getStoredAuth().accessToken;
}

export function setStoredAuth(
  accessToken: string,
  role: string | null | undefined,
  userId: string | number | null | undefined,
  rememberMe: boolean
): void {
  const primary = getStorageByPreference(rememberMe);
  const secondary = rememberMe ? sessionStorage : localStorage;

  secondary.removeItem(ACCESS_TOKEN_KEY);
  secondary.removeItem(ROLE_KEY);
  secondary.removeItem(USER_ID_KEY);

  primary.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (role) {
    primary.setItem(ROLE_KEY, role);
  } else {
    primary.removeItem(ROLE_KEY);
  }

  if (userId !== null && userId !== undefined && userId !== '') {
    primary.setItem(USER_ID_KEY, String(userId));
  } else {
    primary.removeItem(USER_ID_KEY);
  }

  localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
}

export function clearStoredAuth(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_ID_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  sessionStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(REMEMBER_ME_KEY);
}
