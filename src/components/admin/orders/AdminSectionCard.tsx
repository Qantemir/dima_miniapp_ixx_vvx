import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminSectionCardProps extends PropsWithChildren {
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  footer?: ReactNode;
  ariaLabel?: string;
}

export const AdminSectionCard = ({
  children,
  title,
  description,
  className,
  footer,
  ariaLabel,
}: AdminSectionCardProps) => (
  <section
    className={cn('bg-card rounded-lg border border-border p-4 space-y-3', className)}
    aria-label={ariaLabel}
  >
    {(title || description) && (
      <header className="space-y-1">
        {title ? <h2 className="font-semibold text-foreground">{title}</h2> : null}
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
    )}
    <div>{children}</div>
    {footer ? <footer className="pt-2 border-t border-border">{footer}</footer> : null}
  </section>
);

