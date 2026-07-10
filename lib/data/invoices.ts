import { createClient } from "@/lib/supabase/server";

export async function getClientInvoicesData(userId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch invoices" };
  }
}
