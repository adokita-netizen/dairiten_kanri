import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const publicPaths = ["/login", "/api/auth", "/api/webhooks"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.AUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = token.role as string | undefined;

  if (pathname === "/") {
    const dest = role === "OPERATOR" ? "/operator/dashboard" : "/agency/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  if (pathname.startsWith("/operator") && role !== "OPERATOR") {
    return NextResponse.redirect(new URL("/agency/dashboard", req.url));
  }

  if (pathname.startsWith("/agency") && role !== "AGENCY") {
    return NextResponse.redirect(new URL("/operator/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
