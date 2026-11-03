import Form from "next/form";
import Link from "next/link";
import { graphql } from "@/graphql";
import type {
  CopySourcePresetDecksQuery,
  CopySourcePresetDecksQueryVariables,
} from "@/graphql/graphql";
import { type CoreResult, callCore } from "@/lib/core";
import { first } from "@/lib/search-params";
import { CopyPresetDeckForm } from "../../copy-preset-deck-form";
import { registerGrantDeckFromPresetDeck } from "./actions";
import { RegisterGrantDeckForm } from "./register-grant-deck-form";

const copySourcePresetDecksQuery = graphql(`
  query CopySourcePresetDecks($filter: PresetDeckFilter, $after: String) {
    presetDecks(filter: $filter, after: $after) {
      __typename
      ... on PresetDeckConnection {
        edges {
          node {
            id
            name
            totalCount
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

// コピー元を探す条件は URL に持つ（再読み込み・共有で同じ画面に戻るため）
function pageURL(name: string, after?: string): string {
  const params = new URLSearchParams();
  if (name !== "") {
    params.set("name", name);
  }
  if (after !== undefined) {
    params.set("after", after);
  }
  const query = params.toString();
  return query === "" ? "/grant-decks/new" : `/grant-decks/new?${query}`;
}

export default async function NewGrantDeckPage({
  searchParams,
}: PageProps<"/grant-decks/new">) {
  const params = await searchParams;
  const name = first(params.name) ?? "";
  const after = first(params.after);

  const variables: CopySourcePresetDecksQueryVariables = {
    filter: {
      // 空の入力欄は「絞り込まない」。空白だけは core が入力の誤りにする
      ...(name !== "" && { nameContains: name }),
    },
    after,
  };
  const result = await callCore(copySourcePresetDecksQuery, variables);

  return (
    <main>
      <h1>配布デッキを登録</h1>
      <section aria-labelledby="empty-heading">
        <h2 id="empty-heading">空から作る</h2>
        <p>名前を決めて登録し、カードは登録した後の詳細の画面で入れます。</p>
        <RegisterGrantDeckForm />
      </section>
      <section aria-labelledby="copy-heading">
        <h2 id="copy-heading">プリセットデッキからコピーして作る</h2>
        <p>
          カード・枚数をコピーし、名前を決めて作ります。コピーした後に元を直しても変わりません。
        </p>
        <Form action="/grant-decks/new">
          <label>
            名前
            <input name="name" defaultValue={name} />
          </label>
          <button type="submit">絞り込む</button>
        </Form>
        <PresetDecks result={result} name={name} />
      </section>
      <p>
        <Link href="/grant-decks">配布デッキの一覧へ</Link>
      </p>
    </main>
  );
}

function PresetDecks({
  result,
  name,
}: {
  result: CoreResult<CopySourcePresetDecksQuery>;
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
          <Link href="/grant-decks/new">条件を外す</Link>
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
                  <th>操作</th>
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
                      <CopyPresetDeckForm
                        action={registerGrantDeckFromPresetDeck}
                        basePath="/grant-decks"
                        presetDeckId={node.id}
                        name={node.name}
                      />
                    </td>
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
