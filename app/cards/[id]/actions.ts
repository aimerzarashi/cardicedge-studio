"use server";

import { refresh } from "next/cache";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";
import { isCreatureElement } from "@/lib/creature-element";
import { isRarity } from "@/lib/rarity";
import { type Notice, target } from "../../deck-form";
import {
  CARD_NOT_DRAFT,
  CORE_UNAVAILABLE,
  costErrorMessage,
  elementsErrorMessage,
  FORBIDDEN,
  INVALID_TARGET,
  NOT_REFLECTED,
  REVISION_CONFLICT,
  statsErrorMessage,
} from "../../messages";
import { waitCard } from "../wait-card";
import type { ElementsState, SpecState, StatsState } from "./spec-form";

const changeCardCostMutation = graphql(`
  mutation ChangeCardCost($input: ChangeCardCostInput!) {
    changeCardCost(input: $input) {
      __typename
      ... on ChangeCardCostSuccess {
        id
        revision
      }
      ... on ValidationErrors {
        errors {
          __typename
          field
          ... on FieldTooSmall {
            min
          }
        }
      }
    }
  }
`);

const changeCardRarityMutation = graphql(`
  mutation ChangeCardRarity($input: ChangeCardRarityInput!) {
    changeCardRarity(input: $input) {
      __typename
      ... on ChangeCardRaritySuccess {
        id
        revision
      }
    }
  }
`);

const changeCreatureElementsMutation = graphql(`
  mutation ChangeCreatureElements($input: ChangeCreatureElementsInput!) {
    changeCreatureElements(input: $input) {
      __typename
      ... on ChangeCreatureElementsSuccess {
        id
        revision
      }
      ... on ValidationErrors {
        errors {
          __typename
          field
        }
      }
    }
  }
`);

const changeCreatureStatsMutation = graphql(`
  mutation ChangeCreatureStats($input: ChangeCreatureStatsInput!) {
    changeCreatureStats(input: $input) {
      __typename
      ... on ChangeCreatureStatsSuccess {
        id
        revision
      }
      ... on ValidationErrors {
        errors {
          __typename
          field
          ... on FieldTooSmall {
            min
          }
        }
      }
    }
  }
`);

// 操作の後は、結果の revision が詳細に届くのを待ってから画面を読み直す（投影の遅れで古い値を出さないため）
async function showChanged(id: string, revision: number): Promise<Notice> {
  const reached = await waitCard(id, revision);
  refresh();
  return reached === "reached"
    ? { status: "保存しました" }
    : { status: NOT_REFLECTED };
}

// 性能の変更で共通のエラー。成功・入力の誤りは呼ぶ側が扱う
function failed(typename: string): Notice {
  switch (typename) {
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "CardNotDraftError":
      refresh();
      return { error: CARD_NOT_DRAFT };
    case "CardNotFoundError":
      refresh();
      return { error: "このカードは見つかりません" };
    case "ForbiddenError":
      return { error: FORBIDDEN };
    default:
      return { error: CORE_UNAVAILABLE };
  }
}

export async function changeCardCost(
  _previous: SpecState,
  form: FormData,
): Promise<SpecState> {
  const card = target(form);
  if (card === undefined) {
    return { error: INVALID_TARGET };
  }
  const value = String(form.get("cost") ?? "");
  // 数でない入力は core に送れない（GraphQL の Int の誤りになる）ので、ここで止める。範囲は core が決める
  const cost = Number(value);
  if (value.trim() === "" || !Number.isInteger(cost)) {
    return {
      revision: card.revision,
      value,
      fieldError: "コストは整数で入力してください",
    };
  }

  const result = await callCore(changeCardCostMutation, {
    input: { id: card.id, revision: card.revision, cost },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }
  const changed = result.data.changeCardCost;
  switch (changed.__typename) {
    case "ChangeCardCostSuccess":
      return showChanged(card.id, changed.revision);
    case "ValidationErrors":
      return {
        revision: card.revision,
        value,
        fieldError: costErrorMessage(changed.errors[0]),
      };
    default:
      return failed(changed.__typename);
  }
}

export async function changeCardRarity(
  _previous: SpecState,
  form: FormData,
): Promise<SpecState> {
  const card = target(form);
  const rarity = String(form.get("rarity") ?? "");
  if (card === undefined || !isRarity(rarity)) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(changeCardRarityMutation, {
    input: { id: card.id, revision: card.revision, rarity },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }
  const changed = result.data.changeCardRarity;
  switch (changed.__typename) {
    case "ChangeCardRaritySuccess":
      return showChanged(card.id, changed.revision);
    default:
      return failed(changed.__typename);
  }
}

export async function changeCreatureElements(
  _previous: ElementsState,
  form: FormData,
): Promise<ElementsState> {
  const card = target(form);
  const values = form.getAll("elements").map(String);
  // 知らない値は改ざんされた送信なので送らない。選び方（空・無との組み合わせ）の正誤は core が決める
  const elements = values.filter(isCreatureElement);
  if (card === undefined || elements.length !== values.length) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(changeCreatureElementsMutation, {
    input: { id: card.id, revision: card.revision, elements },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }
  const changed = result.data.changeCreatureElements;
  switch (changed.__typename) {
    case "ChangeCreatureElementsSuccess":
      return showChanged(card.id, changed.revision);
    case "ValidationErrors":
      return {
        revision: card.revision,
        elements: values,
        fieldError: elementsErrorMessage(changed.errors[0]),
      };
    default:
      return failed(changed.__typename);
  }
}

// 整数でない入力は core に送れない（GraphQL の Int の誤りになる）ので、ここで止める。範囲は core が決める
function integerOf(value: string): number | undefined {
  const number = Number(value);
  return value.trim() === "" || !Number.isInteger(number) ? undefined : number;
}

export async function changeCreatureStats(
  _previous: StatsState,
  form: FormData,
): Promise<StatsState> {
  const card = target(form);
  if (card === undefined) {
    return { error: INVALID_TARGET };
  }
  const attackValue = String(form.get("attack") ?? "");
  const hitPointsValue = String(form.get("hitPoints") ?? "");
  const attack = integerOf(attackValue);
  const hitPoints = integerOf(hitPointsValue);
  const kept = {
    revision: card.revision,
    attack: attackValue,
    hitPoints: hitPointsValue,
  };
  if (attack === undefined || hitPoints === undefined) {
    return {
      ...kept,
      attackError:
        attack === undefined ? "ATは整数で入力してください" : undefined,
      hitPointsError:
        hitPoints === undefined ? "HPは整数で入力してください" : undefined,
    };
  }

  const result = await callCore(changeCreatureStatsMutation, {
    input: { id: card.id, revision: card.revision, attack, hitPoints },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }
  const changed = result.data.changeCreatureStats;
  switch (changed.__typename) {
    case "ChangeCreatureStatsSuccess":
      return showChanged(card.id, changed.revision);
    case "ValidationErrors": {
      const attackError = changed.errors.find((e) => e.field === "attack");
      const hitPointsError = changed.errors.find(
        (e) => e.field === "hitPoints",
      );
      return {
        ...kept,
        attackError: attackError && statsErrorMessage(attackError),
        hitPointsError: hitPointsError && statsErrorMessage(hitPointsError),
      };
    }
    default:
      return failed(changed.__typename);
  }
}
