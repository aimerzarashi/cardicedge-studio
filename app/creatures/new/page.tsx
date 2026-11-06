import Link from "next/link";
import { RegisterCreatureForm } from "./register-creature-form";

export default function NewCreaturePage() {
  return (
    <main>
      <h1>Creature を登録</h1>
      <p>
        <Link href="/cards">カードの一覧へ</Link>
      </p>
      <RegisterCreatureForm />
    </main>
  );
}
