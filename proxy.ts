import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets/internal routes bypass
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  // Pass current path to Server Components
  request.headers.set('x-current-path', pathname);
  supabaseResponse.headers.set('x-current-path', pathname); // Keep for good measure if next allows it

  const isAuthPage = pathname === "/" || pathname === "/forgot-password" || pathname.startsWith("/reset-password");
  const isAdminPage = pathname.startsWith("/admin");
  const isDashboardPage = pathname.startsWith("/dashboard");

  // Unauthenticated users cannot access protected routes
  if (!user && (isAdminPage || isDashboardPage)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Authenticated users shouldn't see the login page
  if (user && isAuthPage && !pathname.startsWith("/reset-password")) {
    // Send to /dashboard. If they are an Admin, the dashboard layout will redirect them to /admin/dashboard.
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
