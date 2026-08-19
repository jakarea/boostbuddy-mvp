/**
 * Credit balance update utility with retry logic
 * Handles concurrent updates and race conditions with exponential backoff
 */

import { retryWithBackoff, RetryOptions } from './retry';

export interface CreditUpdateResult {
  success: boolean;
  newBalance?: number;
  error?: string;
  attempts: number;
  userEmail?: string;  // User's email for notifications
}

export interface CreditUpdateOptions {
  supabase: any;
  userId: string;
  creditsAmount: number;  // Positive for additions, negative for deductions
  description: string;
  referenceId?: string;
  type?: string;  // "PURCHASE", "SPEND", etc.
  retryOptions?: RetryOptions;
}

/**
 * Update credit balance with automatic retry on concurrent modification
 *
 * This function:
 * 1. Reads the current balance
 * 2. Attempts to update with optimistic concurrency (eq check on credits_balance)
 * 3. If update fails due to concurrent modification, retries with exponential backoff
 * 4. Creates a transaction record after successful balance update
 *
 * @param options - Credit update options
 * @returns Result with success status, new balance, and error details
 */
export async function updateCreditBalanceWithRetry(
  options: CreditUpdateOptions
): Promise<CreditUpdateResult> {
  const {
    supabase,
    userId,
    creditsAmount,
    description,
    referenceId,
    type = "PURCHASE",
    retryOptions = {
      maxRetries: 3,      // Retry up to 3 times
      initialDelay: 100,   // Start with 100ms delay
      maxDelay: 2000      // Max delay of 2 seconds
    }
  } = options;

  // Validate inputs
  if (creditsAmount === 0) {
    return {
      success: false,
      error: 'Credit amount cannot be zero',
      attempts: 0
    };
  }

  if (!userId) {
    return {
      success: false,
      error: 'User ID is required',
      attempts: 0
    };
  }

  console.log(`[CREDIT_UPDATE] Starting credit update for user ${userId}: ${creditsAmount > 0 ? '+' : ''}${creditsAmount}`);

  // Use retry with backoff for the entire operation
  const retryResult = await retryWithBackoff(
    async () => {
      // Step 1: Read current balance
      const { data: user, error: readError } = await supabase
        .from("users")
        .select("credits_balance, email")
        .eq("id", userId)
        .single();

      if (readError || !user) {
        throw new Error(`Failed to read user balance: ${readError?.message || 'User not found'}`);
      }

      const currentBalance = user.credits_balance || 0;
      const newBalance = currentBalance + creditsAmount;

      // Validate new balance won't go negative for deductions
      if (newBalance < 0) {
        throw new Error(`Insufficient credits. Current balance: ${currentBalance}, Attempted deduction: ${-creditsAmount}`);
      }

      // Step 2: Update with optimistic concurrency control
      const { data: updateResult, error: updateError } = await (supabase
        .from("users") as any)
        .update({ credits_balance: newBalance })
        .eq("id", userId)
        .eq("credits_balance", currentBalance)  // Only update if balance hasn't changed
        .select("credits_balance")
        .single();

      if (updateError || !updateResult) {
        // This error is retryable - likely a concurrent modification
        const errorMsg = updateError?.message || 'Balance update failed';
        throw new Error(`Concurrent modification detected: ${errorMsg}. Balance was ${currentBalance} but has been modified.`);
      }

      console.log(`[CREDIT_UPDATE] Balance updated successfully: ${currentBalance} → ${newBalance}`);

      // Step 3: Create transaction record
      const { error: transactionError } = await (supabase
        .from("CreditTransaction") as any)
        .insert({
          user_id: userId,
          amount: creditsAmount,
          balance_after: newBalance,
          type: type,
          description: description,
          reference_id: referenceId,
        });

      if (transactionError) {
        console.error('[CREDIT_UPDATE] Failed to create transaction record:', transactionError);
        // Don't fail the update if transaction creation fails
        // The balance is correct, but we should log this for investigation
      }

      return {
        newBalance,
        userEmail: user.email
      };
    },
    retryOptions
  );

  if (retryResult.success) {
    console.log(`[CREDIT_UPDATE] ✅ Credit update successful after ${retryResult.attempts} attempt(s). New balance: ${retryResult.data?.newBalance}`);
    return {
      success: true,
      newBalance: retryResult.data?.newBalance,
      attempts: retryResult.attempts,
      userEmail: retryResult.data?.userEmail
    };
  } else {
    console.error(`[CREDIT_UPDATE] ❌ Failed after ${retryResult.attempts} attempt(s): ${retryResult.error}`);
    return {
      success: false,
      error: retryResult.error,
      attempts: retryResult.attempts
    };
  }
}

/**
 * Get current credit balance without modification
 */
export async function getCreditBalance(
  supabase: any,
  userId: string
): Promise<{ balance: number; error?: string }> {
  const { data: user, error } = await supabase
    .from("users")
    .select("credits_balance")
    .eq("id", userId)
    .single();

  if (error || !user) {
    return {
      balance: 0,
      error: error?.message || 'User not found'
    };
  }

  return {
    balance: user.credits_balance || 0
  };
}

/**
 * Check if user has sufficient credits for a transaction
 */
export async function hasSufficientCredits(
  supabase: any,
  userId: string,
  requiredAmount: number
): Promise<{ sufficient: boolean; currentBalance: number; error?: string }> {
  const result = await getCreditBalance(supabase, userId);

  if (result.error) {
    return {
      sufficient: false,
      currentBalance: 0,
      error: result.error
    };
  }

  return {
    sufficient: result.balance >= requiredAmount,
    currentBalance: result.balance
  };
}
