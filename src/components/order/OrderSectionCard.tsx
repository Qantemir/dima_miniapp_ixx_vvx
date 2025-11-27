import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface OrderSectionCardProps extends PropsWithChildren {
  className?: string;
  header?: ReactNode;
}

/**
 * Общая обёртка для секций на странице заказа.
 * Стилизует фон, бордеры и внутренние отступы, чтобы не дублировать разметку.
 */
export const OrderSectionCard = ({ children, className, header }: OrderSectionCardProps) => (
  <section className={cn('bg-card rounded-lg border border-border p-3 sm:p-4', className)}>
    {header ? <div className="mb-3">{header}</div> : null}
    {children}
  </section>
);

