import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic check only (no DB): real enforcement lives in src/lib/session.ts.
export function proxy(request: NextRequest) {
  const hasSession = Boolean(getSessionCookie(request));
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    if (hasSession) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except auth API, demo visuals (their sandboxed iframes send no
  // cookies), static assets, and files with extensions.
  matcher: ["/((?!api/auth|visuals|_next|favicon.ico|.*\\..*).*)"],
};
