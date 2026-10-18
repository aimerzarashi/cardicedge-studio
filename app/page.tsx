import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  return (
    <main>
      <h1>studio</h1>
      <p>
        ログイン中:{" "}
        <span data-testid="operator-email">{session.user.email}</span>
      </p>
      <ul>
        <li>
          <Link href="/cards">カードの一覧</Link>
        </li>
        <li>
          <Link href="/creatures/new">Creature を登録</Link>
        </li>
        <li>
          <Link href="/items/new">Item を登録</Link>
        </li>
        <li>
          <Link href="/spells/new">Spell を登録</Link>
        </li>
      </ul>
      <LogoutButton />
    </main>
  );
}
