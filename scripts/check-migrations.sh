#!/usr/bin/env bash
# migrations/ の決まりを検査する。Atlas 自身は以下を検出しない（validate / lint でも検出しない）ため、CI と make lint で補う
#   - 番号の重複: 後のファイルが黙って無視される（未適用同士だと片方だけ適用して panic する）
#   - 適用済みファイルの変更: atlas.sum を作り直されると apply は黙って通る
#   - 指示行（-- atlas:txmode none 等）の直後に空行が無い: 指示が無視される
#   - 適用済みより小さい番号の追加: 空の DB に全部を適用するテストでは通り、本番で初めて out of order で止まる
# 使い方: scripts/check-migrations.sh [比較元のコミット]（指定したときだけ、そこからの変更・削除・改名を検査する）。
# 比較元と migrations/BASELINE の 1 行目が違えば、並びそのものが作り直された（リリース前の例外。core#33）とみなし、
# 比較元との比べ合わせを飛ばす。同じ並びの中では、今までどおり止める
set -euo pipefail

dir=migrations
base=${1:-}
errors=0
fail() { echo "migrations: $*" >&2; errors=$((errors + 1)); }

shopt -s nullglob
files=("$dir"/*.sql)

for f in "${files[@]}"; do
  name=$(basename "$f")
  # Atlas は最初の _ までを番号として読むため、番号は数字だけにする（0002_5_x.sql は 0002 と重複する）
  [[ $name =~ ^[0-9]{4}_[a-z0-9_]+\.sql$ ]] || fail "$name: ファイル名は NNNN_name.sql（小文字・数字・_）にする"
  # 先頭の指示行の直後が空行でないと、Atlas は指示として扱わない
  awk 'NR == 1 && /^-- atlas:/ { d = 1; next } d && /^-- atlas:/ { next } d { exit ($0 == "" ? 0 : 1) }' "$f" ||
    fail "$name: 先頭の -- atlas: 指示行の直後に空行を入れる"
done

dups=$(for f in "${files[@]}"; do basename "$f" | cut -d_ -f1; done | sort | uniq -d)
for v in $dups; do
  fail "番号 $v が重複している: $(cd "$dir" && echo "$v"_*.sql)"
done

baseline=$(head -n1 "$dir/BASELINE" 2>/dev/null || true)
[[ -n $baseline ]] || fail "BASELINE が無い（1 行目に、並びをどの作り直しから始めたかを書く）"
if [[ -n $base ]]; then
  base_baseline=$(git show "$base:$dir/BASELINE" 2>/dev/null | head -n1 || true)
  if [[ $base_baseline != "$baseline" ]]; then
    echo "migrations: 比較元とは並びが作り直されている（BASELINE: 比較元「${base_baseline:-なし}」→「$baseline」）ため、比較元との比べ合わせを飛ばす" >&2
    base=
  fi
fi

if [[ -n $base ]]; then
  changed=$(git diff --name-status --diff-filter=MDR "$base" HEAD -- "$dir/*.sql")
  if [[ -n $changed ]]; then
    fail "適用済みのファイルは変更・削除・改名しない（誤りは新しいマイグレーションで直す）:"
    echo "$changed" >&2
  fi

  # 比較元より小さい番号の追加は、空の DB に全部を適用するテストでは通ってしまい、本番で初めて out of order で止まる
  base_files=$(git ls-tree --name-only "$base" -- "$dir/" | grep '\.sql$' || true)
  base_max=$(echo "$base_files" | xargs -r -n1 basename | cut -d_ -f1 | sort | tail -n1)
  if [[ -n $base_max ]]; then
    for f in "${files[@]}"; do
      grep -qxF "$f" <<<"$base_files" && continue
      v=$(basename "$f" | cut -d_ -f1)
      [[ $v > $base_max ]] || fail "$(basename "$f"): 追加するファイルの番号は比較元の最大（$base_max）より大きくする（リベースして番号を付け直す）"
    done
  fi
fi

[[ $errors -eq 0 ]] || exit 1
