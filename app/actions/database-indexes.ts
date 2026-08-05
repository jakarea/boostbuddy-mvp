"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { success, error } from "@/context/ToastContext";

/**
 * Execute database indexes for performance optimization
 * This action creates the indexes defined in performance-indexes.sql
 *
 * SECURITY: This should only be called by admin users
 */
export async function executeDatabaseIndexesAction() {
  try {
    const adminClient = createAdminClient();

    // Index 1: Review orders by status and created_at (for queue page filtering)
    await adminClient.rpc('exec', {
      sql: `CREATE INDEX IF NOT EXISTS idx_review_orders_status_created
             ON review_orders(status, created_at DESC);`
    });

    // Index 2: Review orders by assigned employee and status (for employee pages)
    await adminClient.rpc('exec', {
      sql: `CREATE INDEX IF NOT EXISTS idx_review_orders_employee_status
             ON review_orders(assigned_employee_id, status);`
    });

    // Index 3: Review orders by user and created_at (for client history)
    await adminClient.rpc('exec', {
      sql: `CREATE INDEX IF NOT EXISTS idx_review_orders_user_created
             ON review_orders(user_id, created_at DESC);`
    });

    // Index 4: Review orders by status (for status filtering)
    await adminClient.rpc('exec', {
      sql: `CREATE INDEX IF NOT EXISTS idx_review_orders_status
             ON review_orders(status);`
    });

    // Index 5: Credit packages active status
    await adminClient.rpc('exec', {
      sql: `CREATE INDEX IF NOT EXISTS idx_credit_packages_is_active
             ON credit_packages(is_active) WHERE is_active = true;`
    });

    // Index 6: Orders by user and status
    await adminClient.rpc('exec', {
      sql: `CREATE INDEX IF NOT EXISTS idx_orders_user_status
             ON orders(user_id, status);`
    });

    // Index 7: Profile accounts by status
    await adminClient.rpc('exec', {
      sql: `CREATE INDEX IF NOT EXISTS idx_profile_accounts_status
             ON profile_accounts(status);`
    });

    // Index 8: Invoices by user and created_at
    await adminClient.rpc('exec', {
      sql: `CREATE INDEX IF NOT EXISTS idx_invoices_user_created
             ON invoices(user_id, created_at DESC);`
    });

    return {
      success: true,
      message: "Database indexes created successfully"
    };

  } catch (err: any) {
    console.error("Failed to create database indexes:", err);
    return {
      success: false,
      error: err.message || "Failed to create database indexes"
    };
  }
}
