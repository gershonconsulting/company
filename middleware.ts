import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Every page and API route requires a valid session, except:
//   /login, /api/auth/* (login, logout, setup, and the account endpoints
//   that check the session themselves), /api/reports/weekly (own key),
//   and static assets.
// Pages redirect to /login; APIs get 401 JSON.


export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (session) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized — sign in at /login" }, { status: 401 });
  }
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`);
  const res = NextResponse.redirect(loginUrl);
  if (token) res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const config = {
  matcher: [
    "/((?!login|api/auth|api/reports/weekly|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|zip)$).*)",
  ],
};
