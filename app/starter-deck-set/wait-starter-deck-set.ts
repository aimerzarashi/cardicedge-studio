import "server-only";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";

const starterDeckSetRevisionQuery = graphql(`
  query StarterDeckSetRevision {
    starterDeckSet {
      __typename
      ... on StarterDeckSet {
        revision
      }
    }
  }
`);

// 投影の遅れは数 ms のため、ふつうは 1〜2 回で届く。届かないのは投影が止まっているときなので、長くは待たない
const TIMEOUT_MS = 3_000;
const INTERVAL_MS = 50;

// core の設定の結果は revision だけを返し、照会は投影から読む。設定の直後に読むと反映前の中身と revision が返り、
// その revision のまま次の設定をすると「先に変えられた」になるため、照会が設定の結果の revision に届くまで読み直す
// （app/preset-decks/wait-preset-deck.ts と同じ）
export async function waitStarterDeckSet(
  revision: number,
): Promise<"reached" | "timeout"> {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const result = await callCore(starterDeckSetRevisionQuery);
    if (
      result.ok &&
      result.data.starterDeckSet.__typename === "StarterDeckSet" &&
      result.data.starterDeckSet.revision >= revision
    ) {
      return "reached";
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
  return "timeout";
}
