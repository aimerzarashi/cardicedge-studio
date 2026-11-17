import { registerOTel } from "@vercel/otel";

export async function register() {
  // ログは node: の API と Node.js 向けの送り手を使うため、Edge では読み込まない（Next.js の公式の書き方）
  const consoleLogs =
    process.env.NEXT_RUNTIME === "nodejs"
      ? await import("./lib/console-logs")
      : undefined;
  // 送り先は OpenTelemetry の標準の環境変数（OTEL_EXPORTER_OTLP_ENDPOINT 等）で渡す。コードに書かないのは、受け手の無い
  // リリース確認の環境や本番でも、同じイメージのまま動かすため
  const coreURL = process.env.CORE_GRAPHQL_URL;
  const logRecordProcessors = consoleLogs?.logRecordProcessors();
  registerOTel({
    serviceName: "studio",
    // @vercel/otel は既定では自分と同じ宛先（VERCEL_URL）への fetch にしか traceparent を付けない。core の宛先にも付けて、
    // studio のスパンと core のスパンを 1 本のトレースにつなぐ。環境変数は実行時に決まるため、ここ（register）で読む
    instrumentationConfig: {
      fetch: { propagateContextUrls: coreURL ? [coreURL] : [] },
    },
    logRecordProcessors,
  });
  if (logRecordProcessors) {
    consoleLogs?.bridgeConsoleToLogs();
  }
}
