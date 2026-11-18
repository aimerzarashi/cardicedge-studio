import Link from "next/link";
import { RegisterNpcMindsetForm } from "./register-npc-mindset-form";

export default function NewNpcMindsetPage() {
  return (
    <main>
      <h1>NPC の思考パターンを登録</h1>
      <p>
        <Link href="/npc-mindsets">NPC の思考パターンの一覧へ</Link>
      </p>
      <p>名前を決めて登録し、重みは登録した後の詳細の画面で入れます。</p>
      <RegisterNpcMindsetForm />
    </main>
  );
}
