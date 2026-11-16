"use server";

import { refresh } from "next/cache";
import { graphql } from "@/graphql";
import type {
  EffectInput,
  EffectKind,
  SpellEffectInput,
} from "@/graphql/graphql";
import { callCore } from "@/lib/core";
import {
  isCreatureElement,
  isPlacementRestrictionElement,
} from "@/lib/creature-element";
import {
  EFFECT_CONSTRAINT_LABELS,
  EFFECT_CREATURE_ELEMENTS_LABELS,
  EFFECT_DESTRUCTION_LABELS,
  EFFECT_FIELDS,
  EFFECT_KINDS,
  isEffectDestruction,
  isEffectKind,
} from "@/lib/effect";
import { isItemCategory } from "@/lib/item-category";
import { isRarity } from "@/lib/rarity";
import { type Notice, target } from "../../deck-form";
import {
  CARD_NOT_DRAFT,
  CORE_UNAVAILABLE,
  CREATURE_ELEMENTS_INVALID,
  costErrorMessage,
  DESTRUCTIONS_INVALID,
  EFFECTS_CONFLICTED,
  effectFieldErrorMessage,
  elementsErrorMessage,
  FORBIDDEN,
  INVALID_TARGET,
  ITEM_EFFECT_NOT_ALLOWED,
  NOT_REFLECTED,
  OPPONENT_ELEMENTS_INVALID,
  REVISION_CONFLICT,
  SPELL_EFFECT_KINDS,
  statsErrorMessage,
} from "../../messages";
import { waitCard } from "../wait-card";
import type {
  EffectState,
  EffectsState,
  ElementsState,
  SpecState,
  StatsState,
} from "./spec-form";

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

const changeCreatureItemRestrictionsMutation = graphql(`
  mutation ChangeCreatureItemRestrictions(
    $input: ChangeCreatureItemRestrictionsInput!
  ) {
    changeCreatureItemRestrictions(input: $input) {
      __typename
      ... on ChangeCreatureItemRestrictionsSuccess {
        id
        revision
      }
    }
  }
`);

