/**
 * CENTRALIZED SUPABASE HELPERS
 * Fixes ALL database interaction issues in one place
 * Prevents scattered fixes and inconsistent data handling
 */

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient as createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Normalizes database column names from snake_case to camelCase
 * Fixes ALL snake_case vs camelCase mismatches across the codebase
 */
export function normalizeDbRecord<T extends Record<string, any>>(record: T): T {
  if (!record) return record;

  const normalized = { ...record };

  // Common column mappings
  const mappings: Record<string, string> = {
    credits_amount: 'creditsAmount',
    credit_package_id: 'creditPackageId',
    user_id: 'userId',
    review_order_id: 'reviewOrderId',
    employee_id: 'employeeId',
    assigned_employee_id: 'assignedEmployeeId',
    admin_verification_status: 'adminVerificationStatus',
    admin_verified_at: 'adminVerifiedAt',
    rejection_reason: 'rejectionReason',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    stripe_session_id: 'stripeSessionId',
    is_active: 'isActive',
    // Add more mappings as needed
  };

  Object.entries(mappings).forEach(([dbCol, codeCol]) => {
    if (dbCol in normalized && !(codeCol in normalized)) {
      normalized[codeCol as keyof T] = normalized[dbCol as keyof T];
      delete normalized[dbCol as keyof T];
    }
  });

  return normalized;
}

/**
 * Converts numeric strings to proper numbers
 * Fixes ALL Supabase DECIMAL/INTEGER string conversion issues
 */
export function convertDbNumbers<T extends Record<string, any>>(record: T): T {
  if (!record) return record;

  const converted = { ...record };

  // Convert common numeric fields
  const numericFields = [
    'price', 'creditsAmount', 'credits_amount',
    'amount', 'balance_after',
    'credits_per_unit', 'credits_consumed',
    'quantity', 'number_of_reviews'
  ];

  numericFields.forEach(field => {
    if (field in converted && typeof (converted as any)[field] === 'string') {
      const value = (converted as any)[field];
      (converted as any)[field] = field.includes('amount') || field.includes('price') || field.includes('consumed')
        ? parseFloat(value)
        : parseInt(value);
    }
  });

  return converted;
}

/**
 * Comprehensive record normalization
 * Combines all fixes in one call
 */
export function normalizeRecord<T extends Record<string, any>>(record: T): T {
  if (!record) return record;
  return convertDbNumbers(normalizeDbRecord(record));
}

/**
 * Normalizes an array of records
 */
export function normalizeRecords<T extends Record<string, any>>(records: T[]): T[] {
  if (!records || !Array.isArray(records)) return records;
  return records.map(normalizeRecord);
}

/**
 * Safe database query wrapper
 * Handles all common Supabase error patterns
 */
export async function safeDbQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  errorMessage: string = "Database query failed"
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const { data, error } = await queryFn();

    if (error) {
      console.error(`${errorMessage}:`, error);
      return {
        success: false,
        error: `${errorMessage}: ${error.message} (Code: ${error.code})`
      };
    }

    if (!data) {
      return {
        success: false,
        error: `${errorMessage}: No data returned`
      };
    }

    // Normalize the data
    const normalizedData = Array.isArray(data) ? normalizeRecords(data) : normalizeRecord(data);

    return {
      success: true,
      data: normalizedData as T
    };
  } catch (error: any) {
    console.error(`${errorMessage}:`, error);
    return {
      success: false,
      error: `${errorMessage}: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Gets Supabase client with error handling
 */
export async function getDbClient() {
  try {
    return await createSupabaseClient();
  } catch (error: any) {
    throw new Error(`Failed to create Supabase client: ${error.message}`);
  }
}

/**
 * Gets Supabase admin client with validation
 */
export async function getDbAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables');
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY.length < 10) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY appears to be invalid (too short)');
  }

  try {
    return await createSupabaseAdminClient();
  } catch (error: any) {
    throw new Error(`Failed to create Supabase admin client: ${error.message}`);
  }
}
