import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// 未ログインでもアクセスできるパス（前方一致）
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

// lib/auth.ts の advanced.cookiePrefix と同じ値（理由はそちら）。未設定なら既定の名前を見て、ログインしていても未ログインと
// 判定し続けるため、黙って進めず止める
function cookiePrefix(): string {
  const value = process.env.BETTER_AUTH_COOKIE_PREFIX;
  if (!value) {
    throw new Error("環境変数 BETTER_AUTH_COOKIE_PREFIX が設定されていません");
  }
  return value;
}

// Cookie の有無だけで判定する（DB に問い合わせない）。セッションの有効性は各ページで確かめる
export function proxy(request: NextRequest) {
  if (
    !isPublicPath(request.nextUrl.pathname) &&
    !getSessionCookie(request, { cookiePrefix: cookiePrefix() })
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
