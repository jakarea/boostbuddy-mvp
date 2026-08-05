import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, language } = body;

    if (!userId || !language) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (!['en', 'it'].includes(language)) {
      return NextResponse.json({ success: false, error: 'Invalid language' }, { status: 400 });
    }

    // User can only update their own preference unless they are admin
    if (auth.user.role !== 'ADMIN' && auth.user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from('users')
      .update({ preferred_language: language })
      .eq('id', userId);

    if (error) {
      console.error('[API] Failed to update language preference:', error);
      return NextResponse.json({ success: false, error: 'Failed to update language preference' }, { status: 500 });
    }

    return NextResponse.json({ success: true, language });
  } catch (error) {
    console.error('[API] Language preference update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('preferred_language')
      .eq('id', auth.user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to get language preference' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      language: data?.preferred_language || 'en'
    });
  } catch (error) {
    console.error('[API] Language preference get error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}