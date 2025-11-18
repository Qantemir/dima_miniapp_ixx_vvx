import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type AdminViewContextValue = {
  forceClientView: boolean;
  setForceClientView: (value: boolean) => void;
};

const AdminViewContext = createContext<AdminViewContextValue | undefined>(undefined);

const STORAGE_KEY = 'admin_force_client_view';

const getInitialValue = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

export const AdminViewProvider = ({ children }: { children: ReactNode }) => {
  const [forceClientView, setForceClientViewState] = useState<boolean>(getInitialValue);

  const setForceClientView = (value: boolean) => {
    setForceClientViewState(value);
    if (typeof window !== 'undefined') {
      if (value) {
        localStorage.setItem(STORAGE_KEY, 'true');
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };

  const value = useMemo(
    () => ({
      forceClientView,
      setForceClientView,
    }),
    [forceClientView],
  );

  return <AdminViewContext.Provider value={value}>{children}</AdminViewContext.Provider>;
};

export const useAdminView = () => {
  const context = useContext(AdminViewContext);
  if (!context) {
    throw new Error('useAdminView must be used within AdminViewProvider');
  }
  return context;
};

