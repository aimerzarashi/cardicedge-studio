"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";

// メールのリンク（better-auth の /api/auth/reset-password/:token）から、?token=... を付けて移ってくる。
// トークンが期限切れ・使用済みのときは ?error=INVALID_TOKEN で移ってくる。
// useSearchParams は Suspense の境界が要るため、送信時に location から読む
function tokenFromLocation() {
  return new URLSearchParams(window.location.search).get("token");
}

export default function ResetPasswordPage() {
  const hydrated = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password"));
    if (newPassword !== String(form.get("confirm"))) {
      setError("確認用のパスワードが一致しません");
      return;
    }
    const token = tokenFromLocation();
    if (!token) {
      setError("リンクが無効です。もう一度メールを送ってください");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (error) {
      setError(
        error.code === "PASSWORD_TOO_SHORT"
          ? "パスワードは 8 文字以上にしてください"
          : "リンクが無効か期限切れです。もう一度メールを送ってください",
      );
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main>
        <h1>パスワードの設定</h1>
        <p role="status">パスワードを設定しました。</p>
        <p>
          <Link href="/login">ログインする</Link>
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>パスワードの設定</h1>
      <form method="post" onSubmit={handleSubmit}>
        <label>
          新しいパスワード
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <label>
          新しいパスワード（確認）
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <button type="submit" disabled={!hydrated || pending}>
          設定する
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <p>
        <Link href="/forgot-password">メールを送り直す</Link>
      </p>
    </main>
  );
}
