import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  // Everything except static assets, the login page itself, the auth API routes, and the
  // TMS webhooks — those routes are hit by an external scheduler with no session cookie
  // and check their own shared-secret auth instead (app/api/tms-sync,
  // app/api/tms-booking-import).
  matcher: ["/((?!api/auth|api/tms-sync|api/tms-booking-import|login|_next/static|_next/image|favicon.ico|icon.png).*)"],
};
