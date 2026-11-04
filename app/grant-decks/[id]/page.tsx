import Form from "next/form";
import Link from "next/link";
import { graphql } from "@/graphql";
import type {
  CardType,
  GrantDeckCandidateCardsQuery,
  GrantDeckCandidateCardsQueryVariables,
} from "@/graphql/graphql";
import { CARD_TYPE_LABELS, CARD_TYPES, isCardType } from "@/lib/card-type";
import { type CoreResult, callCore } from "@/lib/core";
import { dateTimeFormat } from "@/lib/format";
import { all, first } from "@/lib/search-params";
import { STATUS_LABELS } from "@/lib/status";
import { type CardCountRow, CardCountsForm } from "../../card-counts-form";
import { DeleteDeck } from "../../delete-deck";
import { RenameDeckForm } from "../../rename-deck-form";
import { StatusButton } from "../../status-button";
import {
  deleteGrantDeck,
  publishGrantDeck,
  renameGrantDeck,
  retireGrantDeck,
  setGrantDeckCardCounts,
} from "./actions";

const grantDeckQuery = graphql(`
  query GrantDeck($id: UUID!) {
    grantDeck(id: $id) {
      __typename
      ... on GrantDeck {
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
        status
        totalCount
        revision
        registeredAt
        updatedAt
      }
    }
  }
`);

const deckCandidateCardsQuery = graphql(`
  query GrantDeckCandidateCards($filter: CardFilter, $after: String) {
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
  return query === "" ? `/grant-decks/${id}` : `/grant-decks/${id}?${query}`;
}

function NotFound() {
  return (
    <main>
      <h1>配布デッキ</h1>
      <p role="alert">この配布デッキは見つかりません</p>
      <p>
        <Link href="/grant-decks">配布デッキの一覧へ</Link>
      </p>
    </main>
  );
}

export default async function GrantDeckPage({
  params,
  searchParams,
}: PageProps<"/grant-decks/[id]">) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return <NotFound />;
  }
  const search = await searchParams;
  const name = first(search.name) ?? "";
  // 形だけを確かめる（知らない値を core に渡すと GraphQL の誤りになり、想定外として扱われるため）
  const types = all(search.type).filter(isCardType);
  const after = first(search.after);

  const variables: GrantDeckCandidateCardsQueryVariables = {
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
    callCore(grantDeckQuery, { id }),
    callCore(deckCandidateCardsQuery, variables),
  ]);

  if (!deckResult.ok) {
    return (
      <main>
        <h1>配布デッキ</h1>
        <p role="alert">
          core に接続できません。時間をおいて再読み込みしてください。{" "}
          <Link href={pageURL(id, name, types, after)}>再読み込み</Link>
        </p>
      </main>
    );
  }
  const deck = deckResult.data.grantDeck;
  switch (deck.__typename) {
    case "ForbiddenError":
      return (
        <main>
          <h1>配布デッキ</h1>
          <p role="alert">この操作をする権限がありません</p>
        </main>
      );
    case "GrantDeckNotFoundError":
      return <NotFound />;
    case "GrantDeck":
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
      <dl>
        <dt>状態</dt>
        <dd>{STATUS_LABELS[deck.status]}</dd>
        <dt>合計の枚数</dt>
        <dd>{deck.totalCount}</dd>
        <dt>登録日時</dt>
        <dd>{dateTimeFormat.format(new Date(deck.registeredAt))}</dd>
        <dt>更新日時</dt>
        <dd>{dateTimeFormat.format(new Date(deck.updatedAt))}</dd>
      </dl>

      <section aria-labelledby="status-heading">
        <h2 id="status-heading">公開</h2>
        {deck.status === "PUBLISHED" ? (
          <StatusButton
            action={retireGrantDeck}
            label="使用不可にする"
            id={deck.id}
            revision={deck.revision}
          />
        ) : (
          <StatusButton
            action={publishGrantDeck}
            label="公開する"
            id={deck.id}
            revision={deck.revision}
          />
        )}
      </section>

      {deck.status === "DRAFT" ? (
        <>
          <section aria-labelledby="rename-heading">
            <h2 id="rename-heading">名前の変更</h2>
            <RenameDeckForm
              action={renameGrantDeck}
              id={deck.id}
              revision={deck.revision}
              name={deck.name}
            />
          </section>

          <section aria-labelledby="deck-cards-heading">
            <h2 id="deck-cards-heading">入れたカード</h2>
            {deckRows.length === 0 ? (
              <p>
                カードが入っていません。下の「カードを探す」から入れてください
              </p>
            ) : (
              <CardCountsForm
                action={setGrantDeckCardCounts}
                id={deck.id}
                revision={deck.revision}
                rows={deckRows}
              />
            )}
          </section>

          <section aria-labelledby="candidates-heading">
            <h2 id="candidates-heading">カードを探す</h2>
            <Form action={`/grant-decks/${deck.id}`}>
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
              action={deleteGrantDeck}
              id={deck.id}
              revision={deck.revision}
              name={deck.name}
            />
          </section>
        </>
      ) : (
        <section aria-labelledby="deck-cards-heading">
          <h2 id="deck-cards-heading">入れたカード</h2>
          <p>公開中・使用不可の配布デッキは変えられません</p>
          {deckRows.length === 0 ? (
            <p>カードが入っていません</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>カード名</th>
                  <th>種類</th>
                  <th>枚数</th>
                </tr>
              </thead>
              <tbody>
                {deckRows.map((row) => (
                  <tr key={row.cardId}>
                    <td>{row.name}</td>
                    <td>{row.typeLabel}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <p>
        <Link href="/grant-decks">配布デッキの一覧へ</Link>
      </p>
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
  result: CoreResult<GrantDeckCandidateCardsQuery>;
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
          <Link href={`/grant-decks/${deckId}`}>条件を外す</Link>
        </p>
      );
    case "CardConnection":
      return (
        <>
          {cards.edges.length === 0 ? (
            <p>カードがありません</p>
          ) : (
            <CardCountsForm
              action={setGrantDeckCardCounts}
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
