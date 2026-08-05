import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

type Role = "ADMIN" | "CLIENT" | "EMPLOYEE";

// Minimal shape of the Supabase auth user as returned by updateSession.
type AuthUser = {
  id: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
} | null;

function getRoleHome(role: Role | undefined): string {
  switch (role) {
    case "ADMIN":
      return "/a/dashboard";
    case "EMPLOYEE":
      return "/e/dashboard";
    case "CLIENT":
    default:
      return "/c/dashboard";
  }
}

async function resolveRole(user: AuthUser, supabase: any): Promise<Role | undefined> {
  if (!user) return undefined;

  // Try to get role from users table (source of truth)
  try {
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (userData?.role && ["ADMIN", "CLIENT", "EMPLOYEE"].includes(userData.role)) {
      return userData.role as Role;
    }
  } catch (error) {
    console.warn('[MIDDLEWARE] Failed to fetch role from users table:', error);
  }

  // Fallback to JWT metadata if database query fails
  const metaRole = (user.app_metadata?.role || user.user_metadata?.role) as unknown;
  const role = typeof metaRole === "string" ? (metaRole as Role) : undefined;

  if (role === "ADMIN" || role === "CLIENT" || role === "EMPLOYEE") {
    return role;
  }
  return undefined;
}

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

  const { supabaseResponse, user, supabase } = await updateSession(request);

  // Pass current path to Server Components
  request.headers.set('x-current-path', pathname);
  supabaseResponse.headers.set('x-current-path', pathname);

  // Public/auth routes
  const isAuthPage = pathname === "/" || pathname === "/forgot-password" || pathname.startsWith("/reset-password");
  const isPublicRoute = pathname.startsWith("/checkout") || pathname.startsWith("/logout");

  // Unauthenticated users cannot access protected routes
  const role = await resolveRole(user, supabase);
  if (!user && (pathname.startsWith("/a") || pathname.startsWith("/c") || pathname.startsWith("/e"))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Authenticated users shouldn't see the login page (except password reset)
  if (user && isAuthPage && !pathname.startsWith("/reset-password")) {
    return NextResponse.redirect(new URL(getRoleHome(role), request.url));
  }

  // /a/* — ADMIN only
  if (pathname.startsWith("/a")) {
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL(getRoleHome(role), request.url));
    }
    return supabaseResponse;
  }

  // /e/* — EMPLOYEE only
  if (pathname.startsWith("/e")) {
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (role !== "EMPLOYEE") {
      return NextResponse.redirect(new URL(getRoleHome(role), request.url));
    }
    return supabaseResponse;
  }

  // /c/* — CLIENT only (ADMIN/EMPLOYEE go to their own homes)
  if (pathname.startsWith("/c")) {
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (role === "ADMIN" || role === "EMPLOYEE") {
      return NextResponse.redirect(new URL(getRoleHome(role), request.url));
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
