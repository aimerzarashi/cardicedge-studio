// 開発・テスト用の管理者を作る（既にあれば何もしない）。本番では使わない（本番は make create-admin）
import { auth } from "../lib/auth.ts";

const operator = {
  name: process.env.SEED_OPERATOR_NAME ?? "operator",
  email: process.env.SEED_OPERATOR_EMAIL ?? "operator@example.com",
  password: process.env.SEED_OPERATOR_PASSWORD ?? "operator-password",
};

try {
  // headers を渡さないサーバー側の呼び出しは、管理者のセッションなしで作れる（auth create-admin と同じ経路）
  await auth.api.createUser({ body: { ...operator, role: "admin" } });
  console.log(`seeded operator: ${operator.email}`);
} catch (error) {
  // 2回目以降は既存ユーザーとして弾かれる
  if (error instanceof Error && /already exists/i.test(error.message)) {
    console.log(`operator already exists: ${operator.email}`);
  } else {
    throw error;
  }
}
process.exit(0);