const changeCreaturePlacementRestrictionsMutation = graphql(`
  mutation ChangeCreaturePlacementRestrictions(
    $input: ChangeCreaturePlacementRestrictionsInput!
  ) {
    changeCreaturePlacementRestrictions(input: $input) {
      __typename
      ... on ChangeCreaturePlacementRestrictionsSuccess {
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

const changeCreatureEffectsMutation = graphql(`
  mutation ChangeCreatureEffects($input: ChangeCreatureEffectsInput!) {
    changeCreatureEffects(input: $input) {
      __typename
      ... on ChangeCreatureEffectsSuccess {
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

const changeItemCategoryMutation = graphql(`
  mutation ChangeItemCategory($input: ChangeItemCategoryInput!) {
    changeItemCategory(input: $input) {
      __typename
      ... on ChangeItemCategorySuccess {
        id
        revision
      }
    }
  }
`);

const changeItemEffectsMutation = graphql(`
  mutation ChangeItemEffects($input: ChangeItemEffectsInput!) {
    changeItemEffects(input: $input) {
      __typename
      ... on ChangeItemEffectsSuccess {
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

export async function changeCreatureItemRestrictions(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const card = target(form);
  const values = form.getAll("itemRestrictions").map(String);
  // 知らない値は改ざんされた送信なので送らない
  const itemRestrictions = values.filter(isItemCategory);
  if (card === undefined || itemRestrictions.length !== values.length) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(changeCreatureItemRestrictionsMutation, {
    input: { id: card.id, revision: card.revision, itemRestrictions },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }
  const changed = result.data.changeCreatureItemRestrictions;
  switch (changed.__typename) {
    case "ChangeCreatureItemRestrictionsSuccess":
      return showChanged(card.id, changed.revision);
    default:
      return failed(changed.__typename);
  }
}

export async function changeCreaturePlacementRestrictions(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const card = target(form);
  const values = form.getAll("placementRestrictions").map(String);
  // 知らない値は改ざんされた送信なので送らない
  const placementRestrictions = values.filter(isPlacementRestrictionElement);
  if (card === undefined || placementRestrictions.length !== values.length) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(changeCreaturePlacementRestrictionsMutation, {
    input: { id: card.id, revision: card.revision, placementRestrictions },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }
  const changed = result.data.changeCreaturePlacementRestrictions;
  switch (changed.__typename) {
    case "ChangeCreaturePlacementRestrictionsSuccess":
      return showChanged(card.id, changed.revision);
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

export async function changeCreatureEffects(
  _previous: EffectsState,
  form: FormData,
): Promise<EffectsState> {
  const card = target(form);
  const read = readEffects(form);
  if (card === undefined || read === undefined) {
    return { error: INVALID_TARGET };
  }
  const kept = { revision: card.revision, ...read.kept };
  if (read.fieldErrors !== undefined) {
    return { ...kept, fieldErrors: read.fieldErrors };
  }

  const result = await callCore(changeCreatureEffectsMutation, {
    input: { id: card.id, revision: card.revision, effects: read.effects },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }
  const changed = result.data.changeCreatureEffects;
  switch (changed.__typename) {
    case "ChangeCreatureEffectsSuccess":
      return showChanged(card.id, changed.revision);
    case "ValidationErrors":
      return { ...kept, ...effectsErrors(changed.errors, read.kinds) };
    default:
      return failed(changed.__typename);
  }
}

const changeSpellEffectMutation = graphql(`
  mutation ChangeSpellEffect($input: ChangeSpellEffectInput!) {
    changeSpellEffect(input: $input) {
      __typename
      ... on ChangeSpellEffectSuccess {
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

// 「なし」は効果なし（null）を送り、値は読まない。ほかは選んだ種類の入力の項目に値を入れる
export async function changeSpellEffect(
  _previous: EffectState,
  form: FormData,
): Promise<EffectState> {
  const card = target(form);
  const kind = String(form.get("kind") ?? "");
  const entry = SPELL_EFFECT_KINDS.find((candidate) => candidate.kind === kind);
  if (card === undefined || (kind !== "none" && entry === undefined)) {
    return { error: INVALID_TARGET };
  }
  const valueText = String(form.get("value") ?? "");
  const turnsText = String(form.get("turns") ?? "");
  const kept = {
    revision: card.revision,
    kind,
    value: valueText,
    turns: turnsText,
  };
  let effect: SpellEffectInput | null = null;
  if (entry !== undefined) {
    const value = integerOf(valueText);
    if (value === undefined) {
      return {
        ...kept,
        valueError: `${entry.valueLabel}は整数で入力してください`,
      };
    }
    const turns = integerOf(turnsText);
    if (entry.turnsField && turns === undefined) {
      return {
        ...kept,
        turnsError: "効き続けるターン数は整数で入力してください",
      };
    }
    effect =
      entry.kind === "drawCards"
        ? { drawCards: { count: value } }
        : entry.kind === "gainMagic"
          ? { gainMagic: { perLap: value } }
          : entry.kind === "multipleDice"
            ? { multipleDice: { count: value, turns: turns ?? 0 } }
            : entry.kind === "fixedDice"
              ? { fixedDice: { value, turns: turns ?? 0 } }
              : { damage: { amount: value } };
  }

  const result = await callCore(changeSpellEffectMutation, {
    input: { id: card.id, revision: card.revision, effect },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }
  const changed = result.data.changeSpellEffect;
  switch (changed.__typename) {
    case "ChangeSpellEffectSuccess":
      return showChanged(card.id, changed.revision);
    case "ValidationErrors": {
      const valueError = changed.errors.find((e) => e.field === entry?.field);
      const turnsError = changed.errors.find(
        (e) => entry?.turnsField && e.field === entry.turnsField,
      );
      return {
        ...kept,
        valueError: valueError && statsErrorMessage(valueError),
        turnsError: turnsError && statsErrorMessage(turnsError),
      };
    }
    default:
      return failed(changed.__typename);
  }
}

export async function changeItemCategory(
  _previous: SpecState,
  form: FormData,
): Promise<SpecState> {
  const card = target(form);
  const category = String(form.get("category") ?? "");
  if (card === undefined || !isItemCategory(category)) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(changeItemCategoryMutation, {
    input: { id: card.id, revision: card.revision, category },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }
  const changed = result.data.changeItemCategory;
  switch (changed.__typename) {
    case "ChangeItemCategorySuccess":
      return showChanged(card.id, changed.revision);
    case "ItemEffectNotAllowedError":
      return { error: ITEM_EFFECT_NOT_ALLOWED };
    default:
      return failed(changed.__typename);
  }
}

export async function changeItemEffects(
  _previous: EffectsState,
  form: FormData,
): Promise<EffectsState> {
  const card = target(form);
  const read = readEffects(form);
  if (card === undefined || read === undefined) {
    return { error: INVALID_TARGET };
  }
  const kept = { revision: card.revision, ...read.kept };
  if (read.fieldErrors !== undefined) {
    return { ...kept, fieldErrors: read.fieldErrors };
  }

  const result = await callCore(changeItemEffectsMutation, {
    input: { id: card.id, revision: card.revision, effects: read.effects },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }
  const changed = result.data.changeItemEffects;
  switch (changed.__typename) {
    case "ChangeItemEffectsSuccess":
      return showChanged(card.id, changed.revision);
    case "ItemEffectNotAllowedError":
      return { ...kept, error: ITEM_EFFECT_NOT_ALLOWED };
    case "ValidationErrors":
      return { ...kept, ...effectsErrors(changed.errors, read.kinds) };
    default:
      return failed(changed.__typename);
  }
}

// 効果のフォームを読む（アイテムとクリーチャーで共有する。core#178）。選んだ種類を画面の選択肢の順（core の持てる種類の順）で送り、
// 値は種類に要る欄だけを入れる。整数でない値はここで止め、範囲の誤りは core が決める。知らない値は改ざんされた送信なので undefined
function readEffects(form: FormData):
  | {
      kinds: EffectKind[];
      effects: EffectInput[];
      kept: Pick<
        EffectsState,
        | "kinds"
        | "fields"
        | "opponentElements"
        | "destructions"
        | "creatureElements"
      >;
      fieldErrors?: Record<string, string>;
    }
  | undefined {
  const values = form.getAll("effects").map(String);
  const kinds = values.filter(isEffectKind);
  if (kinds.length !== values.length) {
    return undefined;
  }
  const fields: Record<string, string> = {};
  const opponentElements: Partial<Record<EffectKind, string[]>> = {};
  const destructions: Partial<Record<EffectKind, string[]>> = {};
  const creatureElements: Partial<Record<EffectKind, string[]>> = {};
  const fieldErrors: Record<string, string> = {};
  const effects: EffectInput[] = [];
  for (const kind of EFFECT_KINDS) {
    for (const { field } of EFFECT_FIELDS[kind] ?? []) {
      const name = `${field}.${kind}`;
      fields[name] = String(form.get(name) ?? "");
    }
    if (EFFECT_CONSTRAINT_LABELS[kind] !== undefined) {
      opponentElements[kind] = form
        .getAll(`opponentElements.${kind}`)
        .map(String);
    }
    if (EFFECT_DESTRUCTION_LABELS[kind] !== undefined) {
      destructions[kind] = form.getAll(`destructions.${kind}`).map(String);
    }
    if (EFFECT_CREATURE_ELEMENTS_LABELS[kind] !== undefined) {
      creatureElements[kind] = form
        .getAll(`creatureElements.${kind}`)
        .map(String);
    }
  }
  for (const kind of kinds) {
    const effect: EffectInput = { kind };
    for (const { field, label } of EFFECT_FIELDS[kind] ?? []) {
      const name = `${field}.${kind}`;
      const value = integerOf(fields[name] ?? "");
      if (value === undefined) {
        fieldErrors[name] = `${label}は整数で入力してください`;
      }
      effect[field] = value;
    }
    if (EFFECT_CONSTRAINT_LABELS[kind] !== undefined) {
      const entered = opponentElements[kind] ?? [];
      const elements = entered.filter(isCreatureElement);
      if (elements.length !== entered.length) {
        return undefined;
      }
      // 属性を選ばなければ制約なし（いつも発動する）
      effect.constraints =
        elements.length === 0
          ? []
          : [{ kind: "OPPONENT_CREATURE_ELEMENT", elements }];
    }
    if (EFFECT_DESTRUCTION_LABELS[kind] !== undefined) {
      const entered = destructions[kind] ?? [];
      const selected = entered.filter(isEffectDestruction);
      if (selected.length !== entered.length) {
        return undefined;
      }
      // 1 つ以上かは core が確かめる（選ばなければ core の誤りを欄に出す）
      effect.destructions = selected;
    }
    if (EFFECT_CREATURE_ELEMENTS_LABELS[kind] !== undefined) {
      const entered = creatureElements[kind] ?? [];
      const elements = entered.filter(isCreatureElement);
      if (elements.length !== entered.length) {
        return undefined;
      }
      // 1 つ以上かは core が確かめる（選ばなければ core の誤りを欄に出す）
      effect.elements = elements;
    }
    effects.push(effect);
  }
  return {
    kinds,
    effects,
    kept: {
      kinds: values,
      fields,
      opponentElements,
      destructions,
      creatureElements,
    },
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  };
}

// core が返した効果の誤り（effects.N.value・minimum・maximum・percent、effects.N.constraints.M.elements、援護の effects.N.elements、並び全体の effects）を、
// 送った N 番目の種類の欄に読み替えて文言にする。並び全体の誤りは、画面では同じ種類を重ねられないので、先制と後手を一緒に選んだ誤り（core#158）
function effectsErrors(
  errors: readonly { __typename: string; field: string; min?: number }[],
  kinds: readonly EffectKind[],
): Pick<EffectsState, "fieldErrors" | "effectsError" | "error"> {
  const fieldErrors: Record<string, string> = {};
  let effectsError: string | undefined;
  for (const error of errors) {
    if (error.field === "effects") {
      effectsError = EFFECTS_CONFLICTED;
      continue;
    }
    const [, index, part, , subpart] = error.field.split(".");
    const kind = kinds[Number(index)];
    if (kind === undefined) {
      return { error: INVALID_TARGET };
    }
    if (part === "constraints" && subpart === "elements") {
      fieldErrors[`opponentElements.${kind}`] = OPPONENT_ELEMENTS_INVALID;
      continue;
    }
    if (part === "destructions") {
      fieldErrors[`destructions.${kind}`] = DESTRUCTIONS_INVALID;
      continue;
    }
    if (part === "elements") {
      fieldErrors[`creatureElements.${kind}`] = CREATURE_ELEMENTS_INVALID;
      continue;
    }
    const field = EFFECT_FIELDS[kind]?.find((entry) => entry.field === part);
    if (field === undefined) {
      return { error: INVALID_TARGET };
    }
    fieldErrors[`${part}.${kind}`] = effectFieldErrorMessage(
      field.label,
      error,
    );
  }
  return {
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    effectsError,
  };
}
