import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ToastContainer";
import { AppProvider } from "@/components/providers/AppProvider";
import { getCachedUser } from "@/lib/auth/cached-auth";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "BoostBuddy MWP - Client Portal & Admin Management",
  description: "Manual IXBrowser client portal and account assignment system.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Single cached call - prevents duplicate Supabase queries
  const initialUser = await getCachedUser();

  return (
    <html lang="en" className={`${outfit.variable} h-full`} suppressHydrationWarning>
      <body className="font-sans antialiased h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
        <AppProvider initialUser={initialUser}>
          <div className="flex-1 flex flex-col overflow-x-hidden min-h-0">
            {children}
          </div>
          <ToastContainer />
        </AppProvider>
      </body>
    </html>
  );
}
