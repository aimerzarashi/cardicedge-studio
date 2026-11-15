"use server";

import { refresh } from "next/cache";
import { graphql } from "@/graphql";
import type { ItemEffectKind, SpellEffectInput } from "@/graphql/graphql";
import { callCore } from "@/lib/core";
import { isCreatureAbilityKind } from "@/lib/creature-ability";
import { isCreatureElement } from "@/lib/creature-element";
import { isItemCategory } from "@/lib/item-category";
import { ITEM_EFFECT_VALUE_LABELS, isItemEffectKind } from "@/lib/item-effect";
import { isRarity } from "@/lib/rarity";
import { type Notice, target } from "../../deck-form";
import {
  ABILITIES_CONFLICTED,
  ATTACK_IMMUNITY_ELEMENTS_REQUIRED,
  CARD_NOT_DRAFT,
  CORE_UNAVAILABLE,
  costErrorMessage,
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
  AbilitiesState,
  EffectState,
  ElementsState,
  ItemEffectsState,
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

const changeCreatureAbilitiesMutation = graphql(`
  mutation ChangeCreatureAbilities($input: ChangeCreatureAbilitiesInput!) {
    changeCreatureAbilities(input: $input) {
      __typename
      ... on ChangeCreatureAbilitiesSuccess {
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
  const placementRestrictions = values.filter(isCreatureElement);
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

export async function changeCreatureAbilities(
  _previous: AbilitiesState,
  form: FormData,
): Promise<AbilitiesState> {
  const card = target(form);
  const values = form.getAll("abilities").map(String);
  // 知らない値は改ざんされた送信なので送らない
  const kinds = values.filter(isCreatureAbilityKind);
  if (card === undefined || kinds.length !== values.length) {
    return { error: INVALID_TARGET };
  }
  const percentValue = String(form.get("tollMultiplierPercent") ?? "");
  const attackValue = String(form.get("battleModifierAttack") ?? "");
  const hitPointsValue = String(form.get("battleModifierHitPoints") ?? "");
  const minimumValue = String(form.get("battleRandomMinimum") ?? "");
  const maximumValue = String(form.get("battleRandomMaximum") ?? "");
  const elementValues = form.getAll("attackImmunityElements").map(String);
  // 知らない値は改ざんされた送信なので送らない
  const elements = elementValues.filter(isCreatureElement);
  if (elements.length !== elementValues.length) {
    return { error: INVALID_TARGET };
  }
  const kept = {
    revision: card.revision,
    kinds: values,
    percent: percentValue,
    attackModifier: attackValue,
    hitPointsModifier: hitPointsValue,
    minimum: minimumValue,
    maximum: maximumValue,
    attackImmunityElements: elementValues,
  };
  // 倍率は通行料の倍率を選んだときだけ送る（値の範囲は core が決める）
  const tolled = kinds.includes("TOLL_MULTIPLIER");
  const percent = integerOf(percentValue);
  if (tolled && percent === undefined) {
    return { ...kept, percentError: "通行料の倍率は整数で入力してください" };
  }
  // 増減は戦闘中の増減を選んだときだけ送る（負も 0 もよい。core が両方の有無を判定する）
  const modified = kinds.includes("BATTLE_MODIFIER");
  const attackModifier = integerOf(attackValue);
  const hitPointsModifier = integerOf(hitPointsValue);
  if (
    modified &&
    (attackModifier === undefined || hitPointsModifier === undefined)
  ) {
    return {
      ...kept,
      attackModifierError:
        attackModifier === undefined
          ? "AT の増減は整数で入力してください"
          : undefined,
      hitPointsModifierError:
        hitPointsModifier === undefined
          ? "HP の増減は整数で入力してください"
          : undefined,
    };
  }
  // 最小・最大は戦闘中のランダムを選んだときだけ送る（範囲の誤りは core が決める）
  const randomized = kinds.includes("BATTLE_RANDOM_STATS");
  const minimum = integerOf(minimumValue);
  const maximum = integerOf(maximumValue);
  if (randomized && (minimum === undefined || maximum === undefined)) {
    return {
      ...kept,
      minimumError:
        minimum === undefined ? "最小は整数で入力してください" : undefined,
      maximumError:
        maximum === undefined ? "最大は整数で入力してください" : undefined,
    };
  }

  // 属性は攻撃無効を選んだときだけ送る（無を選べないのと空の誤りは core も確かめる）
  if (kinds.includes("ATTACK_IMMUNITY") && elements.length === 0) {
    return {
      ...kept,
      attackImmunityElementsError: ATTACK_IMMUNITY_ELEMENTS_REQUIRED,
    };
  }

  const result = await callCore(changeCreatureAbilitiesMutation, {
    input: {
      id: card.id,
      revision: card.revision,
      abilities: kinds.map((kind) => {
        switch (kind) {
          case "TOLL_MULTIPLIER":
            return { kind, percent };
          case "BATTLE_MODIFIER":
            return { kind, attackModifier, hitPointsModifier };
          case "BATTLE_RANDOM_STATS":
            return { kind, minimum, maximum };
          case "ATTACK_IMMUNITY":
            return { kind, elements };
          default:
            return { kind };
        }
      }),
    },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }
  const changed = result.data.changeCreatureAbilities;
  switch (changed.__typename) {
    case "ChangeCreatureAbilitiesSuccess":
      return showChanged(card.id, changed.revision);
    case "ValidationErrors": {
      // 画面の操作で起きるのは、倍率・最小・最大の範囲の誤り（abilities.N.percent・minimum・maximum）と、並び全体の誤り（abilities）だけ。
      // 並び全体の誤りは重複か先制と後手の同時の指定で、チェックでは同じ種類を重ねられないので後者として出す（core#158）
      const percentError = changed.errors.find((e) =>
        e.field.endsWith(".percent"),
      );
      const minimumError = changed.errors.find((e) =>
        e.field.endsWith(".minimum"),
      );
      const maximumError = changed.errors.find((e) =>
        e.field.endsWith(".maximum"),
      );
      if (changed.errors.some((e) => e.field.endsWith(".elements"))) {
        return {
          ...kept,
          attackImmunityElementsError: ATTACK_IMMUNITY_ELEMENTS_REQUIRED,
        };
      }
      if (minimumError || maximumError) {
        return {
          ...kept,
          minimumError:
            minimumError &&
            statsErrorMessage({ ...minimumError, field: "abilities.minimum" }),
          maximumError:
            maximumError &&
            statsErrorMessage({ ...maximumError, field: "abilities.maximum" }),
        };
      }
      if (percentError) {
        return {
          ...kept,
          percentError: statsErrorMessage({
            ...percentError,
            field: "abilities.percent",
          }),
        };
      }
      if (changed.errors.some((e) => e.field === "abilities")) {
        return { ...kept, abilitiesError: ABILITIES_CONFLICTED };
      }
      return { ...kept, error: INVALID_TARGET };
    }
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

// 選んだ種類を core の並びの順（画面の選択肢の順）で送る。値は値の要る効果だけに入れ、範囲の誤りは core が決める
export async function changeItemEffects(
  _previous: ItemEffectsState,
  form: FormData,
): Promise<ItemEffectsState> {
  const card = target(form);
  const values = form.getAll("effects").map(String);
  // 知らない値は改ざんされた送信なので送らない
  const kinds = values.filter(isItemEffectKind);
  const elementValues = form.getAll("opponentElements").map(String);
  const opponentElements = elementValues.filter(isCreatureElement);
  if (
    card === undefined ||
    kinds.length !== values.length ||
    opponentElements.length !== elementValues.length
  ) {
    return { error: INVALID_TARGET };
  }
  const entered: Partial<Record<ItemEffectKind, string>> = {};
  for (const kind of VALUED_ITEM_EFFECTS) {
    entered[kind] = String(form.get(`value.${kind}`) ?? "");
  }
  const percentValue = String(form.get("attackMultiplierPercent") ?? "");
  const kept = {
    revision: card.revision,
    kinds: values,
    values: entered,
    percent: percentValue,
    opponentElements: elementValues,
  };
  const valueErrors: Partial<Record<ItemEffectKind, string>> = {};
  for (const kind of VALUED_ITEM_EFFECTS) {
    if (kinds.includes(kind) && integerOf(entered[kind] ?? "") === undefined) {
      valueErrors[kind] =
        `${ITEM_EFFECT_VALUE_LABELS[kind]}は整数で入力してください`;
    }
  }
  const percent = integerOf(percentValue);
  const percentError =
    kinds.includes("ATTACK_MULTIPLIER") && percent === undefined
      ? "強打の倍率は整数で入力してください"
      : undefined;
  if (Object.keys(valueErrors).length > 0 || percentError) {
    return { ...kept, valueErrors, percentError };
  }

  const result = await callCore(changeItemEffectsMutation, {
    input: {
      id: card.id,
      revision: card.revision,
      effects: kinds.map((kind) => {
        switch (kind) {
          case "ATTACK_MODIFIER":
          case "HIT_POINTS_MODIFIER":
          case "ATTACK_OVERRIDE":
            return { kind, value: integerOf(entered[kind] ?? "") };
          case "ATTACK_MULTIPLIER":
            // 属性を選ばなければ制約なし（いつも発動する）
            return {
              kind,
              percent,
              constraints:
                opponentElements.length === 0
                  ? []
                  : [
                      {
                        kind: "OPPONENT_ELEMENT" as const,
                        elements: opponentElements,
                      },
                    ],
            };
          default:
            return { kind };
        }
      }),
    },
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
    case "ValidationErrors": {
      // 画面の操作で起きるのは、上書き・倍率の範囲の誤り（effects.N.value・effects.N.percent）と、相手の属性の誤りだけ
      const indexOf = (kind: ItemEffectKind) => kinds.indexOf(kind);
      const fieldOf = (field: string) =>
        changed.errors.find((e) => e.field === field);
      const overrideError = fieldOf(
        `effects.${indexOf("ATTACK_OVERRIDE")}.value`,
      );
      const multiplierError = fieldOf(
        `effects.${indexOf("ATTACK_MULTIPLIER")}.percent`,
      );
      if (changed.errors.some((e) => e.field.endsWith(".elements"))) {
        return { ...kept, opponentElementsError: OPPONENT_ELEMENTS_INVALID };
      }
      if (overrideError || multiplierError) {
        return {
          ...kept,
          valueErrors: overrideError
            ? {
                ATTACK_OVERRIDE: statsErrorMessage({
                  ...overrideError,
                  field: "effects.attackOverride",
                }),
              }
            : {},
          percentError:
            multiplierError &&
            statsErrorMessage({
              ...multiplierError,
              field: "effects.attackMultiplier",
            }),
        };
      }
      return { ...kept, error: INVALID_TARGET };
    }
    default:
      return failed(changed.__typename);
  }
}

const VALUED_ITEM_EFFECTS: ItemEffectKind[] = [
  "ATTACK_MODIFIER",
  "HIT_POINTS_MODIFIER",
  "ATTACK_OVERRIDE",
];
