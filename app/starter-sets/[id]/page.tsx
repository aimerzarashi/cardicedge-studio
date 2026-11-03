import Form from "next/form";
import Link from "next/link";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";
import { dateTimeFormat } from "@/lib/format";
import { first } from "@/lib/search-params";
import { STATUS_LABELS } from "@/lib/status";
import { DeleteDeck } from "../../delete-deck";
import { RenameDeckForm } from "../../rename-deck-form";
import { StatusButton } from "../../status-button";
import {
  deleteStarterSet,
  publishStarterSet,
  renameStarterSet,
  retireStarterSet,
  setStarterSetGrantDecks,
  setStarterSetUnlockBoards,
  setStarterSetUnlockNpcAvatars,
} from "./actions";
import { SetItemsButton } from "./set-items-button";

const starterSetQuery = graphql(`
  query StarterSet($id: UUID!) {
    starterSet(id: $id) {
      __typename
      ... on StarterSet {
        id
        name
        status
        revision
        registeredAt
        updatedAt
        grantDecks {
          id
          name
          status
        }
        unlockBoards {
          id
          name
          status
        }
        unlockNpcAvatars {
          id
          name
          status
        }
      }
    }
  }
`);

const candidateGrantDecksQuery = graphql(`
  query StarterSetCandidateGrantDecks($filter: GrantDeckFilter, $after: String) {
    grantDecks(filter: $filter, after: $after) {
      __typename
      ... on GrantDeckConnection {
        edges {
          node {
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

const candidateBoardsQuery = graphql(`
  query StarterSetCandidateBoards($filter: BoardFilter, $after: String) {
    boards(filter: $filter, after: $after) {
      __typename
      ... on BoardsConnection {
        edges {
          node {
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

const candidateNpcAvatarsQuery = graphql(`
  query StarterSetCandidateNpcAvatars($filter: NpcAvatarFilter, $after: String) {
    npcAvatars(filter: $filter, after: $after) {
      __typename
      ... on NpcAvatarConnection {
        edges {
          node {
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

// 3 つの探す欄は、検索語と続きのカーソルを欄ごとの名前で URL に持つ（再読み込み・共有で同じ画面に戻るため）。
// 欄ごとに別の条件を持つのは、1 つの画面で 3 種類を続けて割り当てられるようにするため
type Kind = "deck" | "board" | "npc";
type SearchState = Record<Kind, { name: string; after?: string }>;

function pageURL(id: string, search: SearchState): string {
  const params = new URLSearchParams();
  for (const kind of ["deck", "board", "npc"] as const) {
    if (search[kind].name !== "") {
      params.set(`${kind}Name`, search[kind].name);
    }
    if (search[kind].after !== undefined) {
      params.set(`${kind}After`, search[kind].after);
    }
  }
  const query = params.toString();
  return query === "" ? `/starter-sets/${id}` : `/starter-sets/${id}?${query}`;
}

// 探した結果。3 種類の一覧を同じ形にそろえて、同じ表で出す
type Candidates =
  | { kind: "failed"; message: string }
  | {
      kind: "found";
      items: { id: string; name: string }[];
      hasNextPage: boolean;
      endCursor: string | null | undefined;
    };

const CORE_UNREACHABLE =
  "core に接続できません。時間をおいて再読み込みしてください。";
const FORBIDDEN_MESSAGE = "この操作をする権限がありません";
const INVALID_CONDITION = "条件が正しくありません。";

function NotFound() {
  return (
    <main>
      <h1>スターターセット</h1>
      <p role="alert">このスターターセットは見つかりません</p>
      <p>
        <Link href="/starter-sets">スターターセットの一覧へ</Link>
      </p>
    </main>
  );
}

function filterOf(name: string) {
  return {
    // 空の入力欄は「絞り込まない」。空白だけは core が入力の誤りにする
    ...(name !== "" && { nameContains: name }),
    // 公開中でないものは割り当てられない（core が誤りにする）ため、選べるのは公開中だけ
    statuses: ["PUBLISHED" as const],
  };
}

export default async function StarterSetPage({
  params,
  searchParams,
}: PageProps<"/starter-sets/[id]">) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return <NotFound />;
  }
  const query = await searchParams;
  const search: SearchState = {
    deck: { name: first(query.deckName) ?? "", after: first(query.deckAfter) },
    board: {
      name: first(query.boardName) ?? "",
      after: first(query.boardAfter),
    },
    npc: { name: first(query.npcName) ?? "", after: first(query.npcAfter) },
  };

  const [result, decks, boards, npcs] = await Promise.all([
    callCore(starterSetQuery, { id }),
    callCore(candidateGrantDecksQuery, {
      filter: filterOf(search.deck.name),
      after: search.deck.after,
    }),
    callCore(candidateBoardsQuery, {
      filter: filterOf(search.board.name),
      after: search.board.after,
    }),
    callCore(candidateNpcAvatarsQuery, {
      filter: filterOf(search.npc.name),
      after: search.npc.after,
    }),
  ]);
  if (!result.ok) {
    return (
      <main>
        <h1>スターターセット</h1>
        <p role="alert">
          {CORE_UNREACHABLE} <Link href={pageURL(id, search)}>再読み込み</Link>
        </p>
      </main>
    );
  }
  const set = result.data.starterSet;
  switch (set.__typename) {
    case "ForbiddenError":
      return (
        <main>
          <h1>スターターセット</h1>
          <p role="alert">{FORBIDDEN_MESSAGE}</p>
        </main>
      );
    case "StarterSetNotFoundError":
      return <NotFound />;
    case "StarterSet":
      break;
  }

  const candidates: Record<Kind, Candidates> = {
    deck: !decks.ok
      ? { kind: "failed", message: CORE_UNREACHABLE }
      : decks.data.grantDecks.__typename === "GrantDeckConnection"
        ? connection(decks.data.grantDecks)
        : failed(decks.data.grantDecks.__typename),
    board: !boards.ok
      ? { kind: "failed", message: CORE_UNREACHABLE }
      : boards.data.boards.__typename === "BoardsConnection"
        ? connection(boards.data.boards)
        : failed(boards.data.boards.__typename),
    npc: !npcs.ok
      ? { kind: "failed", message: CORE_UNREACHABLE }
      : npcs.data.npcAvatars.__typename === "NpcAvatarConnection"
        ? connection(npcs.data.npcAvatars)
        : failed(npcs.data.npcAvatars.__typename),
  };
  const draft = set.status === "DRAFT";
  const base = { setId: set.id, revision: set.revision, draft, search };

  return (
    <main>
      <h1>{set.name}</h1>
      <dl>
        <dt>状態</dt>
        <dd>{STATUS_LABELS[set.status]}</dd>
        <dt>登録日時</dt>
        <dd>{dateTimeFormat.format(new Date(set.registeredAt))}</dd>
        <dt>更新日時</dt>
        <dd>{dateTimeFormat.format(new Date(set.updatedAt))}</dd>
      </dl>

      <section aria-labelledby="status-heading">
        <h2 id="status-heading">公開</h2>
        {set.status === "PUBLISHED" ? (
          <StatusButton
            action={retireStarterSet}
            label="使用不可にする"
            id={set.id}
            revision={set.revision}
          />
        ) : (
          <StatusButton
            action={publishStarterSet}
            label="公開する"
            id={set.id}
            revision={set.revision}
          />
        )}
      </section>

      {!draft && <p>公開中・使用不可のスターターセットは変えられません</p>}

      <ItemsSection
        {...base}
        heading="配るデッキ"
        what="デッキ"
        kind="deck"
        itemsBase="/grant-decks"
        field="grantDeckId"
        action={setStarterSetGrantDecks}
        assigned={set.grantDecks}
        candidates={candidates.deck}
      />
      <ItemsSection
        {...base}
        heading="解放するボード"
        what="ボード"
        kind="board"
        itemsBase="/boards"
        field="unlockBoardId"
        action={setStarterSetUnlockBoards}
        assigned={set.unlockBoards}
        candidates={candidates.board}
      />
      <ItemsSection
        {...base}
        heading="解放する NPC"
        what="NPC"
        kind="npc"
        itemsBase="/npc-avatars"
        field="unlockNpcAvatarId"
        action={setStarterSetUnlockNpcAvatars}
        assigned={set.unlockNpcAvatars}
        candidates={candidates.npc}
      />

      {draft && (
        <>
          <section aria-labelledby="rename-heading">
            <h2 id="rename-heading">名前の変更</h2>
            <RenameDeckForm
              action={renameStarterSet}
              id={set.id}
              revision={set.revision}
              name={set.name}
            />
          </section>

          <section aria-labelledby="delete-heading">
            <h2 id="delete-heading">削除</h2>
            <DeleteDeck
              action={deleteStarterSet}
              id={set.id}
              revision={set.revision}
              name={set.name}
            />
          </section>
        </>
      )}

      <p>
        <Link href="/starter-sets">スターターセットの一覧へ</Link>
      </p>
    </main>
  );
}

function connection(value: {
  edges: { node: { id: string; name: string } }[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
}): Candidates {
  return {
    kind: "found",
    items: value.edges.map(({ node }) => node),
    hasNextPage: value.pageInfo.hasNextPage,
    endCursor: value.pageInfo.endCursor,
  };
}

function failed(typename: string): Candidates {
  return {
    kind: "failed",
    message:
      typename === "ForbiddenError" ? FORBIDDEN_MESSAGE : INVALID_CONDITION,
  };
}

// 配るデッキ・解放するボード・解放する NPC は同じ形（割り当てた順の表と、準備中のときだけ公開中のものを探して割り当てる欄）
function ItemsSection({
  setId,
  revision,
  draft,
  search,
  heading,
  what,
  kind,
  itemsBase,
  field,
  action,
  assigned,
  candidates,
}: {
  setId: string;
  revision: number;
  draft: boolean;
  search: SearchState;
  heading: string;
  what: string;
  kind: Kind;
  itemsBase: string;
  field: string;
  action: (
    previous: { status?: string; error?: string },
    form: FormData,
  ) => Promise<{ status?: string; error?: string }>;
  assigned: { id: string; name: string; status: keyof typeof STATUS_LABELS }[];
  candidates: Candidates;
}) {
  // 「NPC を探す」のように、英字で終わる呼び方は日本語との間に空白を入れる（このプロジェクトの書き方）
  const label = /[A-Za-z]$/.test(what) ? `${what} ` : what;
  const headingId = `${kind}-heading`;
  const searchHeadingId = `${kind}-candidates-heading`;
  const assignedIds = assigned.map(({ id }) => id);
  const nameParam = `${kind}Name`;
  const own = search[kind];
  const here = (after?: string) =>
    pageURL(setId, { ...search, [kind]: { name: own.name, after } });

  return (
    <>
      <section aria-labelledby={headingId}>
        <h2 id={headingId}>{heading}</h2>
        {assigned.length === 0 ? (
          <p>{label}を割り当てていません</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>名前</th>
                <th>状態</th>
                {draft && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {assigned.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`${itemsBase}/${item.id}`}>{item.name}</Link>
                  </td>
                  <td>{STATUS_LABELS[item.status]}</td>
                  {draft && (
                    <td>
                      <SetItemsButton
                        action={action}
                        field={field}
                        id={setId}
                        revision={revision}
                        ids={assignedIds.filter((id) => id !== item.id)}
                        kind="unassign"
                        label="外す"
                        accessibleName={`${item.name}を外す`}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {draft && (
        <section aria-labelledby={searchHeadingId}>
          <h2 id={searchHeadingId}>{label}を探す</h2>
          <Form action={`/starter-sets/${setId}`}>
            {/* 探す欄は 3 つあるため、送る条件は欄ごとの名前にし、ほかの欄の条件は隠し項目で引き継ぐ */}
            {(["deck", "board", "npc"] as const)
              .filter((other) => other !== kind && search[other].name !== "")
              .map((other) => (
                <input
                  key={other}
                  type="hidden"
                  name={`${other}Name`}
                  value={search[other].name}
                />
              ))}
            <label>
              名前
              <input name={nameParam} defaultValue={own.name} />
            </label>
            <button type="submit">絞り込む</button>
          </Form>
          {candidates.kind === "failed" ? (
            <p role="alert">
              {candidates.message}{" "}
              <Link href={`/starter-sets/${setId}`}>条件を外す</Link>
            </p>
          ) : (
            <>
              {candidates.items.length === 0 ? (
                <p>公開中の{label}がありません</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>名前</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link href={`${itemsBase}/${item.id}`}>
                            {item.name}
                          </Link>
                        </td>
                        <td>
                          {assignedIds.includes(item.id) ? (
                            "割り当て済み"
                          ) : (
                            <SetItemsButton
                              action={action}
                              field={field}
                              id={setId}
                              revision={revision}
                              ids={[...assignedIds, item.id]}
                              kind="assign"
                              label="割り当てる"
                              accessibleName={`${item.name}を割り当てる`}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p>
                <Link href={here()}>最初のページへ</Link>
                {candidates.hasNextPage && candidates.endCursor && (
                  <>
                    {" "}
                    <Link href={here(candidates.endCursor)}>次へ</Link>
                  </>
                )}
              </p>
            </>
          )}
        </section>
      )}
    </>
  );
}
