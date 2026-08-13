import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/server-auth';
import { deleteNotificationAction } from '@/app/actions/notifications';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json({ success: false, error: 'Notification ID is required' }, { status: 400 });
    }

    const result = await deleteNotificationAction(notificationId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Delete notification error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
