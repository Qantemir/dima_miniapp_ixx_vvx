// Telegram WebApp utilities

const INIT_DATA_PARAM = 'tgWebAppData';
const INIT_DATA_STORAGE_KEY = 'miniapp_init_data';

let cachedInitData: string | null = null;
let waitForInitDataPromise: Promise<string | null> | null = null;

export const getTelegram = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

const extractInitDataFromString = (raw?: string | null) => {
  if (!raw) return null;
  const match = raw.match(new RegExp(`${INIT_DATA_PARAM}=([^&]+)`));
  if (!match || match.length < 2) {
    return null;
  }
  const encoded = match[1];
  try {
    return decodeURIComponent(encoded);
  } catch (error) {
    return encoded;
  }
};

const getInitDataFromLocation = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const fromHash = extractInitDataFromString(window.location.hash);
  if (fromHash) {
    return fromHash;
  }
  return extractInitDataFromString(window.location.search);
};

const serializeInitDataUnsafe = (
  initData?: TelegramWebAppInitData
): string | null => {
  if (!initData?.hash || !initData.auth_date) {
    return null;
  }

  const params = new URLSearchParams();
  Object.entries(initData as unknown as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value === 'object') {
      params.set(key, JSON.stringify(value));
      return;
    }
    params.set(key, String(value));
  });

  return params.toString();
};

const persistInitData = (value: string) => {
  cachedInitData = value;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(INIT_DATA_STORAGE_KEY, value);
    } catch (error) {
      // Ignore storage errors
    }
  }
};

const readStoredInitData = (): string | null => {
  if (cachedInitData) {
    return cachedInitData;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = window.sessionStorage.getItem(INIT_DATA_STORAGE_KEY);
    if (stored) {
      cachedInitData = stored;
      return stored;
    }
  } catch (error) {
    // Ignore storage errors
  }
  return null;
};

const resolveTelegramInitData = (): string | null => {
  const tg = getTelegram();
  const direct = tg?.initData?.trim();
  if (direct) {
    return direct;
  }

  const fromLocation = getInitDataFromLocation();
  if (fromLocation) {
    return fromLocation;
  }

  return serializeInitDataUnsafe(tg?.initDataUnsafe);
};

const getTelegramInitData = (): string | null => {
  const resolved = resolveTelegramInitData();
  if (resolved) {
    persistInitData(resolved);
    return resolved;
  }
  return readStoredInitData();
};

const delay = (ms: number) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

const waitForTelegramInitDataInternal = async (
  timeoutMs = 2000,
  intervalMs = 50
): Promise<string | null> => {
  const deadline = Date.now() + timeoutMs;
  let initData = getTelegramInitData();

  while (!initData && Date.now() < deadline) {
    await delay(intervalMs);
    initData = getTelegramInitData();
  }

  return initData;
};

export const waitForTelegramInitData = async (
  timeoutMs = 2000
): Promise<string | null> => {
  if (!waitForInitDataPromise) {
    waitForInitDataPromise = waitForTelegramInitDataInternal(timeoutMs);
  }

  try {
    const result = await waitForInitDataPromise;
    if (!result) {
      waitForInitDataPromise = null;
    }
    return result;
  } finally {
    waitForInitDataPromise = null;
  }
};

const compareVersions = (current: string, min: string) => {
  const currentParts = current.split('.').map(part => parseInt(part, 10) || 0);
  const minParts = min.split('.').map(part => parseInt(part, 10) || 0);
  const length = Math.max(currentParts.length, minParts.length);

  for (let i = 0; i < length; i++) {
    const cur = currentParts[i] ?? 0;
    const minVal = minParts[i] ?? 0;
    if (cur > minVal) return true;
    if (cur < minVal) return false;
  }
  return true;
};

const isVersionSupported = (minVersion: string) => {
  const tg = getTelegram();
  if (!tg?.version) return false;
  return compareVersions(tg.version, minVersion);
};

export const initTelegram = () => {
  const tg = getTelegram();
  if (tg) {
    tg.ready();
    tg.expand();
    getTelegramInitData();
    
    // Apply Telegram theme
    if (tg.themeParams) {
      applyTelegramTheme(tg.themeParams);
    }
    
    // Set color scheme
    if (tg.colorScheme) {
      document.documentElement.classList.toggle('dark', tg.colorScheme === 'dark');
    }
  }
  return tg;
};

type TelegramThemeParams = Partial<{
  bg_color: string;
  secondary_bg_color: string;
  text_color: string;
  hint_color: string;
  link_color: string;
  button_color: string;
  button_text_color: string;
}>;

export const applyTelegramTheme = (themeParams: TelegramThemeParams) => {
  const root = document.documentElement;
  
  if (themeParams.bg_color) {
    root.style.setProperty('--telegram-bg', themeParams.bg_color);
  }
  if (themeParams.secondary_bg_color) {
    root.style.setProperty('--telegram-secondary-bg', themeParams.secondary_bg_color);
  }
  if (themeParams.text_color) {
    root.style.setProperty('--telegram-text', themeParams.text_color);
  }
  if (themeParams.hint_color) {
    root.style.setProperty('--telegram-hint', themeParams.hint_color);
  }
  if (themeParams.link_color) {
    root.style.setProperty('--telegram-link', themeParams.link_color);
  }
  if (themeParams.button_color) {
    root.style.setProperty('--telegram-button', themeParams.button_color);
  }
  if (themeParams.button_text_color) {
    root.style.setProperty('--telegram-button-text', themeParams.button_text_color);
  }
};

