"use client";

import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { ConfirmProvider } from "@/context/ConfirmContext";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/components/providers/I18nProvider";
import type { CachedUser } from "@/lib/auth/cached-auth";

/**
 * Unified Application Provider
 * Combines 6 nested providers into a single component for cleaner structure
 * and slight reduction in React tree overhead.
 *
 * Provider order (MUST be maintained):
 * 1. I18nProvider - Sets up i18n/translation context
 * 2. AuthProvider - Sets up authentication context
 * 3. ToastProvider - Sets up toast notifications
 * 4. ConfirmProvider - Sets up confirmation dialogs
 * 5. ThemeProvider - Sets up theme/dark mode
 */
export function AppProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: CachedUser | null;
}) {
  return (
    <I18nProvider>
      <AuthProvider initialUser={initialUser}>
        <ToastProvider>
          <ConfirmProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              enableColorScheme={false}
              disableTransitionOnChange
              forcedTheme={undefined}
            >
              {children}
            </ThemeProvider>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
