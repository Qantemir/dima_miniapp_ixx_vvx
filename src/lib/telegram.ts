// Telegram WebApp utilities

export const getTelegram = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
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
  const envValue = import.meta.env.VITE_DEV_USER_ID;
  if (envValue) {
    const parsed = Number(envValue);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(DEV_USER_STORAGE_KEY);
  if (stored) {
    const parsed = Number(stored);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

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

export const showAlert = (message: string) => {
  const tg = getTelegram();
  const canUseAlert =
    !!tg && typeof tg.showAlert === 'function' && isVersionSupported('6.1');

  if (canUseAlert) {
    try {
      tg.showAlert(message);
      return;
    } catch (error) {
      console.warn('Telegram showAlert not supported, fallback to window.alert', error);
    }
  }

  window.alert(message);
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
      console.warn('Telegram showPopup not supported, fallback to confirm', error);
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
      console.warn('Telegram showConfirm not supported, fallback to window.confirm', error);
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
  const tg = getTelegram();
  if (tg?.initData) {
    return { 'X-Telegram-Init-Data': tg.initData };
  }

  const devUserId = getDevFallbackUserId();
  if (devUserId) {
    return { 'X-Dev-User-Id': devUserId.toString() };
  }
  return {};
};
