import type { Page } from "@playwright/test";
import {
  npcMindsetRevisionQuery,
  publishNpcMindsetMutation,
  registerNpcMindsetMutation,
} from "@/app/npc-mindsets/operations";
import { callCore, expectSuccess, untilReached } from "./core";

// 確かめたいことの前準備として NPC の思考パターンを入れる道具。画面で登録する流れは npc-mindsets.spec.ts で確かめている。
// ログインしてから呼ぶ。投影に届くまで待つため、返した URL をすぐ開ける
async function untilNpcMindsetReached(
  page: Page,
  id: string,
  revision: number,
) {
  await untilReached(`NPC の思考パターン ${id} が詳細に届く`, async () => {
    const data = await callCore(page, npcMindsetRevisionQuery, { id });
    return (
      data.npcMindset.__typename === "NpcMindset" &&
      data.npcMindset.revision >= revision
    );
  });
}

// NPC の思考パターン（準備中）を登録して、詳細の URL（パス）を返す
export async function createNpcMindset(
  page: Page,
  name: string,
): Promise<string> {
  const data = await callCore(page, registerNpcMindsetMutation, {
    input: { name },
  });
  expectSuccess(data.registerNpcMindset, "RegisterNpcMindsetSuccess");
  const { id, revision } = data.registerNpcMindset;
  await untilNpcMindsetReached(page, id, revision);
  return `/npc-mindsets/${id}`;
}

// 公開中の NPC の思考パターンを入れ、公開用の ID を返す。NPC のアバターに割り当てる前準備に使う
export async function createPublishedNpcMindset(
  page: Page,
  name: string,
): Promise<string> {
  const id = (await createNpcMindset(page, name)).replace("/npc-mindsets/", "");
  const detail = await callCore(page, npcMindsetRevisionQuery, { id });
  expectSuccess(detail.npcMindset, "NpcMindset");
  const data = await callCore(page, publishNpcMindsetMutation, {
    input: { id, revision: detail.npcMindset.revision },
  });
  expectSuccess(data.publishNpcMindset, "PublishNpcMindsetSuccess");
  await untilNpcMindsetReached(page, id, data.publishNpcMindset.revision);
  return id;
}
