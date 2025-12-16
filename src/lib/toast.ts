// Лёгкий fallback-тост без сторонних зависимостей,
// чтобы фронт продолжал работать даже без sonner.
// В проде можно вернуть sonner, но сейчас важно убрать рантайм-ошибку.
const log = (prefix: string, message: string) => {
  // eslint-disable-next-line no-console
  console.log(prefix, message);
  if (typeof window !== "undefined" && window?.alert) {
    // Не спамим алертами — показываем только ошибки/варнинги
    if (prefix === "❌" || prefix === "⚠️") {
      window.alert(`${prefix} ${message}`);
    }
  }
};

export const toast = {
  success: (message: string) => log("✅", message),
  error: (message: string) => log("❌", message),
  info: (message: string) => log("ℹ️", message),
  warning: (message: string) => log("⚠️", message),
  // Для обратной совместимости - показываем как info
  show: (message: string) => log("ℹ️", message),
};

