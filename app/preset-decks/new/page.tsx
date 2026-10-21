import Link from "next/link";
import { RegisterPresetDeckForm } from "./register-preset-deck-form";

export default function NewPresetDeckPage() {
  return (
    <main>
      <h1>プリセットデッキを登録</h1>
      <p>名前を決めて登録し、カードは登録した後の詳細の画面で入れます。</p>
      <RegisterPresetDeckForm />
      <p>
        <Link href="/preset-decks">プリセットデッキの一覧へ</Link>
      </p>
    </main>
  );
}
