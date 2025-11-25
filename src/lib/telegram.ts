// Telegram WebApp utilities
import { toast } from '@/lib/toast';

const INIT_DATA_PARAM = 'tgWebAppData';
const INIT_DATA_STORAGE_KEY = 'miniapp_init_data';

let cachedInitData: string | null = null;
let waitForInitDataPromise: Promise<string | null> | null = null;
let activeMainButtonHandler: (() => void) | null = null;

const hasTelegramInitContext = (tg?: TelegramWebApp | null): tg is TelegramWebApp => {
  if (!tg) {
    return false;
  }

  const hasUnsafeUser = Boolean(tg.initDataUnsafe?.user?.id);
  const hasInitData =
    typeof tg.initData === 'string' && tg.initData.trim().length > 0;

  return hasUnsafeUser || hasInitData;
};

export const getTelegram = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

export const isTelegramWebApp = () => hasTelegramInitContext(getTelegram());

// Более щадящая проверка окружения: используем, когда нужно понять,
// что приложение открыто в Telegram (включая Desktop), даже если initData пуст.
export const isTelegramEnvironment = () => {
  const tg = getTelegram();
  if (!tg) return false;
  if (hasTelegramInitContext(tg)) return true;
  return Boolean(tg.platform && tg.platform !== 'unknown');
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

export const refreshTelegramData = (): void => {
  // Очищаем кэш, чтобы при следующем запросе данные обновились
  cachedInitData = null;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(INIT_DATA_STORAGE_KEY);
    }
  } catch (e) {
    // Игнорируем ошибки sessionStorage
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

    // Устанавливаем отступ для статус-бара Telegram
    const setHeaderOffset = () => {
      // Вычисляем высоту статус-бара на основе разницы viewport
      const viewportHeight = tg.viewportHeight || window.innerHeight;
      const viewportStableHeight = tg.viewportStableHeight || viewportHeight;
      const headerHeight = Math.max(0, viewportHeight - viewportStableHeight);
      
      // Если высота статус-бара не определена, используем фиксированный отступ
      const finalHeight = headerHeight > 0 ? headerHeight : 44; // 44px - стандартная высота статус-бара
      
      document.documentElement.style.setProperty('--tg-header-height', `${finalHeight}px`);
      document.body.classList.add('telegram-app');
    };

    // Устанавливаем отступ сразу
    setHeaderOffset();
    
    // Слушаем изменения viewport
    if (typeof tg.onEvent === 'function') {
      tg.onEvent('viewportChanged', setHeaderOffset);
    }
    
    // Также обновляем при изменении размера окна (fallback)
    window.addEventListener('resize', setHeaderOffset);
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

export const getUserId = (): number | null => {
  const tg = getTelegram();
  // Используем ТОЛЬКО реальный ID от Telegram, без fallback
  return tg?.initDataUnsafe?.user?.id || null;
};

export const getUser = () => {
  const tg = getTelegram();
  // Возвращаем ТОЛЬКО реальные данные от Telegram
  return tg?.initDataUnsafe?.user || null;
};

export const isAdmin = (userId: number, adminIds: number[]): boolean => {
  return adminIds.includes(userId);
};

const detachMainButtonHandler = (tg?: TelegramWebApp | null) => {
  if (!activeMainButtonHandler) {
    return;
  }

  const telegram = tg ?? getTelegram();
  if (!telegram) {
    activeMainButtonHandler = null;
    return;
  }

  try {
    telegram.MainButton.offClick(activeMainButtonHandler);
  } catch {
    // Ignore detach errors - Telegram SDK can throw when handler not found
  } finally {
    activeMainButtonHandler = null;
  }
};

export const showMainButton = (
  text: string,
  onClick: () => void,
  options?: { color?: string; textColor?: string }
) => {
  const tg = getTelegram();
  if (!hasTelegramInitContext(tg)) return false;

  // Удаляем предыдущий обработчик, если он был зарегистрирован
  detachMainButtonHandler(tg);
  activeMainButtonHandler = onClick;

  tg.MainButton.setText(text);
  if (options?.color) tg.MainButton.color = options.color;
  if (options?.textColor) tg.MainButton.textColor = options.textColor;

  tg.MainButton.onClick(onClick);
  tg.MainButton.enable();
  tg.MainButton.show();
  return true;
};

export const hideMainButton = () => {
  const tg = getTelegram();
  if (!tg) return;

  detachMainButtonHandler(tg);

  try {
    tg.MainButton.hideProgress();
    tg.MainButton.disable();
    tg.MainButton.hide();
    tg.MainButton.setText('');
    tg.MainButton.setParams({ is_visible: false, is_active: false });
  } catch {
    // Игнорируем ошибки, если что-то пошло не так
  }
};

export const showBackButton = (onClick: () => void) => {
  const tg = getTelegram();
  if (!hasTelegramInitContext(tg) || !isVersionSupported('6.1') || !tg.BackButton) return;

  tg.BackButton.onClick(onClick);
  tg.BackButton.show();
};

export const hideBackButton = () => {
  const tg = getTelegram();
  if (!hasTelegramInitContext(tg) || !isVersionSupported('6.1') || !tg.BackButton) return;
  
  tg.BackButton.hide();
  tg.BackButton.offClick(() => {});
};

// Deprecated: используйте toast из '@/lib/toast' вместо showAlert
export const showAlert = (message: string) => {
  toast.show(message);
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
  // Используем ТОЛЬКО реальный ID от Telegram
  const tg = getTelegram();
  
  // Пытаемся получить ID из initDataUnsafe
  let realUserId = tg?.initDataUnsafe?.user?.id;
  
  // Если ID нет, пытаемся обновить данные Telegram
  if (!realUserId && tg) {
    // Пытаемся получить данные из initData
    const initData = tg.initData;
    if (initData) {
      // Парсим initData для получения user_id
      try {
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          realUserId = user?.id;
        }
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    }
    
    // Если все еще нет ID, пытаемся получить из initDataUnsafe после небольшой задержки
    if (!realUserId && tg.initDataUnsafe) {
      // Проверяем еще раз initDataUnsafe (может быть обновлен)
      realUserId = tg.initDataUnsafe?.user?.id;
    }
  }
  
  if (realUserId) {
    return { 'X-Dev-User-Id': realUserId.toString() };
  }
  
  // Если ID от Telegram нет, возвращаем пустой объект (бэкенд обработает)
  return {};
};
