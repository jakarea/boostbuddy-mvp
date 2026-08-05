import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server-auth';
import { markAllNotificationsAsReadAction } from '@/app/actions/notifications';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await markAllNotificationsAsReadAction();

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Mark all as read error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}