import Link from "next/link";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";
import { dateTimeFormat } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/status";
import { DeleteDeck } from "../../delete-deck";
import { RenameDeckForm } from "../../rename-deck-form";
import { StatusButton } from "../../status-button";
import { BoardGrid } from "../board-grid";
import {
  changeBoardLayout,
  deleteBoard,
  publishBoard,
  renameBoard,
  retireBoard,
} from "./actions";
import { LayoutEditor } from "./layout-editor";

const boardQuery = graphql(`
  query Board($id: UUID!) {
    board(id: $id) {
      __typename
      ... on Board {
        id
        name
        status
        width
        height
        tiles {
          __typename
          x
          y
          ... on LandTile {
            attribute
          }
        }
        connections {
          a {
            x
            y
          }
          b {
            x
            y
          }
        }
        revision
        registeredAt
        updatedAt
      }
    }
    studioRules {
      __typename
      ... on StudioRules {
        board {
          minSize
          maxSize
        }
      }
    }
  }
`);

// 形の違う ID を core に渡すと GraphQL の誤りになり、想定外として扱われるため、形だけを確かめる
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function NotFound() {
  return (
    <main>
      <h1>ボード</h1>
      <p role="alert">このボードは見つかりません</p>
      <p>
        <Link href="/boards">ボードの一覧へ</Link>
      </p>
    </main>
  );
}

export default async function BoardPage({ params }: PageProps<"/boards/[id]">) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return <NotFound />;
  }

  const result = await callCore(boardQuery, { id });
  if (!result.ok) {
    return (
      <main>
        <h1>ボード</h1>
        <p role="alert">
          core に接続できません。時間をおいて再読み込みしてください。{" "}
          <Link href={`/boards/${id}`}>再読み込み</Link>
        </p>
      </main>
    );
  }
  const board = result.data.board;
  const rules = result.data.studioRules;
  switch (board.__typename) {
    case "ForbiddenError":
      return (
        <main>
          <h1>ボード</h1>
          <p role="alert">この操作をする権限がありません</p>
        </main>
      );
    case "BoardNotFoundError":
      return <NotFound />;
    case "Board":
      break;
  }
  if (rules.__typename === "ForbiddenError") {
    return (
      <main>
        <h1>ボード</h1>
        <p role="alert">この操作をする権限がありません</p>
      </main>
    );
  }

  return (
    <main>
      <h1>{board.name}</h1>
      <dl>
        <dt>状態</dt>
        <dd>{STATUS_LABELS[board.status]}</dd>
        <dt>大きさ</dt>
        <dd>
          {board.width}×{board.height}
        </dd>
        <dt>マス</dt>
        <dd>{board.tiles.length}</dd>
        <dt>つながり</dt>
        <dd>{board.connections.length}</dd>
        <dt>登録日時</dt>
        <dd>{dateTimeFormat.format(new Date(board.registeredAt))}</dd>
        <dt>更新日時</dt>
        <dd>{dateTimeFormat.format(new Date(board.updatedAt))}</dd>
      </dl>

      <section aria-labelledby="status-heading">
        <h2 id="status-heading">公開</h2>
        {board.status === "PUBLISHED" ? (
          <StatusButton
            action={retireBoard}
            label="使用不可にする"
            id={board.id}
            revision={board.revision}
          />
        ) : (
          <StatusButton
            action={publishBoard}
            label="公開する"
            id={board.id}
            revision={board.revision}
          />
        )}
      </section>

      <section aria-labelledby="layout-heading">
        <h2 id="layout-heading">レイアウト</h2>
        {board.status === "DRAFT" ? (
          <LayoutEditor
            action={changeBoardLayout}
            id={board.id}
            revision={board.revision}
            width={board.width}
            height={board.height}
            sizeRange={{
              min: rules.board.minSize,
              max: rules.board.maxSize,
            }}
            tiles={board.tiles}
            connections={board.connections}
          />
        ) : (
          <BoardGrid
            width={board.width}
            height={board.height}
            tiles={board.tiles}
            connections={board.connections}
          />
        )}
      </section>

      {board.status === "DRAFT" && (
        <>
          <section aria-labelledby="rename-heading">
            <h2 id="rename-heading">名前の変更</h2>
            <RenameDeckForm
              action={renameBoard}
              id={board.id}
              revision={board.revision}
              name={board.name}
            />
          </section>

          <section aria-labelledby="delete-heading">
            <h2 id="delete-heading">削除</h2>
            <DeleteDeck
              action={deleteBoard}
              id={board.id}
              revision={board.revision}
              name={board.name}
            />
          </section>
        </>
      )}

      <p>
        <Link href="/boards">ボードの一覧へ</Link>
      </p>
    </main>
  );
}
