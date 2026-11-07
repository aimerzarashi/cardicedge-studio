import { format, stripVTControlCharacters } from "node:util";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";

const LEVELS = [
  ["debug", SeverityNumber.DEBUG, "DEBUG"],
  ["log", SeverityNumber.INFO, "INFO"],
  ["info", SeverityNumber.INFO, "INFO"],
  ["warn", SeverityNumber.WARN, "WARN"],
  ["error", SeverityNumber.ERROR, "ERROR"],
] as const;

// @vercel/otel はトレースと違い、環境変数からログの送り手を作らない。トレースと同じく、送り先を渡さない環境
// （リリース確認の環境・本番）では送らない。送り手は proto に固定する（compose の OTEL_EXPORTER_OTLP_PROTOCOL が
// http/protobuf のため。http/json に変えるなら送り手も変える）
export function logRecordProcessors() {
  if (
    !process.env.OTEL_EXPORTER_OTLP_ENDPOINT &&
    !process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
  ) {
    return undefined;
  }
  return [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })];
}

// Next.js 自身のエラー（描画・Server Action の失敗等）も console に出るため、ロガーを入れずに console を包む。
// 標準出力にもそのまま出す（docker compose logs で見られるように）。trace_id・span_id は emit が今のコンテキストから付ける。
// OTEL_LOG_LEVEL を渡すと OTel の内部のエラーも console に出て、送れなかったことをまた送ろうとするため、開発の環境では渡さない
export function bridgeConsoleToLogs() {
  const logger = logs.getLogger("console");
  for (const [method, severityNumber, severityText] of LEVELS) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      original(...args);
      // Next.js は色の制御文字を付けて出すため、Loki で読めるように落とす
      logger.emit({
        severityNumber,
        severityText,
        body: stripVTControlCharacters(format(...args)),
      });
    };
  }
}
