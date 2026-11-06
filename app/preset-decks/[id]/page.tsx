import Form from "next/form";
import Link from "next/link";
import { graphql } from "@/graphql";
import type {
  CardType,
  DeckCandidateCardsQuery,
  DeckCandidateCardsQueryVariables,
} from "@/graphql/graphql";
import { CARD_TYPE_LABELS, CARD_TYPES, isCardType } from "@/lib/card-type";
import { type CoreResult, callCore } from "@/lib/core";
import { dateTimeFormat } from "@/lib/format";
import { all, first } from "@/lib/search-params";
import { type CardCountRow, CardCountsForm } from "../../card-counts-form";
import { DeleteDeck } from "../../delete-deck";
import { RenameDeckForm } from "../../rename-deck-form";
import {
  deletePresetDeck,
  renamePresetDeck,
  setPresetDeckCardCounts,
} from "./actions";

const presetDeckQuery = graphql(`
  query PresetDeck($id: UUID!) {
    presetDeck(id: $id) {
      __typename
      ... on PresetDeck {
        id
        name
        cards {
          count
          card {
            __typename
            id
            name
          }
        }
        totalCount
        revision
        registeredAt
        updatedAt
      }
    }
  }
`);

const deckCandidateCardsQuery = graphql(`
  query DeckCandidateCards($filter: CardFilter, $after: String) {
    cards(filter: $filter, after: $after) {
      __typename
      ... on CardConnection {
        edges {
          node {
            __typename
            id
            name
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`);

// 形の違う ID を core に渡すと GraphQL の誤りになり、想定外として扱われるため、形だけを確かめる
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// カードを探す条件は URL に持つ（再読み込み・共有で同じ画面に戻るため）
function pageURL(
  id: string,
  name: string,
  types: CardType[],
  after?: string,
): string {
  const params = new URLSearchParams();
  if (name !== "") {
    params.set("name", name);
  }
  for (const type of types) {
    params.append("type", type);
  }
  if (after !== undefined) {
    params.set("after", after);
  }
  const query = params.toString();
  return query === "" ? `/preset-decks/${id}` : `/preset-decks/${id}?${query}`;
}

function NotFound() {
  return (
    <main>
      <h1>プリセットデッキ</h1>
      <p>
        <Link href="/preset-decks">プリセットデッキの一覧へ</Link>
      </p>
      <p role="alert">このプリセットデッキは見つかりません</p>
    </main>
  );
}

