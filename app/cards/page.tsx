import Form from "next/form";
import Link from "next/link";
import { graphql } from "@/graphql";
import type {
  CardStatus,
  CardsQuery,
  CardsQueryVariables,
  CardType,
} from "@/graphql/graphql";
import { CARD_TYPE_LABELS, CARD_TYPES, isCardType } from "@/lib/card-type";
import { type CoreResult, callCore } from "@/lib/core";
import { dateTimeFormat } from "@/lib/format";
import { all, first } from "@/lib/search-params";
import { isStatus, STATUS_LABELS, STATUSES } from "@/lib/status";
import { publishCard, retireCard } from "./actions";
import { CardStatusButton } from "./card-status-button";

const cardsQuery = graphql(`
  query Cards($filter: CardFilter, $after: String) {
    cards(filter: $filter, after: $after) {
      __typename
      ... on CardConnection {
        edges {
          node {
            __typename
            id
            name
            status
            revision
            registeredAt
            updatedAt
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

// 条件は URL に持つ（再読み込み・共有で同じ一覧に戻るため）
function pageURL(
  name: string,
  types: CardType[],
  statuses: CardStatus[],
  after?: string,
): string {
  const params = new URLSearchParams();
  if (name !== "") {
    params.set("name", name);
  }
  for (const type of types) {
    params.append("type", type);
  }
  for (const status of statuses) {
    params.append("status", status);
  }
  if (after !== undefined) {
    params.set("after", after);
  }
  const query = params.toString();
  return query === "" ? "/cards" : `/cards?${query}`;
}

export default async function CardsPage({ searchParams }: PageProps<"/cards">) {
  const params = await searchParams;
  const name = first(params.name) ?? "";
  // 形だけを確かめる（知らない値を core に渡すと GraphQL の誤りになり、想定外として扱われるため）
  const types = all(params.type).filter(isCardType);
  const statuses = all(params.status).filter(isStatus);
  const after = first(params.after);

  const variables: CardsQueryVariables = {
    filter: {
      // 空の入力欄は「絞り込まない」。空白だけは core が入力の誤りにする
      ...(name !== "" && { nameContains: name }),
      // 1 つも選ばなければすべての種類（core は空のリストを入力の誤りにするため送らない）
      ...(types.length > 0 && { types }),
      ...(statuses.length > 0 && { statuses }),
    },
    after,
  };
  const result = await callCore(cardsQuery, variables);

  return (
    <main>
      <h1>カードの一覧</h1>
      <p>
        <Link href="/creatures/new">Creature を登録</Link>
      </p>
      <p>
        <Link href="/items/new">Item を登録</Link>
      </p>
      <p>
        <Link href="/spells/new">Spell を登録</Link>
      </p>
      <Form action="/cards">
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
        <fieldset>
          <legend>状態</legend>
          {STATUSES.map((status) => (
            <label key={status.value}>
              <input
                type="checkbox"
                name="status"
                value={status.value}
                defaultChecked={statuses.includes(status.value)}
              />
              {status.label}
            </label>
          ))}
        </fieldset>
        <button type="submit">絞り込む</button>
      </Form>
      <CardsResult
        result={result}
        name={name}
        types={types}
        statuses={statuses}
      />
    </main>
  );
}

function CardsResult({
  result,
  name,
  types,
  statuses,
}: {
  result: CoreResult<CardsQuery>;
  name: string;
  types: CardType[];
  statuses: CardStatus[];
}) {
  if (!result.ok) {
    return (
      <p role="alert">
        core に接続できません。時間をおいて再読み込みしてください。{" "}
        <Link href={pageURL(name, types, statuses)}>再読み込み</Link>
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
          条件が正しくありません。 <Link href="/cards">最初のページへ</Link>
        </p>
      );
    case "CardConnection":
      return (
        <>
          {cards.edges.length === 0 ? (
            <p>カードがありません</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>カード名</th>
                  <th>種類</th>
                  <th>状態</th>
                  <th>登録日時</th>
                  <th>更新日時</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {cards.edges.map(({ node }) => (
                  <tr key={node.id}>
                    <td>{node.name}</td>
                    <td>{CARD_TYPE_LABELS[node.__typename]}</td>
                    <td>{STATUS_LABELS[node.status]}</td>
                    <td>
                      {dateTimeFormat.format(new Date(node.registeredAt))}
                    </td>
                    <td>{dateTimeFormat.format(new Date(node.updatedAt))}</td>
                    <td>
                      {node.status === "PUBLISHED" ? (
                        <CardStatusButton
                          action={retireCard}
                          label="使用不可にする"
                          id={node.id}
                          revision={node.revision}
                          name={node.name}
                        />
                      ) : (
                        <CardStatusButton
                          action={publishCard}
                          label="公開する"
                          id={node.id}
                          revision={node.revision}
                          name={node.name}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p>
            <Link href={pageURL(name, types, statuses)}>最初のページへ</Link>
            {cards.pageInfo.hasNextPage && cards.pageInfo.endCursor && (
              <>
                {" "}
                <Link
                  href={pageURL(
                    name,
                    types,
                    statuses,
                    cards.pageInfo.endCursor,
                  )}
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
