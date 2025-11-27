import { Skeleton } from '@/components/ui/skeleton';

export const AdminOrderDetailNotFound = () => (
  <main className="min-h-screen bg-background p-4 space-y-4" role="main">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-48 w-full" />
  </main>
);

