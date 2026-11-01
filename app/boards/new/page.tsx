import Link from "next/link";
import { RegisterBoardForm } from "./register-board-form";

export default function NewBoardPage() {
  return (
    <main>
      <h1>ボードを登録</h1>
      <p>
        名前を決めて登録します。大きさは 8×8
        でマスは置かれていません。レイアウトは登録した後に決めます。
      </p>
      <RegisterBoardForm />
      <p>
        <Link href="/boards">ボードの一覧へ</Link>
      </p>
    </main>
  );
}
