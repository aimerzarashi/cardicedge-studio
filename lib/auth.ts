// 秘密の値や DB の接続情報を扱うため、クライアントコンポーネントから読み込まれたらビルドを失敗させる
import "server-only";
import { betterAuth } from "better-auth";
import { admin, jwt } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";
import { Pool } from "pg";
// seed・better-auth の CLI が Node.js で直接読むため、パスの別名（@/）を使わない
import { sendMail } from "./mail.ts";

// JWT の iss / aud は core が (iss, sub) でオペレーターを識別するキーに関わる。
// 未設定だと better-auth は黙って BETTER_AUTH_URL を使うため、実行時に必ず確かめる。
// next build 中（NEXT_PHASE=phase-production-build）は環境変数を渡さないため確かめない
if (process.env.NEXT_PHASE !== "phase-production-build") {
  for (const name of ["JWT_ISSUER", "JWT_AUDIENCE"]) {
    if (!process.env[name]) {
      throw new Error(`環境変数 ${name} が設定されていません`);
    }
  }
}

// Admin プラグインの既定の管理者から次の権限を外す（cms#7）
// - user:impersonate: JWT は (iss, sub) だけのため、core からなりすましを見分けられず、操作が本人のものとして記録される
// - user:delete: core 側の (iss, sub) → operator.ID の対応が宙に浮く。使えなくするときは ban にする
// - user:set-email: メールによるパスワードリセットと組み合わせると、ほかのオペレーターを乗っ取れる
const ac = createAccessControl(defaultStatements);
const roles = {
  admin: ac.newRole({
    user: [
      "create",
      "list",
      "get",
      "update",
      "set-role",
      "ban",
      "set-password",
    ],
    session: ["list", "revoke", "delete"],
  }),
  user: ac.newRole({ user: [], session: [] }),
};

// secret / baseURL は better-auth が BETTER_AUTH_SECRET / BETTER_AUTH_URL から読む
export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  // Tunnel の URL は起動ごとに変わるため、環境変数で足せるようにする
  trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== ""),
  emailAndPassword: {
    enabled: true,
    // オペレーターは自分で登録できない。管理者が Admin プラグインの createUser（auth create-admin・seed も同じ）で作る
    disableSignUp: true,
    // 再設定したら、乗っ取られていたかもしれないセッションも含めて、その人のセッションをすべて消す
    revokeSessionsOnPasswordReset: true,
    // url は better-auth の /reset-password/:token。開くと redirectTo（/reset-password）に token を付けて移る
    sendResetPassword: async ({ user, url }) => {
      // 送信を待つと、登録されているアドレスかどうかで応答時間が変わる（タイミング攻撃）ため待たない
      void sendMail({
        to: user.email,
        subject: "【diecardomain cms】パスワードの設定",
        text: [
          `${user.name} さん`,
          "",
          "パスワードの設定を受け付けました。次のリンクから 1 時間以内に設定してください。",
          url,
          "",
          "心当たりが無い場合は、このメールを破棄してください。",
        ].join("\n"),
      }).catch((error) =>
        console.error("failed to send reset password mail", error),
      );
    },
  },
  plugins: [
    admin({ ac, roles }),
    jwt({
      jwt: {
        // 既定では BETTER_AUTH_URL になり、URL を変えると core 側の (iss, sub) の対応づけが変わるため明示する
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        // 既定ではユーザー情報（email 等）がまるごと入る。core は (iss, sub) しか使わないため何も足さない
        definePayload: () => ({}),
      },
    }),
  ],
});
