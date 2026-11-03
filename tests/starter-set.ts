import type { Page } from "@playwright/test";
import {
  registerStarterSetMutation,
  starterSetRevisionQuery,
} from "@/app/starter-sets/operations";
import { callCore, expectSuccess, untilReached } from "./core";

// 確かめたいことの前準備としてスターターセットを入れる道具。画面で登録する流れは starter-sets.spec.ts で確かめている。
// ログインしてから呼ぶ。投影に届くまで待つため、返した URL をすぐ開ける

// スターターセット（準備中）を登録して、詳細の URL（パス）を返す
export async function createStarterSet(
  page: Page,
  name: string,
): Promise<string> {
  const data = await callCore(page, registerStarterSetMutation, {
    input: { name },
  });
  expectSuccess(data.registerStarterSet, "RegisterStarterSetSuccess");
  const { id, revision } = data.registerStarterSet;
  await untilReached(`スターターセット ${id} が詳細に届く`, async () => {
    const reached = await callCore(page, starterSetRevisionQuery, { id });
    return (
      reached.starterSet.__typename === "StarterSet" &&
      reached.starterSet.revision >= revision
    );
  });
  return `/starter-sets/${id}`;
}
