"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) {
      // 429（レート制限）までパスワードの誤りと表示すると、正しいパスワードを打ち直してさらに制限にかかる
      setError(
        error.status === 429
          ? "ログインの試行回数が多すぎます。しばらく待ってからもう一度お試しください"
          : // パスワードが正しいときだけ返る（better-auth は確認メールを送り直す。sendOnSignIn）
            error.code === "EMAIL_NOT_VERIFIED"
            ? "メールアドレスの確認が済んでいません。確認のメールを送ったので、リンクを開いてからログインしてください"
            : "メールアドレスまたはパスワードが正しくありません",
      );
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main>
      <h1>studio ログイン</h1>
      {/* ハイドレーション前に送信されると、ブラウザ標準の GET で資格情報が URL に載るため、
          POST にしたうえでハイドレーションまでボタンを押せないようにする */}
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
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" disabled={!hydrated || pending}>
          ログイン
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <p>
        <Link href="/forgot-password">パスワードを忘れた</Link>
      </p>
      <p>
        <Link href="/signup">アカウントを作る</Link>
      </p>
    </main>
  );
}
