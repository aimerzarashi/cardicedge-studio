import Link from "next/link";
import { RegisterStarterSetForm } from "./register-starter-set-form";

export default function NewStarterSetPage() {
  return (
    <main>
      <h1>スターターセットを登録</h1>
      <p>
        <Link href="/starter-sets">スターターセットの一覧へ</Link>
      </p>
      <RegisterStarterSetForm />
    </main>
  );
}
