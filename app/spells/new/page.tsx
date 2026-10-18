import Link from "next/link";
import { RegisterSpellForm } from "./register-spell-form";

export default function NewSpellPage() {
  return (
    <main>
      <h1>Spell を登録</h1>
      <RegisterSpellForm />
      <p>
        <Link href="/cards">カードの一覧へ</Link>
      </p>
    </main>
  );
}
