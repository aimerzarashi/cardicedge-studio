// Next.js がサーバーの起動時に 1 回呼ぶ
export async function register() {
  // lib/auth.ts（pg 等）は Node.js でしか動かないため、Edge では読み込まない
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureInitialAdmin } = await import("@/lib/initial-admin");
    await ensureInitialAdmin();
  }
}
