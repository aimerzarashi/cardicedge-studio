import { useSyncExternalStore } from "react";

// サーバーの HTML では false、ハイドレーション後は true になる。useEffect で state を切り替えるより再描画が少ない。
// フォームはハイドレーションまで送信させない（ブラウザ標準の送信で入力値が URL に載るため。cms#6）
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