export default async function PresetDeckPage({
  params,
  searchParams,
}: PageProps<"/preset-decks/[id]">) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return <NotFound />;
  }
  const search = await searchParams;
  const name = first(search.name) ?? "";
  // 形だけを確かめる（知らない値を core に渡すと GraphQL の誤りになり、想定外として扱われるため）
  const types = all(search.type).filter(isCardType);
  const after = first(search.after);

  const variables: DeckCandidateCardsQueryVariables = {
    filter: {
      // 空の入力欄は「絞り込まない」。空白だけは core が入力の誤りにする
      ...(name !== "" && { nameContains: name }),
      // 1 つも選ばなければすべての種類（core は空のリストを入力の誤りにするため送らない）
      ...(types.length > 0 && { types }),
      // 準備中・使用不可のカードは入れられない（core が誤りにする）ため、選べるのは公開中だけ
      statuses: ["PUBLISHED"],
    },
    after,
  };
  const [deckResult, candidates] = await Promise.all([
    callCore(presetDeckQuery, { id }),
    callCore(deckCandidateCardsQuery, variables),
  ]);

  if (!deckResult.ok) {
    return (
      <main>
        <h1>プリセットデッキ</h1>
        <p role="alert">
          core に接続できません。時間をおいて再読み込みしてください。{" "}
          <Link href={pageURL(id, name, types, after)}>再読み込み</Link>
        </p>
      </main>
    );
  }
  const deck = deckResult.data.presetDeck;
  switch (deck.__typename) {
    case "ForbiddenError":
      return (
        <main>
          <h1>プリセットデッキ</h1>
          <p role="alert">この操作をする権限がありません</p>
        </main>
      );
    case "PresetDeckNotFoundError":
      return <NotFound />;
    case "PresetDeck":
      break;
  }

  const counts = new Map(deck.cards.map(({ card, count }) => [card.id, count]));
  const deckRows: CardCountRow[] = deck.cards.map(({ card, count }) => ({
    cardId: card.id,
    name: card.name,
    typeLabel: CARD_TYPE_LABELS[card.__typename],
    count,
  }));

  return (
    <main>
      <h1>{deck.name}</h1>
      <p>
        <Link href="/preset-decks">プリセットデッキの一覧へ</Link>
      </p>
      <dl>
        <dt>合計の枚数</dt>
        <dd>{deck.totalCount}</dd>
        <dt>登録日時</dt>
        <dd>{dateTimeFormat.format(new Date(deck.registeredAt))}</dd>
        <dt>更新日時</dt>
        <dd>{dateTimeFormat.format(new Date(deck.updatedAt))}</dd>
      </dl>

      <section aria-labelledby="rename-heading">
        <h2 id="rename-heading">名前の変更</h2>
        <RenameDeckForm
          action={renamePresetDeck}
          id={deck.id}
          revision={deck.revision}
          name={deck.name}
        />
      </section>

      <section aria-labelledby="deck-cards-heading">
        <h2 id="deck-cards-heading">入れたカード</h2>
        {deckRows.length === 0 ? (
          <p>カードが入っていません。下の「カードを探す」から入れてください</p>
        ) : (
          <CardCountsForm
            action={setPresetDeckCardCounts}
            id={deck.id}
            revision={deck.revision}
            rows={deckRows}
          />
        )}
      </section>

      <section aria-labelledby="candidates-heading">
        <h2 id="candidates-heading">カードを探す</h2>
        <Form action={`/preset-decks/${deck.id}`}>
          <label>
            名前
            <input name="name" defaultValue={name} />
          </label>
          <fieldset>
            <legend>種類</legend>
            {CARD_TYPES.map((type) => (
              <label key={type.value}>
                <input
                  type="checkbox"
                  name="type"
                  value={type.value}
                  defaultChecked={types.includes(type.value)}
                />
                {type.label}
              </label>
            ))}
          </fieldset>
          <button type="submit">絞り込む</button>
        </Form>
        <Candidates
          result={candidates}
          deckId={deck.id}
          revision={deck.revision}
          counts={counts}
          name={name}
          types={types}
        />
      </section>

      <section aria-labelledby="delete-heading">
        <h2 id="delete-heading">削除</h2>
        <DeleteDeck
          action={deletePresetDeck}
          id={deck.id}
          revision={deck.revision}
          name={deck.name}
        />
      </section>
    </main>
  );
}

function Candidates({
  result,
  deckId,
  revision,
  counts,
  name,
  types,
}: {
  result: CoreResult<DeckCandidateCardsQuery>;
  deckId: string;
  revision: number;
  counts: Map<string, number>;
  name: string;
  types: CardType[];
}) {
  if (!result.ok) {
    return (
      <p role="alert">
        core に接続できません。時間をおいて再読み込みしてください。{" "}
        <Link href={pageURL(deckId, name, types)}>再読み込み</Link>
      </p>
    );
  }
  const cards = result.data.cards;
  switch (cards.__typename) {
    case "ForbiddenError":
      return <p role="alert">この操作をする権限がありません</p>;
    case "ValidationErrors":
      return (
        <p role="alert">
          条件が正しくありません。{" "}
          <Link href={`/preset-decks/${deckId}`}>条件を外す</Link>
        </p>
      );
    case "CardConnection":
      return (
        <>
          {cards.edges.length === 0 ? (
            <p>カードがありません</p>
          ) : (
            <CardCountsForm
              action={setPresetDeckCardCounts}
              id={deckId}
              revision={revision}
              rows={cards.edges.map(({ node }) => ({
                cardId: node.id,
                name: node.name,
                typeLabel: CARD_TYPE_LABELS[node.__typename],
                count: counts.get(node.id) ?? 0,
              }))}
            />
          )}
          <p>
            <Link href={pageURL(deckId, name, types)}>最初のページへ</Link>
            {cards.pageInfo.hasNextPage && cards.pageInfo.endCursor && (
              <>
                {" "}
                <Link
                  href={pageURL(deckId, name, types, cards.pageInfo.endCursor)}
                >
                  次へ
                </Link>
              </>
            )}
          </p>
        </>
      );
  }
}
