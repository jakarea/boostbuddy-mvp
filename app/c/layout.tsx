import { requireAuth } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import ClientLayout from './dashboard-client-layout';
import RedirectWrapper from './redirect-wrapper';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth();

  if (!auth.success) {
    redirect('/');
  }

  if (auth.user.role === 'ADMIN') {
    redirect('/a/dashboard');
  }

  return (
    <ClientLayout>
      <RedirectWrapper>{children}</RedirectWrapper>
    </ClientLayout>
  );
}
