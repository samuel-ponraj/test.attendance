import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROLE_ROUTES: Record<string, string> = {
  bos: "/bos",
  admin: "/admin",
  member: "/member",
};

export default function middleware(request: NextRequest) {
  const role = request.cookies.get("role")?.value;
  const session = request.cookies.get("session")?.value;
  const { pathname } = request.nextUrl;

  if (!session || !role) {
    if (pathname === "/") return NextResponse.next();
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/") {
    const roleRoute = ROLE_ROUTES[role];

    if (roleRoute) return NextResponse.redirect(new URL(roleRoute, request.url));
  }

  if (role === "pending") {
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  if (pathname.startsWith("/bos") && role !== "bos") {
    return NextResponse.redirect(new URL(ROLE_ROUTES[role] || "/", request.url));
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL(ROLE_ROUTES[role] || "/", request.url));
  }

  if (pathname.startsWith("/member") && role !== "member") {
    return NextResponse.redirect(new URL(ROLE_ROUTES[role] || "/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/member/:path*',
    '/bos/:path*'
  ]
}
