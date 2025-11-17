// Telegram WebApp utilities

export const getTelegram = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
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

export const applyTelegramTheme = (themeParams: any) => {
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
  return tg?.initDataUnsafe?.user?.id || null;
};

export const getUser = () => {
  const tg = getTelegram();
  return tg?.initDataUnsafe?.user || null;
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
  if (!tg) return;

  tg.BackButton.onClick(onClick);
  tg.BackButton.show();
};

export const hideBackButton = () => {
  const tg = getTelegram();
  if (!tg) return;
  
  tg.BackButton.hide();
  tg.BackButton.offClick(() => {});
};

export const showAlert = (message: string) => {
  const tg = getTelegram();
  if (tg) {
    tg.showAlert(message);
  } else {
    alert(message);
  }
};

export const showPopup = (params: {
  title?: string;
  message: string;
  buttons?: Array<{ id?: string; type?: string; text?: string }>;
}, callback?: (id: string) => void) => {
  const tg = getTelegram();
  if (tg) {
    tg.showPopup(params, callback);
  } else {
    alert(params.message);
  }
};

export const showConfirm = (message: string, callback?: (ok: boolean) => void) => {
  const tg = getTelegram();
  if (tg) {
    tg.showConfirm(message, callback);
  } else {
    const result = confirm(message);
    callback?.(result);
  }
};

export const closeMiniApp = () => {
  const tg = getTelegram();
  if (tg) {
    tg.close();
  }
};
