import Link from "next/link";
import { RegisterNpcAvatarForm } from "./register-npc-avatar-form";

export default function NewNpcAvatarPage() {
  return (
    <main>
      <h1>NPC のアバターを登録</h1>
      <RegisterNpcAvatarForm />
      <p>
        <Link href="/npc-avatars">NPC のアバターの一覧へ</Link>
      </p>
    </main>
  );
}
