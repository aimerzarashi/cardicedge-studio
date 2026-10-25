import "server-only";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";

// card(id) の問い合わせが無いため、名前で絞った一覧から探す
const cardRevisionQuery = graphql(`
  query CardRevision($name: String!) {
    cards(filter: { nameContains: $name }, first: 100) {
      __typename
      ... on CardConnection {
        edges {
          node {
            id
            revision
          }
        }
      }
    }
  }
`);

// 投影の遅れは数 ms のため、ふつうは 1〜2 回で届く。届かないのは投影が止まっているときなので、長くは待たない
const TIMEOUT_MS = 3_000;
const INTERVAL_MS = 50;

// app/preset-decks/wait-preset-deck.ts と同じ考え方。操作の結果の revision が一覧に届くまで読み直す
export async function waitCard(
  id: string,
  name: string,
  revision: number,
): Promise<"reached" | "timeout"> {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const result = await callCore(cardRevisionQuery, { name });
    if (
      result.ok &&
      result.data.cards.__typename === "CardConnection" &&
      result.data.cards.edges.some(
        ({ node }) => node.id === id && node.revision >= revision,
      )
    ) {
      return "reached";
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
  return "timeout";
}
