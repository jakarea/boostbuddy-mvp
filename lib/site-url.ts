import { headers } from "next/headers";

/**
 * Checks if a URL or host points to the marketing/landing page (boostbuddy.it)
 * rather than the web application (app.boostbuddy.it).
 */
function isApexMarketingSite(urlOrHost: string): boolean {
  const clean = urlOrHost.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return clean === "boostbuddy.it" || clean === "www.boostbuddy.it";
}

/**
 * Returns the fallback base URL for the application.
 * Default: https://app.boostbuddy.it in production, http://localhost:3400 in dev.
 */
export function getDefaultAppUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && !isApexMarketingSite(envUrl)) {
    return envUrl.replace(/\/$/, "");
  }
  return process.env.NODE_ENV === "production"
    ? "https://app.boostbuddy.it"
    : "http://localhost:3400";
}

/**
 * Dynamically resolves the base site URL for redirects, webhooks, and absolute URLs.
 * 1. Inspects request 'origin' header (from server actions / browser POST requests)
 * 2. Inspects request 'x-forwarded-host' / 'host' header
 * 3. Falls back to NEXT_PUBLIC_SITE_URL (ignoring apex marketing domain boostbuddy.it)
 * 4. Defaults to production domain https://app.boostbuddy.it or http://localhost:3400
 */
export async function getSiteUrl(): Promise<string> {
  try {
    const headersList = await headers();

    // 1. Origin header (sent by browsers on POST / server actions)
    const origin = headersList.get("origin");
    if (origin && !isApexMarketingSite(origin)) {
      return origin.replace(/\/$/, "").replace(/^https?:\/\/www\.app\./, "https://app.");
    }

    // 2. Host / X-Forwarded-Host header
    const host = headersList.get("x-forwarded-host") || headersList.get("host");
    if (host && !isApexMarketingSite(host)) {
      const normalizedHost = host.replace(/^www\.app\./, "app.");
      const proto =
        headersList.get("x-forwarded-proto") ||
        (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
      return `${proto}://${normalizedHost}`.replace(/\/$/, "");
    }
  } catch {
    // headers() may throw outside request scope
  }

  return getDefaultAppUrl();
}
