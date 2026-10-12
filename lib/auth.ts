// 秘密の値や DB の接続情報を扱うため、クライアントコンポーネントから読み込まれたらビルドを失敗させる
import "server-only";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
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
    // 誰でもアカウントは作れる。誰をオペレーターにするかは core が決め、core に登録されたメールアドレスを
    // 確認したアカウントだけが、初めて core を呼んだときにオペレーターに紐づく（core#7。設計メモ「オペレーターの登録と権限」）
    requireEmailVerification: true,
    // 再設定したら、乗っ取られていたかもしれないセッションも含めて、その人のセッションをすべて消す
    revokeSessionsOnPasswordReset: true,
    // url は better-auth の /reset-password/:token。開くと redirectTo（/reset-password）に token を付けて移る
    sendResetPassword: async ({ user, url }) => {
      // 送信を待つと、登録されているアドレスかどうかで応答時間が変わる（タイミング攻撃）ため待たない
      void sendMail({
        to: user.email,
        subject: "【diecardomain cms】パスワードの設定",
        text: [
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
  emailVerification: {
    sendOnSignUp: true,
    // 他人に先にこのアドレスでサインアップされていても、持ち主はパスワードを設定し直したうえでログインすれば
    // 確認メールを受け取り、使えるようになる（パスワードの再設定では確認済みにならないため）
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      // 送信を待つと、登録されているアドレスかどうかで応答時間が変わる（タイミング攻撃）ため待たない
      void sendMail({
        to: user.email,
        subject: "【diecardomain cms】メールアドレスの確認",
        text: [
          "メールアドレスの確認のため、次のリンクを開いてください。開くとログインできるようになります。",
          url,
          "",
          "心当たりが無い場合は、このメールを破棄してください。",
        ].join("\n"),
      }).catch((error) =>
        console.error("failed to send verification mail", error),
      );
    },
  },
  advanced: {
    ipAddress: {
      // 既定の X-Forwarded-For は利用者が付けられ、そのまま信じると偽装でレート制限をすり抜けられる（cms#10）。
      // envoy が接続元から判定して上書きで入れる x-client-ip だけを見る（better-auth 公式の推奨: プロキシが設定する信頼できるヘッダー 1 つ）
      ipAddressHeaders: ["x-client-ip"],
    },
  },
  rateLimit: {
    // 既定は各台のメモリで数えるため、複数台にすると台ごとに数えて上限が実質台数倍になる
    storage: "database",
  },
  plugins: [
    jwt({
      jwt: {
        // 既定では BETTER_AUTH_URL になり、URL を変えると core 側の (iss, sub) の対応づけが変わるため明示する
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        // 既定ではユーザー情報がまるごと入る。core は (iss, sub) で識別し、メールアドレスは初めてのログインで
        // オペレーターに紐づけるときにだけ使うため、それだけを入れる（クレーム名は OIDC の標準。core#7）
        definePayload: ({ user }) => ({
          email: user.email,
          email_verified: user.emailVerified,
        }),
      },
    }),
  ],
});
