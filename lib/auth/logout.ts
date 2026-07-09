/**
 * Complete logout utility - Removes ALL auth data
 * Use this to ensure complete cleanup on logout
 */

const LOG_PREFIX = "[LOGOUT-UTIL]";

/**
 * Clear all browser storage (localStorage, sessionStorage, cookies)
 */
export async function clearAllStorage() {
  console.group(`${LOG_PREFIX} Clearing all browser storage`);

  try {
    // Clear localStorage
    console.log("Step 1: Clearing localStorage...");
    localStorage.clear();
    console.log("  ✅ localStorage cleared");

    // Clear sessionStorage
    console.log("Step 2: Clearing sessionStorage...");
    sessionStorage.clear();
    console.log("  ✅ sessionStorage cleared");

    // Clear all cookies
    console.log("Step 3: Clearing cookies...");
    const cookies = document.cookie.split(";");
    let clearedCount = 0;

    cookies.forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();

      if (name) {
        // Set expiry to past
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
        // Also clear for different paths
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname};`;
        clearedCount++;
      }
    });

    console.log(`  ✅ ${clearedCount} cookies cleared`);

    console.log("Step 4: Clearing IndexedDB...");
    if (window.indexedDB) {
      const dbs = await indexedDB.databases();
      dbs.forEach((db) => {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
          console.log(`  ✅ Deleted IndexedDB: ${db.name}`);
        }
      });
    }

    console.groupEnd();
    console.log(`${LOG_PREFIX} ✅ All storage cleared successfully`);
    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Error clearing storage:`, error);
    console.groupEnd();
    return false;
  }
}

/**
 * Complete logout sequence:
 * 1. Clear all browser storage
 * 2. Clear Supabase session
 * 3. Redirect to home
 */
export async function performCompleteLogout() {
  console.group(`${LOG_PREFIX} Performing complete logout`);

  try {
    console.log("Step 1: Clearing browser storage...");
    clearAllStorage();

    console.log("Step 2: Signing out from Supabase...");
    const { signOutUser } = await import("./pure-functions");
    await signOutUser();
    console.log("  ✅ Signed out from Supabase");

    console.log("Step 3: ✅ Complete logout successful");
    console.groupEnd();

    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Logout error:`, error);
    console.groupEnd();
    return false;
  }
}

/**
 * Redirect to home after logout
 */
export function redirectToHome() {
  console.log(`${LOG_PREFIX} Redirecting to home...`);
  window.location.href = "/";
}

/**
 * Complete logout and redirect
 */
export async function logoutAndRedirect() {
  console.log(`${LOG_PREFIX} Starting logout and redirect...`);

  try {
    await performCompleteLogout();
    redirectToHome();
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Error during logout:`, error);
    // Redirect anyway
    redirectToHome();
  }
}
