// 変更の画面の状態（選んだプリセットデッキ・絞り込み・ページ）は URL に持つ（再読み込み・ページの移動で選んだものが消えないため）。
// 照会の画面からも、今のスターターデッキの元を選んだ状態で開くのに使う
export function editURL({
  selected,
  name = "",
  after,
}: {
  selected: string[];
  name?: string;
  after?: string;
}): string {
  const params = new URLSearchParams();
  for (const id of selected) {
    params.append("selected", id);
  }
  if (name !== "") {
    params.set("name", name);
  }
  if (after !== undefined) {
    params.set("after", after);
  }
  const query = params.toString();
  return query === ""
    ? "/starter-deck-set/edit"
    : `/starter-deck-set/edit?${query}`;
}
