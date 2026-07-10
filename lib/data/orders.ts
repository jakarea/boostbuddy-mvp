import { createClient } from "@/lib/supabase/server";

export async function getClientOrdersData(userId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        services (
          id,
          name,
          price,
          duration_days
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (fallbackError) throw fallbackError;
      return { success: true, data: fallbackData };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch orders" };
  }
}
