import "server-only";
import { Pool } from "pg";
import { auth } from "./auth.ts";

// 最初の管理者を、環境変数 INITIAL_ADMIN_EMAIL のアドレスでパスワード無しで作る（cms#7）。
// 本人は「パスワードを忘れた」からメールで設定する。デプロイする人ごとにアドレスを変えられ、
// ローカルと本番で同じ方法になる（migrations は全環境で共通のため、アドレスを書けない）。
// 「管理者が 1 人もいないとき」ではなく「このアドレスのユーザーがいないとき」に作る。開発・テストでは
// seed のパスワード付きの管理者が先にいるため、前者だと本番と同じ流れを確かめられない
export async function ensureInitialAdmin() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.toLowerCase();
  if (!email) return;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rowCount } = await pool.query(
      `select 1 from "user" where email = $1`,
      [email],
    );
    if (rowCount) return;
  } finally {
    await pool.end();
  }

  try {
    // password を渡さないと、パスワードの登録が無いユーザーになる（何を入力してもログインできない）。
    // headers を渡さないサーバー側の呼び出しは、管理者のセッションなしで作れる
    await auth.api.createUser({
      body: {
        email,
        name: process.env.INITIAL_ADMIN_NAME || email,
        role: "admin",
      },
    });
    console.log(`created initial admin: ${email}`);
  } catch (error) {
    // 複数台が同時に起動すると、先に作った側以外はメールアドレスの重複で失敗する
    if (error instanceof Error && /already exists/i.test(error.message)) return;
    throw error;
  }
}
