// 開発・テスト用の、メールアドレスを確認済みのオペレーターを作る（既にあれば何もしない）。本番では使わない。
// アドレスは core の初期オペレーター（CMS_INITIAL_OPERATOR_EMAIL）と同じにし、ログインすると core で紐づくようにする
import { auth } from "../lib/auth.ts";

const operator = {
  email: process.env.SEED_OPERATOR_EMAIL ?? "operator@example.com",
  password: process.env.SEED_OPERATOR_PASSWORD ?? "operator-password",
};

// サインアップの API は確認メールを送り、確認済みにできないため、better-auth の内部の API で作る
// （手順は Admin プラグインの createUser と同じ。ユーザーを作り、パスワードを credential のアカウントとして結びつける）
const ctx = await auth.$context;
if (await ctx.internalAdapter.findUserByEmail(operator.email)) {
  console.log(`operator already exists: ${operator.email}`);
} else {
  const user = await ctx.internalAdapter.createUser(
    {
      email: operator.email,
      // better-auth の name は必須の列だが使わない（オペレーターのプロフィールは core に持つ。2026-10-11 決定）
      name: "",
      emailVerified: true,
    },
    { method: "seed" },
  );
  await ctx.internalAdapter.linkAccount({
    providerId: "credential",
    accountId: user.id,
    userId: user.id,
    password: await ctx.password.hash(operator.password),
  });
  console.log(`seeded operator: ${operator.email}`);
}
process.exit(0);
