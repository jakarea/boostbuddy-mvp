import { createClient } from "@/lib/supabase/server";

export async function getServicesData() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("price", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error("Failed to fetch services data:", error);
    return [];
  }
}
