import Form from "next/form";
import Link from "next/link";
import { graphql } from "@/graphql";
import type {
  CardStatus,
  NpcAvatarsQuery,
  NpcAvatarsQueryVariables,
} from "@/graphql/graphql";
import { type CoreResult, callCore } from "@/lib/core";
import { dateTimeFormat } from "@/lib/format";
import { all, first } from "@/lib/search-params";
import { isStatus, STATUS_LABELS, STATUSES } from "@/lib/status";

const npcAvatarsQuery = graphql(`
  query NpcAvatars($filter: NpcAvatarFilter, $after: String) {
    npcAvatars(filter: $filter, after: $after) {
      __typename
      ... on NpcAvatarConnection {
        edges {
          node {
            id
            name
            status
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
function pageURL(name: string, statuses: CardStatus[], after?: string): string {
  const params = new URLSearchParams();
  if (name !== "") {
    params.set("name", name);
  }
  for (const status of statuses) {
    params.append("status", status);
  }
  if (after !== undefined) {
    params.set("after", after);
  }
  const query = params.toString();
  return query === "" ? "/npc-avatars" : `/npc-avatars?${query}`;
}

export default async function NpcAvatarsPage({
  searchParams,
}: PageProps<"/npc-avatars">) {
  const params = await searchParams;
  const name = first(params.name) ?? "";
  // 形だけを確かめる（知らない値を core に渡すと GraphQL の誤りになり、想定外として扱われるため）
  const statuses = all(params.status).filter(isStatus);
  const after = first(params.after);

  const variables: NpcAvatarsQueryVariables = {
    filter: {
      // 空の入力欄は「絞り込まない」。空白だけは core が入力の誤りにする
      ...(name !== "" && { nameContains: name }),
      // 1 つも選ばなければすべての状態（core は空のリストを入力の誤りにするため送らない）
      ...(statuses.length > 0 && { statuses }),
    },
    after,
  };
  const result = await callCore(npcAvatarsQuery, variables);

  return (
    <main>
      <h1>NPC のアバターの一覧</h1>
      <p>
        <Link href="/npc-avatars/new">NPC のアバターを登録</Link>
      </p>
      <Form action="/npc-avatars">
        <label>
          名前
          <input name="name" defaultValue={name} />
        </label>
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
      <NpcAvatarsResult result={result} name={name} statuses={statuses} />
    </main>
  );
}

function NpcAvatarsResult({
  result,
  name,
  statuses,
}: {
  result: CoreResult<NpcAvatarsQuery>;
  name: string;
  statuses: CardStatus[];
}) {
  if (!result.ok) {
    return (
      <p role="alert">
        core に接続できません。時間をおいて再読み込みしてください。{" "}
        <Link href={pageURL(name, statuses)}>再読み込み</Link>
      </p>
    );
  }
  const avatars = result.data.npcAvatars;
  switch (avatars.__typename) {
    case "ForbiddenError":
      return <p role="alert">この操作をする権限がありません</p>;
    case "ValidationErrors":
      return (
        <p role="alert">
          条件が正しくありません。{" "}
          <Link href="/npc-avatars">最初のページへ</Link>
        </p>
      );
    case "NpcAvatarConnection":
      return (
        <>
          {avatars.edges.length === 0 ? (
            <p>NPC のアバターがありません</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>名前</th>
                  <th>状態</th>
                  <th>登録日時</th>
                  <th>更新日時</th>
                </tr>
              </thead>
              <tbody>
                {avatars.edges.map(({ node }) => (
                  <tr key={node.id}>
                    <td>
                      <Link href={`/npc-avatars/${node.id}`}>{node.name}</Link>
                    </td>
                    <td>{STATUS_LABELS[node.status]}</td>
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
            <Link href={pageURL(name, statuses)}>最初のページへ</Link>
            {avatars.pageInfo.hasNextPage && avatars.pageInfo.endCursor && (
              <>
                {" "}
                <Link
                  href={pageURL(name, statuses, avatars.pageInfo.endCursor)}
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
