import { NextResponse } from 'next/server';

export default function middleware(request:any) {
  const role = request.cookies.get("role")?.value;
  const session = request.cookies.get("session")?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  if (!session || !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  if (pathname.startsWith("/member") && role !== "member") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (role === "pending") {
    return NextResponse.redirect(new URL("/pending-approval", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/member/:path*'
  ]
}