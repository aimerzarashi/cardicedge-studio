"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";

export default function ForgotPasswordPage() {
  const hydrated = useHydrated();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage(null);
    const { error } = await authClient.requestPasswordReset({
      email: String(form.get("email")),
      redirectTo: "/reset-password",
    });
    setPending(false);
    // 登録されていないアドレスでも同じ表示にする（better-auth も同じ応答を返す。登録の有無を探られないため）
    setMessage(
      error?.status === 429
        ? "受付の回数が多すぎます。しばらく待ってからもう一度お試しください"
        : "登録されているアドレスであれば、パスワードを設定するメールを送りました",
    );
  }

  return (
    <main>
      <h1>パスワードの設定</h1>
      <p>
        登録されているメールアドレスに、パスワードを設定するリンクを送ります。
      </p>
      {/* ハイドレーション前の送信でブラウザ標準の GET になり、入力値が URL に載るのを防ぐ */}
      <form method="post" onSubmit={handleSubmit}>
        <label>
          メールアドレス
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <button type="submit" disabled={!hydrated || pending}>
          メールを送る
        </button>
      </form>
      {message && <p role="status">{message}</p>}
      <p>
        <Link href="/login">ログイン画面に戻る</Link>
      </p>
    </main>
  );
}
