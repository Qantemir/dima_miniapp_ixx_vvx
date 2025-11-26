import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type AdminViewContextValue = {
  forceClientView: boolean;
  setForceClientView: (value: boolean) => void;
};

const AdminViewContext = createContext<AdminViewContextValue | undefined>(undefined);

export const AdminViewProvider = ({ children }: { children: ReactNode }) => {
  const [forceClientView, setForceClientView] = useState<boolean>(false);

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

