import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const amount = parseInt(searchParams.get('amount') || '100');

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' });
    }

    const supabaseAdmin = createAdminClient();

    // Get current balance
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('credits_balance')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' });
    }

    const currentBalance = user.credits_balance || 0;
    const newBalance = currentBalance + amount;

    // Add credits
    const { data: updated, error } = await supabaseAdmin
      .from('users')
      .update({ credits_balance: newBalance })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message });
    }

    // Create transaction record
    await supabaseAdmin.from('credit_transactions').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      amount: amount,
      balance_after: newBalance,
      type: 'ADMIN_ADJUST',
      description: 'Debug credit addition'
    });

    return NextResponse.json({
      success: true,
      previousBalance: currentBalance,
      added: amount,
      newBalance: newBalance
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}