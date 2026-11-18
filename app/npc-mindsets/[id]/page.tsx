import Link from "next/link";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";
import { dateTimeFormat } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/status";
import { DeleteDeck } from "../../delete-deck";
import { RenameDeckForm } from "../../rename-deck-form";
import { StatusButton } from "../../status-button";
import {
  CRITERION_DESCRIPTIONS,
  CRITERION_LABELS,
  MATCH_ACTION_LABELS,
} from "../labels";
import { WeightsForm } from "../weights-form";
import {
  deleteNpcMindset,
  publishNpcMindset,
  renameNpcMindset,
  retireNpcMindset,
  setNpcMindsetActionWeights,
  setNpcMindsetCriterionWeights,
} from "./actions";

const npcMindsetQuery = graphql(`
  query NpcMindset($id: UUID!) {
    npcMindset(id: $id) {
      __typename
      ... on NpcMindset {
        id
        name
        status
        actionWeights {
          action
          weight
        }
        criterionWeights {
          criterion
          weight
        }
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
      <h1>NPC の思考パターン</h1>
      <p>
        <Link href="/npc-mindsets">NPC の思考パターンの一覧へ</Link>
      </p>
      <p role="alert">この NPC の思考パターンは見つかりません</p>
    </main>
  );
}

export default async function NpcMindsetPage({
  params,
}: PageProps<"/npc-mindsets/[id]">) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return <NotFound />;
  }

  const result = await callCore(npcMindsetQuery, { id });
  if (!result.ok) {
    return (
      <main>
        <h1>NPC の思考パターン</h1>
        <p role="alert">
          core に接続できません。時間をおいて再読み込みしてください。{" "}
          <Link href={`/npc-mindsets/${id}`}>再読み込み</Link>
        </p>
      </main>
    );
  }
  const mindset = result.data.npcMindset;
  switch (mindset.__typename) {
    case "ForbiddenError":
      return (
        <main>
          <h1>NPC の思考パターン</h1>
          <p role="alert">この操作をする権限がありません</p>
        </main>
      );
    case "NpcMindsetNotFoundError":
      return <NotFound />;
    case "NpcMindset":
      break;
  }

  // 並びは core が返した順（定義の順）のまま
  const actionRows = mindset.actionWeights.map(({ action, weight }) => ({
    key: action,
    label: MATCH_ACTION_LABELS[action],
    weight,
  }));
  const criterionRows = mindset.criterionWeights.map(
    ({ criterion, weight }) => ({
      key: criterion,
      label: CRITERION_LABELS[criterion],
      description: CRITERION_DESCRIPTIONS[criterion],
      weight,
    }),
  );
  const isDraft = mindset.status === "DRAFT";

  return (
    <main>
      <h1>{mindset.name}</h1>
      <p>
        <Link href="/npc-mindsets">NPC の思考パターンの一覧へ</Link>
      </p>
      <dl>
        <dt>状態</dt>
        <dd>{STATUS_LABELS[mindset.status]}</dd>
        <dt>登録日時</dt>
        <dd>{dateTimeFormat.format(new Date(mindset.registeredAt))}</dd>
        <dt>更新日時</dt>
        <dd>{dateTimeFormat.format(new Date(mindset.updatedAt))}</dd>
      </dl>

      <section aria-labelledby="status-heading">
        <h2 id="status-heading">公開</h2>
        {mindset.status === "PUBLISHED" ? (
          <StatusButton
            action={retireNpcMindset}
            label="使用不可にする"
            id={mindset.id}
            revision={mindset.revision}
          />
        ) : (
          <StatusButton
            action={publishNpcMindset}
            label="公開する"
            id={mindset.id}
            revision={mindset.revision}
          />
        )}
      </section>

      {isDraft && (
        <section aria-labelledby="rename-heading">
          <h2 id="rename-heading">名前の変更</h2>
          <RenameDeckForm
            action={renameNpcMindset}
            id={mindset.id}
            revision={mindset.revision}
            name={mindset.name}
          />
        </section>
      )}

      <section aria-labelledby="action-weights-heading">
        <h2 id="action-weights-heading">行動の種類ごとの重み</h2>
        <p>点を付けない段階（引く・捨てる・振る前・行き先）で使います。</p>
        {isDraft ? (
          <WeightsForm
            action={setNpcMindsetActionWeights}
            id={mindset.id}
            revision={mindset.revision}
            idPrefix="action-weight"
            rows={actionRows}
            submitLabel="行動の種類の重みを保存する"
          />
        ) : (
          <WeightTable rows={actionRows} />
        )}
      </section>

      <section aria-labelledby="criterion-weights-heading">
        <h2 id="criterion-weights-heading">採点基準ごとの重み</h2>
        {isDraft ? (
          <WeightsForm
            action={setNpcMindsetCriterionWeights}
            id={mindset.id}
            revision={mindset.revision}
            idPrefix="criterion-weight"
            rows={criterionRows}
            submitLabel="採点基準の重みを保存する"
          />
        ) : (
          <WeightTable rows={criterionRows} />
        )}
      </section>

      {isDraft ? (
        <section aria-labelledby="delete-heading">
          <h2 id="delete-heading">削除</h2>
          <DeleteDeck
            action={deleteNpcMindset}
            id={mindset.id}
            revision={mindset.revision}
            name={mindset.name}
          />
        </section>
      ) : (
        <p>公開中・使用不可の NPC の思考パターンは変えられません</p>
      )}
    </main>
  );
}

function WeightTable({
  rows,
}: {
  rows: { key: string; label: string; description?: string; weight: number }[];
}) {
  return (
    <table>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.label}</th>
            <td>{row.weight}</td>
            <td>{row.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
