import Form from "next/form";
import Link from "next/link";
import { graphql } from "@/graphql";
import type {
  StarterDeckSetCandidatesQuery,
  StarterDeckSetCandidatesQueryVariables,
} from "@/graphql/graphql";
import { type CoreResult, callCore } from "@/lib/core";
import { all, first } from "@/lib/search-params";
import { editURL } from "../edit-url";
import {
  type SelectedDeck,
  SetStarterDeckSetForm,
} from "./set-starter-deck-set-form";

const starterDeckSetRevisionQuery = graphql(`
  query StarterDeckSetForEdit {
    starterDeckSet {
      __typename
      ... on StarterDeckSet {
        revision
      }
    }
  }
`);

// 選んだものは、写しではなく元のプリセットデッキの今の状態を出す（設定すると今の状態から写し直すため、合計が 40 枚かを見て選べるように）
const selectedPresetDeckQuery = graphql(`
  query SelectedPresetDeck($id: UUID!) {
    presetDeck(id: $id) {
      __typename
      ... on PresetDeck {
        name
        totalCount
      }
    }
  }
`);

const starterDeckSetCandidatesQuery = graphql(`
  query StarterDeckSetCandidates($filter: PresetDeckFilter, $after: String) {
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

// 形の違う ID を core に渡すと GraphQL の誤りになり、想定外として扱われるため、形だけを確かめる
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditStarterDeckSetPage({
  searchParams,
}: PageProps<"/starter-deck-set/edit">) {
  const params = await searchParams;
  const selected = all(params.selected).filter((id) => UUID_PATTERN.test(id));
  const name = first(params.name) ?? "";
  const after = first(params.after);

  const variables: StarterDeckSetCandidatesQueryVariables = {
    filter: {
      // 空の入力欄は「絞り込まない」。空白だけは core が入力の誤りにする
      ...(name !== "" && { nameContains: name }),
    },
    after,
  };
  const [setResult, candidates, ...selectedResults] = await Promise.all([
    callCore(starterDeckSetRevisionQuery),
    callCore(starterDeckSetCandidatesQuery, variables),
    ...selected.map((id) => callCore(selectedPresetDeckQuery, { id })),
  ]);

  if (!setResult.ok || selectedResults.some((result) => !result.ok)) {
    return (
      <main>
        <h1>スターターデッキの変更</h1>
        <p role="alert">
          core に接続できません。時間をおいて再読み込みしてください。{" "}
          <Link href={editURL({ selected, name, after })}>再読み込み</Link>
        </p>
      </main>
    );
  }
  const set = setResult.data.starterDeckSet;
  if (set.__typename === "ForbiddenError") {
    return (
      <main>
        <h1>スターターデッキの変更</h1>
        <p role="alert">この操作をする権限がありません</p>
      </main>
    );
  }

  const selectedDecks: SelectedDeck[] = selected.map((id, index) => {
    const result = selectedResults[index];
    const deck =
      result.ok && result.data.presetDeck.__typename === "PresetDeck"
        ? result.data.presetDeck
        : undefined;
    return {
      id,
      deck,
      removeHref: editURL({
        selected: selected.filter((_, i) => i !== index),
        name,
        after,
      }),
    };
  });

  return (
    <main>
      <h1>スターターデッキの変更</h1>
      <section aria-labelledby="selected-heading">
        <h2 id="selected-heading">選んだプリセットデッキ</h2>
        {/* 選んだものが変わったら作り直す（前に出した誤りが、位置のずれた別の行に残らないように） */}
        <SetStarterDeckSetForm
          key={selected.join(",")}
          revision={set.revision}
          selected={selectedDecks}
        />
      </section>
      <section aria-labelledby="candidates-heading">
        <h2 id="candidates-heading">プリセットデッキ</h2>
        <Form action="/starter-deck-set/edit">
          {selected.map((id) => (
            <input key={id} type="hidden" name="selected" value={id} />
          ))}
          <label>
            名前
            <input name="name" defaultValue={name} />
          </label>
          <button type="submit">絞り込む</button>
        </Form>
        <Candidates
          result={candidates}
          selected={selected}
          name={name}
          after={after}
        />
      </section>
      <p>
        <Link href="/starter-deck-set">スターターデッキへ</Link>
      </p>
    </main>
  );
}

function Candidates({
  result,
  selected,
  name,
  after,
}: {
  result: CoreResult<StarterDeckSetCandidatesQuery>;
  selected: string[];
  name: string;
  after?: string;
}) {
  if (!result.ok) {
    return (
      <p role="alert">
        core に接続できません。時間をおいて再読み込みしてください。
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
          <Link href={editURL({ selected })}>条件を外す</Link>
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
                      {selected.includes(node.id) ? (
                        "選択中"
                      ) : (
                        <Link
                          href={editURL({
                            selected: [...selected, node.id],
                            name,
                            after,
                          })}
                          aria-label={`${node.name}を選ぶ`}
                        >
                          選ぶ
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p>
            <Link href={editURL({ selected, name })}>最初のページへ</Link>
            {decks.pageInfo.hasNextPage && decks.pageInfo.endCursor && (
              <>
                {" "}
                <Link
                  href={editURL({
                    selected,
                    name,
                    after: decks.pageInfo.endCursor,
                  })}
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
