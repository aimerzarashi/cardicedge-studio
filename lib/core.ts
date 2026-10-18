// JWT を扱い、core はサーバーからだけ呼ぶため、クライアントから読み込まれたらビルドを失敗させる
import "server-only";
import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { TypedDocumentString } from "@/graphql/graphql";
import { auth } from "@/lib/auth";

// core に届かないことは、ふつうに起こりうる失敗なので投げずに返す（Next.js の文書の「想定内の誤り」。投げると、本番では
// error.tsx に渡る message が一般的な文言に置き換わり、ほかの誤りと見分けられない）
export type CoreResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unavailable" };

// core が止まっていれば envoy がすぐ 503 を返すため、これは core が固まっているときの備え
const TIMEOUT_MS = 10_000;

// core が止まっている・つながらないときに envoy が返す状態
const UNAVAILABLE_STATUSES = new Set([502, 503, 504]);

function coreGraphQLURL(): string {
  const url = process.env.CORE_GRAPHQL_URL;
  if (!url) {
    throw new Error("環境変数 CORE_GRAPHQL_URL が設定されていません");
  }
  return url;
}

// 画面のリクエストに付いてきたセッションの Cookie から、better-auth に JWT をもらう。
// /api/auth/token と同じ入口を、HTTP を通さずに関数として呼ぶ（cms#14）
async function sessionToken(): Promise<string> {
  try {
    const { token } = await auth.api.getToken({ headers: await headers() });
    return token;
  } catch (error) {
    if (isAPIError(error) && error.statusCode === 401) {
      redirect("/login");
    }
    throw error;
  }
}

// core の GraphQL を、ログイン中のオペレーターとして呼ぶ。認可・入力の誤り等は、core の結果の型として data に入る
export async function callCore<TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  ...[variables]: TVariables extends Record<string, never> ? [] : [TVariables]
): Promise<CoreResult<TResult>> {
  // 環境変数が無いのは設定の誤り（想定外）なので、届かないこととは分けて投げる
  const url = coreGraphQLURL();
  const token = await sessionToken();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: document.toString(), variables }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    console.error("failed to reach core", error);
    return { ok: false, reason: "unavailable" };
  }

  if (UNAVAILABLE_STATUSES.has(response.status)) {
    return { ok: false, reason: "unavailable" };
  }
  // JWT の期限切れ等。もう一度ログインすれば新しい JWT になる
  if (response.status === 401) {
    redirect("/login");
  }
  if (!response.ok) {
    throw new Error(`core returned status ${response.status}`);
  }

  const body = (await response.json()) as {
    data?: TResult;
    errors?: unknown[];
  };
  // 想定内の誤りは結果の型で返るため、errors は想定外（スキーマとのずれ等）
  if (body.errors?.length || !body.data) {
    throw new Error(`core returned errors: ${JSON.stringify(body.errors)}`);
  }
  return { ok: true, data: body.data };
}
