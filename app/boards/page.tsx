import Form from "next/form";
import Link from "next/link";
import { graphql } from "@/graphql";
import type {
  BoardsQuery,
  BoardsQueryVariables,
  CardStatus,
} from "@/graphql/graphql";
import { type CoreResult, callCore } from "@/lib/core";
import { dateTimeFormat } from "@/lib/format";
import { all, first } from "@/lib/search-params";
import { isStatus, STATUS_LABELS, STATUSES } from "@/lib/status";
import { RULE_LABELS, type RuleField } from "../messages";
import { ATTRIBUTE_LABELS, TILE_KIND_LABELS } from "./board-layout";

// 属性ごとの数の項目名（core の tileCounts）。0 の属性も出して、ボードどうしで並びをそろえる
const ATTRIBUTE_COUNTS = [
  ["FIRE", "fire"],
  ["EARTH", "earth"],
  ["WATER", "water"],
  ["WIND", "wind"],
  ["NEUTRAL", "neutral"],
  ["MULTI", "multi"],
] as const;

// 土地の後ろに並べる特殊なマスの数（道具の並びと同じ。0 も出す）
const SPECIAL_COUNTS = [
  ["WarpTile", "warp"],
  ["BridgeTile", "bridge"],
  ["SanctuaryTile", "sanctuary"],
  ["ShrineTile", "shrine"],
  ["ProphecyShopTile", "prophecyShop"],
  ["CardShopTile", "cardShop"],
] as const;

const boardsQuery = graphql(`
  query Boards($filter: BoardFilter, $after: String) {
    boards(filter: $filter, after: $after) {
      __typename
      ... on BoardsConnection {
        edges {
          node {
            id
            name
            status
            width
            height
            tileCounts {
              land
              base
              checkpoint
              fire
              earth
              water
              wind
              neutral
              multi
              warp
              bridge
              sanctuary
              shrine
              prophecyShop
              cardShop
            }
            defaultRules {
              targetMagic
              startingMagic
              lapBonus
              checkpointBonus
              roundLimit
              diceMin
              diceMax
            }
            publishProblems {
              __typename
            }
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
  return query === "" ? "/boards" : `/boards?${query}`;
}

export default async function BoardsPage({
  searchParams,
}: PageProps<"/boards">) {
  const params = await searchParams;
  const name = first(params.name) ?? "";
  // 形だけを確かめる（知らない値を core に渡すと GraphQL の誤りになり、想定外として扱われるため）
  const statuses = all(params.status).filter(isStatus);
  const after = first(params.after);

  const variables: BoardsQueryVariables = {
    filter: {
      // 空の入力欄は「絞り込まない」。空白だけは core が入力の誤りにする
      ...(name !== "" && { nameContains: name }),
      // 1 つも選ばなければすべての状態（core は空のリストを入力の誤りにするため送らない）
      ...(statuses.length > 0 && { statuses }),
    },
    after,
  };
  const result = await callCore(boardsQuery, variables);

  return (
    <main>
      <h1>ボードの一覧</h1>
      <p>
        <Link href="/boards/new">ボードを登録</Link>
      </p>
      <Form action="/boards">
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
      <BoardsResult result={result} name={name} statuses={statuses} />
    </main>
  );
}

function BoardsResult({
  result,
  name,
  statuses,
}: {
  result: CoreResult<BoardsQuery>;
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
  const boards = result.data.boards;
  switch (boards.__typename) {
    case "ForbiddenError":
      return <p role="alert">この操作をする権限がありません</p>;
    case "ValidationErrors":
      return (
        <p role="alert">
          条件が正しくありません。 <Link href="/boards">最初のページへ</Link>
        </p>
      );
    case "BoardsConnection":
      return (
        <>
          {boards.edges.length === 0 ? (
            <p>ボードがありません</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>名前</th>
                  <th>状態</th>
                  <th>大きさ</th>
                  <th>マスの数</th>
                  <th>登録日時</th>
                  <th>更新日時</th>
                </tr>
              </thead>
              {/* 1 つのボードを 2 行（マスの数までの段と、既定のルールの段）にし、ボードごとに tbody でまとめる */}
              {boards.edges.map(({ node }) => (
                <tbody key={node.id}>
                  <tr>
                    <td>
                      <Link href={`/boards/${node.id}`}>{node.name}</Link>
                    </td>
                    <td>{STATUS_LABELS[node.status]}</td>
                    <td>
                      {node.width}×{node.height}
                    </td>
                    <td>
                      拠点 {node.tileCounts.base}・チェックポイント{" "}
                      {node.tileCounts.checkpoint}・土地 {node.tileCounts.land}
                      （
                      {ATTRIBUTE_COUNTS.map(
                        ([attribute, key]) =>
                          `${ATTRIBUTE_LABELS[attribute]} ${node.tileCounts[key]}`,
                      ).join("・")}
                      ）
                      {SPECIAL_COUNTS.map(
                        ([kind, key]) =>
                          `・${TILE_KIND_LABELS[kind]} ${node.tileCounts[key]}`,
                      ).join("")}
                    </td>
                    <td>
                      {dateTimeFormat.format(new Date(node.registeredAt))}
                    </td>
                    <td>{dateTimeFormat.format(new Date(node.updatedAt))}</td>
                  </tr>
                  <tr>
                    <td colSpan={6}>
                      既定のルール:{" "}
                      {(Object.keys(RULE_LABELS) as RuleField[])
                        .map(
                          (field) =>
                            `${RULE_LABELS[field]} ${node.defaultRules[field]}`,
                        )
                        .join("・")}
                      {/* 公開できるかは準備中のボードだけに出す（公開中・使用不可には要らない） */}
                      {node.status === "DRAFT" &&
                        ` ／ ${
                          node.publishProblems.length === 0
                            ? "公開できます"
                            : `公開できない理由 ${node.publishProblems.length} 件`
                        }`}
                    </td>
                  </tr>
                </tbody>
              ))}
            </table>
          )}
          <p>
            <Link href={pageURL(name, statuses)}>最初のページへ</Link>
            {boards.pageInfo.hasNextPage && boards.pageInfo.endCursor && (
              <>
                {" "}
                <Link href={pageURL(name, statuses, boards.pageInfo.endCursor)}>
                  次へ
                </Link>
              </>
            )}
          </p>
        </>
      );
  }
}
