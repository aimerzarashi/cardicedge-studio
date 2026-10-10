#!/usr/bin/env bash
# better-auth の設定（lib/auth.ts）と、migrations を適用した DB（DATABASE_URL）に差分が無いことを確かめる。
# lib/auth.ts を変えてマイグレーションを作り忘れると、Atlas の適用は通るのに本番でテーブル・列が足りずに壊れるため
# auth generate は差分が無いとファイルを作らず 0 で終わり、DB に繋がらなければ失敗する
set -euo pipefail

out=$(mktemp -u /tmp/auth-schema-diff.XXXXXX.sql)
pnpm --silent db:generate "$out"
if [[ -f $out ]]; then
  echo "better-auth の設定と DB のスキーマに差分がある。make migrate-generate NAME=<name> でマイグレーションを作る:" >&2
  cat "$out" >&2
  rm -f "$out"
  exit 1
fi