const DEV_USER_STORAGE_KEY = 'miniapp_dev_user_id';

const getDevFallbackUserId = (): number | null => {
  // Сначала проверяем VITE_DEV_USER_ID из env
  const envValue = import.meta.env.VITE_DEV_USER_ID;
  if (envValue) {
    const parsed = Number(envValue);
    if (!Number.isNaN(parsed)) {
      // Сохраняем в localStorage для консистентности
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(DEV_USER_STORAGE_KEY, parsed.toString());
      }
      return parsed;
    }
  }

  if (typeof window === 'undefined') {
    return null;
  }

  // Проверяем сохраненный ID в localStorage
  const stored = window.localStorage.getItem(DEV_USER_STORAGE_KEY);
  if (stored) {
    const parsed = Number(stored);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  // Если VITE_DEV_USER_ID не установлен, используем значение по умолчанию из VITE_ADMIN_IDS (первый ID)
  const adminIds = import.meta.env.VITE_ADMIN_IDS;
  if (adminIds) {
    const firstAdminId = adminIds.split(',')[0]?.trim();
    if (firstAdminId) {
      const parsed = Number(firstAdminId);
      if (!Number.isNaN(parsed)) {
        window.localStorage.setItem(DEV_USER_STORAGE_KEY, parsed.toString());
        return parsed;
      }
    }
  }

  // В последнюю очередь генерируем случайный ID
  const generated = Math.floor(Math.random() * 1_000_000) + 1;
  window.localStorage.setItem(DEV_USER_STORAGE_KEY, generated.toString());
  return generated;
};

export const getUserId = (): number | null => {
  const tg = getTelegram();
  return tg?.initDataUnsafe?.user?.id || getDevFallbackUserId();
};

export const getUser = () => {
  const tg = getTelegram();
  if (tg?.initDataUnsafe?.user) {
    return tg.initDataUnsafe.user;
  }

  const fallbackId = getDevFallbackUserId();
  if (!fallbackId) return null;

  return {
    id: fallbackId,
    first_name: "Demo",
    last_name: "",
    username: "demo_user",
  };
};

export const isAdmin = (userId: number, adminIds: number[]): boolean => {
  return adminIds.includes(userId);
};

export const showMainButton = (
  text: string,
  onClick: () => void,
  options?: { color?: string; textColor?: string }
) => {
  const tg = getTelegram();
  if (!tg) return;

  tg.MainButton.setText(text);
  if (options?.color) tg.MainButton.color = options.color;
  if (options?.textColor) tg.MainButton.textColor = options.textColor;
  
  tg.MainButton.onClick(onClick);
  tg.MainButton.show();
};

export const hideMainButton = () => {
  const tg = getTelegram();
  if (!tg) return;
  
  tg.MainButton.hide();
  tg.MainButton.offClick(() => {});
};

export const showBackButton = (onClick: () => void) => {
  const tg = getTelegram();
  if (!tg || !isVersionSupported('6.1') || !tg.BackButton) return;

  tg.BackButton.onClick(onClick);
  tg.BackButton.show();
};

export const hideBackButton = () => {
  const tg = getTelegram();
  if (!tg || !isVersionSupported('6.1') || !tg.BackButton) return;
  
  tg.BackButton.hide();
  tg.BackButton.offClick(() => {});
};

// Deprecated: используйте toast из '@/lib/toast' вместо showAlert
export const showAlert = (message: string) => {
  // Импортируем динамически, чтобы избежать циклических зависимостей
  import('@/lib/toast').then(({ toast }) => {
    toast.show(message);
  });
};

export const showPopup = (
  params: {
  title?: string;
  message: string;
  buttons?: Array<{ id?: string; type?: string; text?: string }>;
  },
  callback?: (id: string) => void
) => {
  const tg = getTelegram();
  const canUsePopup =
    !!tg && isVersionSupported('6.1') && typeof tg.showPopup === 'function';

  if (canUsePopup && tg) {
    try {
    tg.showPopup(params, callback);
      return;
    } catch (error) {
      // Fallback to window.confirm
    }
  }

  const ok = window.confirm(params.message);
  const okButton =
    params.buttons?.find(button => button.type !== 'cancel')?.id || 'confirm';
  const cancelButton =
    params.buttons?.find(button => button.type === 'cancel')?.id || 'cancel';
  callback?.(ok ? okButton : cancelButton);
};

export const showConfirm = (message: string, callback?: (ok: boolean) => void) => {
  const tg = getTelegram();
  const canUseConfirm =
    !!tg && typeof tg.showConfirm === 'function' && isVersionSupported('6.1');

  if (canUseConfirm) {
    try {
      tg.showConfirm(message, callback);
      return;
    } catch (error) {
      // Fallback to window.confirm
    }
  }

  const result = window.confirm(message);
  callback?.(result);
};

export const closeMiniApp = () => {
  const tg = getTelegram();
  if (tg) {
    tg.close();
  }
};

export const getRequestAuthHeaders = (): Record<string, string> => {
  // Всегда отправляем dev user ID - подпись Telegram не требуется
  const devUserId = getDevFallbackUserId();
  // Если есть VITE_DEV_USER_ID, используем его, иначе fallback
  const envDevUserId = import.meta.env.VITE_DEV_USER_ID;
  const userIdToSend = envDevUserId ? Number(envDevUserId) : (devUserId || 1);
  return { 'X-Dev-User-Id': userIdToSend.toString() };
};
