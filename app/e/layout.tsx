import { requireAuth } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import ClientLayout from './employee-client-layout';
import RedirectWrapper from './redirect-wrapper';

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth();

  if (!auth.success) {
    redirect('/');
  }

  // Only employees can access
  if (auth.user.role !== 'EMPLOYEE') {
    redirect('/c/dashboard');
  }

  return (
    <ClientLayout>
      <RedirectWrapper>{children}</RedirectWrapper>
    </ClientLayout>
  );
}
