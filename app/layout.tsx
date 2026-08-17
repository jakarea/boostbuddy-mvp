import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "@/components/ToastContainer";
import { AppProvider } from "@/components/providers/AppProvider";
import { getCachedUser } from "@/lib/auth/cached-auth";
import NextTopLoader from "nextjs-toploader";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-space-grotesk",
  display: "swap",
  fallback: ["system-ui", "arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "BoostBuddy MWP - Client Portal & Admin Management",
  description: "Manual IXBrowser client portal and account assignment system.",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Single cached call - prevents duplicate Supabase queries
  const initialUser = await getCachedUser();

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} font-sans antialiased h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50`}>
        <NextTopLoader
          color="#168BB0"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #168BB0,0 0 5px #168BB0"
        />
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
