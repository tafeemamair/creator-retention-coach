import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY
  )?.trim();

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes("placeholder-project.supabase.co") ||
    supabaseAnonKey === "placeholder-anon-key"
  ) {
    if (process.env.NODE_ENV === "production") {
      // In production, fail closed: never bypass authentication for protected /app routes
      if (pathname.startsWith("/app")) {
        const redirectUrl = new URL("/auth/login", request.url);
        redirectUrl.searchParams.set("next", pathname);
        redirectUrl.searchParams.set("error", "auth_unavailable");
        return NextResponse.redirect(redirectUrl);
      }
      return response;
    }
    // Development-only: allow request to pass for local offline preview if Supabase is not configured
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /app and subroutes
  if (pathname.startsWith("/app")) {
    if (!user) {
      const redirectUrl = new URL("/auth/login", request.url);
      const search = request.nextUrl.search;
      const fullPath = search ? `${pathname}${search}` : pathname;
      redirectUrl.searchParams.set("next", fullPath);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // If already logged in, redirect /auth/login to safe internal next destination or /app
  if (pathname === "/auth/login" && user) {
    const rawNext = request.nextUrl.searchParams.get("next");
    let safeNext = "/app";
    if (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")) {
      safeNext = rawNext;
    }
    return NextResponse.redirect(new URL(safeNext, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/app/:path*",
    "/auth/:path*",
  ],
};
