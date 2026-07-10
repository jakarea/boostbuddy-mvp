import { requireAuth } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import ClientLayout from './admin-client-layout';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Ensure the user is an ADMIN
  const auth = await requireAuth({ role: 'ADMIN' });

  if (!auth.success) {
    // If they aren't authenticated or aren't an admin
    if (auth.error === 'Forbidden') {
      redirect('/dashboard');
    }
    redirect('/');
  }

  return <ClientLayout>{children}</ClientLayout>;
}
