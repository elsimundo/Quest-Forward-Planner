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
  // Everything except static assets, the login page itself, and the auth API routes.
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico|icon.png).*)"],
};
