// 秘密の値や DB の接続情報を扱うため、クライアントコンポーネントから読み込まれたらビルドを失敗させる
import "server-only";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

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
    // オペレーターは自分で登録できない。disableSignUp はサーバー側の signUpEmail も拒否するため、
    // seed のときだけ AUTH_ALLOW_SIGN_UP=true で許可する
    disableSignUp: process.env.AUTH_ALLOW_SIGN_UP !== "true",
  },
  plugins: [
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
