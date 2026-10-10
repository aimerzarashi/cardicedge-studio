import { headers } from "next/headers";
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
      <h1>cms</h1>
      <p>
        ログイン中:{" "}
        <span data-testid="operator-email">{session.user.email}</span>
      </p>
      <LogoutButton />
    </main>
  );
}
