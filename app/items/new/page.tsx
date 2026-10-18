import Link from "next/link";
import { RegisterItemForm } from "./register-item-form";

export default function NewItemPage() {
  return (
    <main>
      <h1>Item を登録</h1>
      <RegisterItemForm />
      <p>
        <Link href="/cards">カードの一覧へ</Link>
      </p>
    </main>
  );
}
