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
    redirect('/admin/dashboard');
  }

  const headersList = await headers();
  const currentPath = headersList.get('x-current-path') || '';

  if (auth.user.status === 'PENDING' && currentPath !== '/dashboard/pending') {
    redirect('/dashboard/pending');
  }

  if (auth.user.status === 'ACTIVE' && currentPath === '/dashboard/pending') {
    redirect('/dashboard');
  }

  return <ClientLayout>{children}</ClientLayout>;
}
