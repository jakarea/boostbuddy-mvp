import { requireAuth } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import ClientLayout from './employee-client-layout';

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth();

  if (!auth.success) {
    redirect('/');
  }

  // Only employees can access
  if (auth.user.role !== 'EMPLOYEE') {
    redirect('/c/dashboard');
  }

  const headersList = await headers();
  const currentPath = headersList.get('x-current-path') || '';

  // Use status from JWT metadata (no DB query)
  const isEmployeeActive = auth.user.status === 'ACTIVE' || auth.user.isActive;

  // Inactive employees go to pending
  if (!isEmployeeActive && currentPath !== '/e/pending') {
    redirect('/e/pending');
  }

  return <ClientLayout>{children}</ClientLayout>;
}
