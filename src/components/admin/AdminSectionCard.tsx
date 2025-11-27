import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminSectionCardProps extends PropsWithChildren {
  className?: string;
  title?: ReactNode;
  header?: ReactNode;
  ariaLabel?: string;
}

/**
 * Универсальный контейнер для карточек в админ-страницах.
 * Обеспечивает единый фон, отступы и границы, чтобы страницы оставались тонкими.
 */
export const AdminSectionCard = ({
  className,
  children,
  title,
  header,
  ariaLabel,
}: AdminSectionCardProps) => (
  <section
    className={cn('bg-card rounded-lg p-4 border border-border', className)}
    aria-label={ariaLabel}
  >
    {title ? (
      <h2 className="font-semibold text-foreground mb-3">{title}</h2>
    ) : null}
    {header}
    {children}
  </section>
);

