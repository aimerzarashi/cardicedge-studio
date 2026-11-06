import Form from "next/form";
import Link from "next/link";
import { graphql } from "@/graphql";
import type {
  NpcAvatarCandidateDecksQuery,
  NpcAvatarCandidateDecksQueryVariables,
} from "@/graphql/graphql";
import { type CoreResult, callCore } from "@/lib/core";
import { dateTimeFormat } from "@/lib/format";
import { first } from "@/lib/search-params";
import { STATUS_LABELS } from "@/lib/status";
import { DeleteDeck } from "../../delete-deck";
import { RenameDeckForm } from "../../rename-deck-form";
import { StatusButton } from "../../status-button";
import {
  deleteNpcAvatar,
  publishNpcAvatar,
  renameNpcAvatar,
  retireNpcAvatar,
} from "./actions";
import { SetDecksButton } from "./set-decks-button";

const npcAvatarQuery = graphql(`
  query NpcAvatar($id: UUID!) {
    npcAvatar(id: $id) {
      __typename
      ... on NpcAvatar {
        id
        name
        status
        revision
        registeredAt
        updatedAt
        decks {
          id
          name
          status
        }
      }
    }
  }
`);

const npcAvatarCandidateDecksQuery = graphql(`
  query NpcAvatarCandidateDecks($filter: NpcDeckFilter, $after: String) {
    npcDecks(filter: $filter, after: $after) {
      __typename
      ... on NpcDeckConnection {
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

// デッキを探す条件は URL に持つ（再読み込み・共有で同じ画面に戻るため）
function pageURL(id: string, name: string, after?: string): string {
  const params = new URLSearchParams();
  if (name !== "") {
    params.set("name", name);
  }
  if (after !== undefined) {
    params.set("after", after);
  }
  const query = params.toString();
  return query === "" ? `/npc-avatars/${id}` : `/npc-avatars/${id}?${query}`;
}

function NotFound() {
  return (
    <main>
      <h1>NPC のアバター</h1>
      <p>
        <Link href="/npc-avatars">NPC のアバターの一覧へ</Link>
      </p>
      <p role="alert">この NPC のアバターは見つかりません</p>
    </main>
  );
}

export default async function NpcAvatarPage({
  params,
  searchParams,
}: PageProps<"/npc-avatars/[id]">) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return <NotFound />;
  }
  const search = await searchParams;
  const name = first(search.name) ?? "";
  const after = first(search.after);

  const variables: NpcAvatarCandidateDecksQueryVariables = {
    filter: {
      // 空の入力欄は「絞り込まない」。空白だけは core が入力の誤りにする
      ...(name !== "" && { nameContains: name }),
      // 公開中でないデッキは割り当てられない（core が誤りにする）ため、選べるのは公開中だけ
      statuses: ["PUBLISHED"],
    },
    after,
  };
  const [result, candidates] = await Promise.all([
    callCore(npcAvatarQuery, { id }),
    callCore(npcAvatarCandidateDecksQuery, variables),
  ]);
  if (!result.ok) {
    return (
      <main>
        <h1>NPC のアバター</h1>
        <p role="alert">
          core に接続できません。時間をおいて再読み込みしてください。{" "}
          <Link href={pageURL(id, name, after)}>再読み込み</Link>
        </p>
      </main>
    );
  }
  const avatar = result.data.npcAvatar;
  switch (avatar.__typename) {
    case "ForbiddenError":
      return (
        <main>
          <h1>NPC のアバター</h1>
          <p role="alert">この操作をする権限がありません</p>
        </main>
      );
    case "NpcAvatarNotFoundError":
      return <NotFound />;
    case "NpcAvatar":
      break;
  }

  return (
    <main>
      <h1>{avatar.name}</h1>
      <p>
        <Link href="/npc-avatars">NPC のアバターの一覧へ</Link>
      </p>
      <dl>
        <dt>状態</dt>
        <dd>{STATUS_LABELS[avatar.status]}</dd>
        <dt>登録日時</dt>
        <dd>{dateTimeFormat.format(new Date(avatar.registeredAt))}</dd>
        <dt>更新日時</dt>
        <dd>{dateTimeFormat.format(new Date(avatar.updatedAt))}</dd>
      </dl>

      <section aria-labelledby="status-heading">
        <h2 id="status-heading">公開</h2>
        {avatar.status === "PUBLISHED" ? (
          <StatusButton
            action={retireNpcAvatar}
            label="使用不可にする"
            id={avatar.id}
            revision={avatar.revision}
          />
        ) : (
          <StatusButton
            action={publishNpcAvatar}
            label="公開する"
            id={avatar.id}
            revision={avatar.revision}
          />
        )}
      </section>

      <section aria-labelledby="decks-heading">
        <h2 id="decks-heading">使うデッキ</h2>
        {avatar.status !== "DRAFT" && (
          <p>公開中・使用不可の NPC のアバターは変えられません</p>
        )}
        {avatar.decks.length === 0 ? (
          <p>
            デッキを割り当てていません。
            {avatar.status === "DRAFT" &&
              "下の「デッキを探す」から、公開中の NPC のデッキを割り当ててください"}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>名前</th>
                <th>状態</th>
                {avatar.status === "DRAFT" && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {avatar.decks.map((deck) => (
                <tr key={deck.id}>
                  <td>
                    <Link href={`/npc-decks/${deck.id}`}>{deck.name}</Link>
                  </td>
                  <td>{STATUS_LABELS[deck.status]}</td>
                  {avatar.status === "DRAFT" && (
                    <td>
                      <SetDecksButton
                        id={avatar.id}
                        revision={avatar.revision}
                        deckIds={avatar.decks
                          .map(({ id }) => id)
                          .filter((deckId) => deckId !== deck.id)}
                        kind="unassign"
                        label="外す"
                        accessibleName={`${deck.name}を外す`}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {avatar.status === "DRAFT" && (
        <>
          <section aria-labelledby="candidates-heading">
            <h2 id="candidates-heading">デッキを探す</h2>
            <Form action={`/npc-avatars/${avatar.id}`}>
              <label>
                名前
                <input name="name" defaultValue={name} />
              </label>
              <button type="submit">絞り込む</button>
            </Form>
            <Candidates
              result={candidates}
              avatarId={avatar.id}
              revision={avatar.revision}
              assigned={avatar.decks.map(({ id }) => id)}
              name={name}
            />
          </section>

          <section aria-labelledby="rename-heading">
            <h2 id="rename-heading">名前の変更</h2>
            <RenameDeckForm
              action={renameNpcAvatar}
              id={avatar.id}
              revision={avatar.revision}
              name={avatar.name}
            />
          </section>

          <section aria-labelledby="delete-heading">
            <h2 id="delete-heading">削除</h2>
            <DeleteDeck
              action={deleteNpcAvatar}
              id={avatar.id}
              revision={avatar.revision}
              name={avatar.name}
            />
          </section>
        </>
      )}
    </main>
  );
}

function Candidates({
  result,
  avatarId,
  revision,
  assigned,
  name,
}: {
  result: CoreResult<NpcAvatarCandidateDecksQuery>;
  avatarId: string;
  revision: number;
  assigned: string[];
  name: string;
}) {
  if (!result.ok) {
    return (
      <p role="alert">
        core に接続できません。時間をおいて再読み込みしてください。{" "}
        <Link href={pageURL(avatarId, name)}>再読み込み</Link>
      </p>
    );
  }
  const decks = result.data.npcDecks;
  switch (decks.__typename) {
    case "ForbiddenError":
      return <p role="alert">この操作をする権限がありません</p>;
    case "ValidationErrors":
      return (
        <p role="alert">
          条件が正しくありません。{" "}
          <Link href={`/npc-avatars/${avatarId}`}>条件を外す</Link>
        </p>
      );
    case "NpcDeckConnection":
      return (
        <>
          {decks.edges.length === 0 ? (
            <p>公開中の NPC のデッキがありません</p>
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
                      <Link href={`/npc-decks/${node.id}`}>{node.name}</Link>
                    </td>
                    <td>{node.totalCount}</td>
                    <td>
                      {assigned.includes(node.id) ? (
                        "割り当て済み"
                      ) : (
                        <SetDecksButton
                          id={avatarId}
                          revision={revision}
                          deckIds={[...assigned, node.id]}
                          kind="assign"
                          label="割り当てる"
                          accessibleName={`${node.name}を割り当てる`}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p>
            <Link href={pageURL(avatarId, name)}>最初のページへ</Link>
            {decks.pageInfo.hasNextPage && decks.pageInfo.endCursor && (
              <>
                {" "}
                <Link href={pageURL(avatarId, name, decks.pageInfo.endCursor)}>
                  次へ
                </Link>
              </>
            )}
          </p>
        </>
      );
  }
}
