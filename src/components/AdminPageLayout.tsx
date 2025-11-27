import type { ReactNode } from 'react';
import { AdminHeader, type AdminHeaderProps } from '@/components/AdminHeader';
import { cn } from '@/lib/utils';

interface AdminPageLayoutProps extends AdminHeaderProps {
  children: ReactNode;
  contentClassName?: string;
  contentLabel?: string;
}

/**
 * Каркас админских страниц с едиными семантическими областями.
 */
export const AdminPageLayout = ({
  children,
  contentClassName,
  contentLabel,
  ...headerProps
}: AdminPageLayoutProps) => {
  return (
    <main className="min-h-screen bg-background pb-6" role="main">
      <AdminHeader {...headerProps} />
      <section
        className={cn('p-4', contentClassName)}
        aria-label={contentLabel ?? headerProps.title}
      >
        {children}
      </section>
    </main>
  );
};
