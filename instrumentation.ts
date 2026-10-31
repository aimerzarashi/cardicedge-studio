import { registerOTel } from "@vercel/otel";

export function register() {
  // 送り先は OpenTelemetry の標準の環境変数（OTEL_EXPORTER_OTLP_ENDPOINT 等）で渡す。コードに書かないのは、受け手の無い
  // リリース確認の環境や本番でも、同じイメージのまま動かすため
  const coreURL = process.env.CORE_GRAPHQL_URL;
  registerOTel({
    serviceName: "studio",
    // @vercel/otel は既定では自分と同じ宛先（VERCEL_URL）への fetch にしか traceparent を付けない。core の宛先にも付けて、
    // studio のスパンと core のスパンを 1 本のトレースにつなぐ。環境変数は実行時に決まるため、ここ（register）で読む
    instrumentationConfig: {
      fetch: { propagateContextUrls: coreURL ? [coreURL] : [] },
    },
  });
}
