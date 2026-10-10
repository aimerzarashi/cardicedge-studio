"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth-client";

// サーバーの HTML では false、ハイドレーション後は true になる。useEffect で state を切り替えるより再描画が少ない
function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

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
      setError("メールアドレスまたはパスワードが正しくありません");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main>
      <h1>cms ログイン</h1>
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
    </main>
  );
}
