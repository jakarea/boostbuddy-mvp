import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();

    // Check if the invoices bucket exists
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();

    if (bucketsError) {
      return NextResponse.json({
        success: false,
        error: `Failed to list buckets: ${bucketsError.message}`,
        buckets: []
      });
    }

    const invoicesBucket = buckets?.find(b => b.id === 'invoices');

    return NextResponse.json({
      success: true,
      hasInvoicesBucket: !!invoicesBucket,
      buckets: buckets?.map(b => ({ id: b.id, name: b.name, public: b.public })) || [],
      invoicesBucket: invoicesBucket ? {
        id: invoicesBucket.id,
        name: invoicesBucket.name,
        public: invoicesBucket.public
      } : null
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      buckets: []
    });
  }
}