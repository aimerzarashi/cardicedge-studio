import Link from "next/link";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";
import { dateTimeFormat } from "@/lib/format";
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
      <h1>NPC のアバター</h1>
      <p role="alert">この NPC のアバターは見つかりません</p>
      <p>
        <Link href="/npc-avatars">NPC のアバターの一覧へ</Link>
      </p>
    </main>
  );
}

export default async function NpcAvatarPage({
  params,
}: PageProps<"/npc-avatars/[id]">) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return <NotFound />;
  }

  const result = await callCore(npcAvatarQuery, { id });
  if (!result.ok) {
    return (
      <main>
        <h1>NPC のアバター</h1>
        <p role="alert">
          core に接続できません。時間をおいて再読み込みしてください。{" "}
          <Link href={`/npc-avatars/${id}`}>再読み込み</Link>
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

      {avatar.status === "DRAFT" && (
        <>
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

      <p>
        <Link href="/npc-avatars">NPC のアバターの一覧へ</Link>
      </p>
    </main>
  );
}
