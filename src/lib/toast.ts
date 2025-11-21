// Toast notifications utility
import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string) => {
    sonnerToast.success(message, {
      duration: 3000,
    });
  },
  error: (message: string) => {
    sonnerToast.error(message, {
      duration: 4000,
    });
  },
  info: (message: string) => {
    sonnerToast.info(message, {
      duration: 3000,
    });
  },
  warning: (message: string) => {
    sonnerToast.warning(message, {
      duration: 3000,
    });
  },
  // Для обратной совместимости - показываем как info
  show: (message: string) => {
    sonnerToast.info(message, {
      duration: 3000,
    });
  },
};

