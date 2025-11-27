import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAdminView } from '@/contexts/AdminViewContext';
import type { LucideIcon } from 'lucide-react';
import { Boxes, Megaphone, Moon, Package, UserRound, LifeBuoy } from '@/components/icons';
import { useLocation, useNavigate } from 'react-router-dom';

export interface AdminHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

const NAV_LINKS: Array<{
  to: string;
  label: string;
  icon: LucideIcon;
}> = [
  { to: '/admin', label: 'Заказы', icon: Package },
  { to: '/admin/catalog', label: 'Каталог', icon: Boxes },
  { to: '/admin/broadcast', label: 'Рассылка', icon: Megaphone },
  { to: '/admin/store', label: 'Режим сна', icon: Moon },
  { to: '/admin/help', label: 'Помощь', icon: LifeBuoy },
];

export const AdminHeader = ({ title, description, icon }: AdminHeaderProps) => {
  const Icon = icon ?? Package;
  const location = useLocation();
  const navigate = useNavigate();
  const { setForceClientView } = useAdminView();

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/orders';
    }
    return location.pathname === path;
  };

  return (
    <header className="bg-card border-b border-border p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2" aria-hidden>
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Админ-панель
            </p>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => {
            setForceClientView(true);
            navigate('/');
          }}
        >
          <UserRound className="h-4 w-4" />
          Режим клиента
        </Button>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Навигация по админке">
        {NAV_LINKS.map(link => {
          const LinkIcon = link.icon;
          const active = isActive(link.to);
          return (
            <Button
              key={link.to}
              size="sm"
              variant={active ? 'default' : 'outline'}
              className={cn('flex items-center gap-2')}
              onClick={() => navigate(link.to)}
              aria-current={active ? 'page' : undefined}
            >
              <LinkIcon className="h-4 w-4" />
              {link.label}
            </Button>
          );
        })}
      </nav>
    </header>
  );
};
