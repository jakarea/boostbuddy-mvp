import { requireAuth } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import ClientLayout from './dashboard-client-layout';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth();

  if (!auth.success) {
    redirect('/');
  }

  if (auth.user.role === 'ADMIN') {
    redirect('/a/dashboard');
  }

  const headersList = await headers();
  const currentPath = headersList.get('x-current-path') || '';

  if (!auth.user.isActive && currentPath !== '/c/pending') {
    redirect('/c/pending');
  }

  if (auth.user.isActive && currentPath === '/c/pending') {
    redirect('/c/dashboard');
  }

  // Redirect /c root to /c/dashboard
  if (currentPath === '/c') {
    redirect('/c/dashboard');
  }

  return <ClientLayout>{children}</ClientLayout>;
}
