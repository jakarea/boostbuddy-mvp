import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/server-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('notification_logs')
      .select('id, recipient, subject, body, type, channel, status, priority, is_read, created_at, related_order_id')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(50); // Limit to recent 50 notifications

    if (error) {
      console.error('[API] Failed to fetch notifications:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[API] Notification fetch error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}