import "server-only";
import { presetDeckRevisionQuery } from "@/app/preset-decks/operations";
import { callCore } from "@/lib/core";

// 投影の遅れは数 ms のため、ふつうは 1〜2 回で届く。届かないのは投影が止まっているときなので、長くは待たない
const TIMEOUT_MS = 3_000;
const INTERVAL_MS = 50;

// core の操作の結果は revision だけを返し、詳細は投影から読む。操作の直後に読むと反映前の中身と revision が返り、
// その revision のまま次の操作をすると「先に変えられた」になるため、詳細が操作の結果の revision に届くまで読み直す。
// 登録の直後は、届くまで詳細が「見つからない」になる
export async function waitPresetDeck(
  id: string,
  revision: number,
): Promise<"reached" | "timeout"> {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const result = await callCore(presetDeckRevisionQuery, { id });
    if (
      result.ok &&
      result.data.presetDeck.__typename === "PresetDeck" &&
      result.data.presetDeck.revision >= revision
    ) {
      return "reached";
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
  return "timeout";
}
