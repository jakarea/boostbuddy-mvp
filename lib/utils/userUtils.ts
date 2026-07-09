/**
 * Pure functions for user data formatting and validation.
 * 
 * By keeping these functions pure (no external state or side-effects like DB calls),
 * they are predictable, highly testable, and isolated from complex dependencies.
 */

export interface UserCreationData {
  name: string;
  email: string;
  role: "ADMIN" | "CLIENT";
}

export interface ValidationResult {
  success: boolean;
  data?: UserCreationData;
  error?: string;
}

/**
 * Formats an email address to be safely stored in the database.
 * 100% pure function.
 * 
 * @param email - The raw email input
 * @returns The formatted email string
 */
export function formatEmail(email: string): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

/**
 * Validates raw form input for user creation.
 * 100% pure function.
 * 
 * @param rawName - The raw name input
 * @param rawEmail - The raw email input
 * @param rawRole - The raw role input
 * @returns A structured validation result
 */
export function validateUserCreationInput(
  rawName: unknown,
  rawEmail: unknown,
  rawRole: unknown
): ValidationResult {
  // 1. Validate Types
  if (typeof rawName !== "string" || typeof rawEmail !== "string" || typeof rawRole !== "string") {
    return { success: false, error: "Invalid input types." };
  }

  // 2. Format
  const name = rawName.trim();
  const email = formatEmail(rawEmail);
  const role = rawRole.trim().toUpperCase();

  // 3. Validate Presence
  if (!name || !email) {
    return { success: false, error: "Name and email are required." };
  }

  // 4. Validate Email Format (basic regex)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  // 5. Validate Role
  if (role !== "ADMIN" && role !== "CLIENT") {
    return { success: false, error: "Role must be either ADMIN or CLIENT." };
  }

  return {
    success: true,
    data: {
      name,
      email,
      role: role as "ADMIN" | "CLIENT",
    },
  };
}
