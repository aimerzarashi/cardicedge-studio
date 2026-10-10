import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// メールは SMTP で送る（接続先は環境変数 SMTP_URL。開発・テストは Mailpit、本番はメール配信サービス）。
// 送り方をローカルと本番で同じにするため、配信サービスの SDK ではなく SMTP にしている（cms#7）。
// nodemailer の勧告は細工した入力の解析によるものが多いため、宛先は DB にあるアドレスだけを渡し、
// 本文はテキストのみにする（HTML・添付・DKIM は使わない）。将来は core（Go の標準ライブラリ）に移す候補
let transporter: Transporter | undefined;

export async function sendMail(message: {
  to: string;
  subject: string;
  text: string;
}) {
  const url = process.env.SMTP_URL;
  const from = process.env.MAIL_FROM;
  if (!url || !from) {
    throw new Error("環境変数 SMTP_URL / MAIL_FROM が設定されていません");
  }
  transporter ??= nodemailer.createTransport(url);
  await transporter.sendMail({ from, ...message });
}
