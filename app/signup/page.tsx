"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";

export default function SignUpPage() {
  const hydrated = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setError("確認用のパスワードが一致しません");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.signUp.email({
      email: String(form.get("email")),
      password,
      // better-auth の name は必須の列だが使わない（オペレーターのプロフィールは core に持つ。2026-10-11 決定）
      name: "",
      // 確認のリンクを開いた後に移る先（確認しただけではログインしない）
      callbackURL: "/login",
    });
    setPending(false);
    if (error) {
      setError(
        error.status === 429
          ? "受付の回数が多すぎます。しばらく待ってからもう一度お試しください"
          : error.code === "PASSWORD_TOO_SHORT"
            ? "パスワードは 8 文字以上にしてください"
            : "アカウントを作れませんでした。入力を確かめてください",
      );
      return;
    }
    // 登録済みのアドレスでも同じ表示にする（確認を必須にしていると better-auth も同じ応答を返す。登録の有無を探られないため）
    setDone(true);
  }

  if (done) {
    return (
      <main>
        <h1>アカウントの作成</h1>
        <p role="status">
          確認のメールを送りました。メールのリンクを開いてから、ログインしてください。
        </p>
        <p>
          <Link href="/login">ログイン画面に戻る</Link>
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>アカウントの作成</h1>
      <p>
        アカウントを作っても、オペレーターとして登録されたメールアドレスでなければ、studio
        の操作はできません。
      </p>
      {/* ハイドレーション前の送信でブラウザ標準の GET になり、入力値が URL に載るのを防ぐ */}
      <form method="post" onSubmit={handleSubmit}>
        <label>
          メールアドレス
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          パスワード
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <label>
          パスワード（確認）
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <button type="submit" disabled={!hydrated || pending}>
          アカウントを作る
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <p>
        <Link href="/login">ログイン画面に戻る</Link>
      </p>
    </main>
  );
}
