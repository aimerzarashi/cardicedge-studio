import Form from "next/form";
import Link from "next/link";
import { graphql } from "@/graphql";
import type {
  PresetDecksQuery,
  PresetDecksQueryVariables,
} from "@/graphql/graphql";
import { type CoreResult, callCore } from "@/lib/core";
import { dateTimeFormat } from "@/lib/format";
import { first } from "@/lib/search-params";

const presetDecksQuery = graphql(`
  query PresetDecks($filter: PresetDeckFilter, $after: String) {
    presetDecks(filter: $filter, after: $after) {
      __typename
      ... on PresetDeckConnection {
        edges {
          node {
            id
            name
            totalCount
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
function pageURL(name: string, after?: string): string {
  const params = new URLSearchParams();
  if (name !== "") {
    params.set("name", name);
  }
  if (after !== undefined) {
    params.set("after", after);
  }
  const query = params.toString();
  return query === "" ? "/preset-decks" : `/preset-decks?${query}`;
}

export default async function PresetDecksPage({
  searchParams,
}: PageProps<"/preset-decks">) {
  const params = await searchParams;
  const name = first(params.name) ?? "";
  const after = first(params.after);

  const variables: PresetDecksQueryVariables = {
    filter: {
      // 空の入力欄は「絞り込まない」。空白だけは core が入力の誤りにする
      ...(name !== "" && { nameContains: name }),
    },
    after,
  };
  const result = await callCore(presetDecksQuery, variables);

  return (
    <main>
      <h1>プリセットデッキの一覧</h1>
      <p>
        <Link href="/preset-decks/new">プリセットデッキを登録</Link>
      </p>
      <Form action="/preset-decks">
        <label>
          名前
          <input name="name" defaultValue={name} />
        </label>
        <button type="submit">絞り込む</button>
      </Form>
      <PresetDecksResult result={result} name={name} />
    </main>
  );
}

function PresetDecksResult({
  result,
  name,
}: {
  result: CoreResult<PresetDecksQuery>;
  name: string;
}) {
  if (!result.ok) {
    return (
      <p role="alert">
        core に接続できません。時間をおいて再読み込みしてください。{" "}
        <Link href={pageURL(name)}>再読み込み</Link>
      </p>
    );
  }
  const decks = result.data.presetDecks;
  switch (decks.__typename) {
    case "ForbiddenError":
      return <p role="alert">この操作をする権限がありません</p>;
    case "ValidationErrors":
      return (
        <p role="alert">
          条件が正しくありません。{" "}
          <Link href="/preset-decks">最初のページへ</Link>
        </p>
      );
    case "PresetDeckConnection":
      return (
        <>
          {decks.edges.length === 0 ? (
            <p>プリセットデッキがありません</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>名前</th>
                  <th>合計の枚数</th>
                  <th>登録日時</th>
                  <th>更新日時</th>
                </tr>
              </thead>
              <tbody>
                {decks.edges.map(({ node }) => (
                  <tr key={node.id}>
                    <td>
                      <Link href={`/preset-decks/${node.id}`}>{node.name}</Link>
                    </td>
                    <td>{node.totalCount}</td>
                    <td>
                      {dateTimeFormat.format(new Date(node.registeredAt))}
                    </td>
                    <td>{dateTimeFormat.format(new Date(node.updatedAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p>
            <Link href={pageURL(name)}>最初のページへ</Link>
            {decks.pageInfo.hasNextPage && decks.pageInfo.endCursor && (
              <>
                {" "}
                <Link href={pageURL(name, decks.pageInfo.endCursor)}>次へ</Link>
              </>
            )}
          </p>
        </>
      );
  }
}
