"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// トップと、ログインしていなくても開く画面（proxy.ts の PUBLIC_PATHS と同じ）には出さない。
// 各画面の見出しの下に 1 つずつ書かないのは、全画面に同じリンクを書き写すと、画面を足したときに書き忘れるため
const HIDDEN_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

export function TopLink() {
  const pathname = usePathname();
  if (
    pathname === "/" ||
    HIDDEN_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return null;
  }
  return (
    <nav aria-label="全体">
      <Link href="/">トップへ</Link>
    </nav>
  );
}
