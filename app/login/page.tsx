"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
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
      <form onSubmit={handleSubmit}>
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
        <button type="submit" disabled={pending}>
          ログイン
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
