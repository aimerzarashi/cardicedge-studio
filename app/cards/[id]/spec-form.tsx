"use client";

import { useActionState } from "react";
import type {
  CardRarity,
  CreatureElement,
  ItemCategory,
  ItemEffectKind,
} from "@/graphql/graphql";
import {
  CREATURE_ABILITY_KINDS,
  CREATURE_ABILITY_LABELS,
  type CreatureAbilityView,
} from "@/lib/creature-ability";
import {
  ATTACK_IMMUNITY_ELEMENTS,
  CREATURE_ELEMENT_LABELS,
  CREATURE_ELEMENTS,
  PLACEMENT_RESTRICTION_ELEMENTS,
} from "@/lib/creature-element";
import { ITEM_CATEGORIES, ITEM_CATEGORY_LABELS } from "@/lib/item-category";
import {
  ITEM_EFFECT_LABELS,
  ITEM_EFFECT_VALUE_LABELS,
  type ItemEffectView,
} from "@/lib/item-effect";
import { RARITIES, RARITY_LABELS } from "@/lib/rarity";
import type { Kept, Notice } from "../../deck-form";
import { SPELL_EFFECT_KINDS } from "../../messages";

// 性能の項目 1 つを変えるフォームの結果。入力した値と誤りは、入力したときの版に結びつける
export type SpecState = Notice &
  Kept & {
    value?: string;
    fieldError?: string;
  };

// 属性のフォームの結果。誤りのときは選んだ属性を残す
export type ElementsState = Notice &
  Kept & {
    elements?: string[];
    fieldError?: string;
  };

// 攻撃力と体力のフォームの結果。2 つを一緒に送るので、入力した値と誤りは項目ごとに持つ
export type StatsState = Notice &
  Kept & {
    attack?: string;
    hitPoints?: string;
    attackError?: string;
    hitPointsError?: string;
  };

// スペルの効果のフォームの結果。誤りのときは選んだ種類と入力した枚数を残す
export type EffectState = Notice &
  Kept & {
    kind?: string;
    value?: string;
    valueError?: string;
    turns?: string;
    turnsError?: string;
  };

// アイテムの効果のフォームの結果。誤りのときは選んだ種類と入力した値を残す
export type ItemEffectsState = Notice &
  Kept & {
    kinds?: string[];
    values?: Partial<Record<ItemEffectKind, string>>;
    percent?: string;
    opponentElements?: string[];
    valueErrors?: Partial<Record<ItemEffectKind, string>>;
    percentError?: string;
    opponentElementsError?: string;
  };

const initialState: SpecState = {};

type Action = (previous: SpecState, form: FormData) => Promise<SpecState>;

export function CostForm({
  action,
  id,
  revision,
  cost,
}: {
  action: Action;
  id: string;
  revision: number;
  cost: number;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const kept = state.revision === revision ? state : {};

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {/* 版が変わったら入力欄を作り直し、最新の値を入れる（defaultValue は作った後に変えても入力欄に反映されない） */}
      <form key={revision} action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        <label>
          コスト
          <input
            type="number"
            name="cost"
            required
            defaultValue={kept.value ?? cost}
            aria-invalid={kept.fieldError ? true : undefined}
            aria-describedby={kept.fieldError ? "cost-error" : undefined}
          />
        </label>
        {kept.fieldError && (
          <p id="cost-error" role="alert">
            {kept.fieldError}
          </p>
        )}
        <button type="submit" disabled={isPending}>
          コストを変える
        </button>
      </form>
    </>
  );
}

export function RarityForm({
  action,
  id,
  revision,
  rarity,
}: {
  action: Action;
  id: string;
  revision: number;
  rarity: CardRarity;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      <form key={revision} action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        <label>
          希少度
          <select name="rarity" defaultValue={rarity}>
            {RARITIES.map((value) => (
              <option key={value} value={value}>
                {RARITY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={isPending}>
          希少度を変える
        </button>
      </form>
    </>
  );
}

export function ElementsForm({
  action,
  id,
  revision,
  elements,
}: {
  action: (previous: ElementsState, form: FormData) => Promise<ElementsState>;
  id: string;
  revision: number;
  elements: CreatureElement[];
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const kept = state.revision === revision ? state : {};
  const checked: string[] = kept.elements ?? elements;

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      <form key={revision} action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        <fieldset
          aria-invalid={kept.fieldError ? true : undefined}
          aria-describedby={kept.fieldError ? "elements-error" : undefined}
        >
          <legend>属性</legend>
          {CREATURE_ELEMENTS.map((value) => (
            <label key={value}>
              <input
                type="checkbox"
                name="elements"
                value={value}
                defaultChecked={checked.includes(value)}
              />
              {CREATURE_ELEMENT_LABELS[value]}
            </label>
          ))}
        </fieldset>
        {kept.fieldError && (
          <p id="elements-error" role="alert">
            {kept.fieldError}
          </p>
        )}
        <button type="submit" disabled={isPending}>
          属性を変える
        </button>
      </form>
    </>
  );
}

// 置けない土地の属性をチェックする。チェックなしは制限なし（2026-11-11 オーナー。core#155）。選び方の誤りは画面の操作では起きない
export function PlacementRestrictionsForm({
  action,
  id,
  revision,
  placementRestrictions,
}: {
  action: (previous: Notice, form: FormData) => Promise<Notice>;
  id: string;
  revision: number;
  placementRestrictions: CreatureElement[];
}) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      <form key={revision} action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        <fieldset>
          <legend>配置制限（チェックした属性の土地には置けない）</legend>
          {PLACEMENT_RESTRICTION_ELEMENTS.map((value) => (
            <label key={value}>
              <input
                type="checkbox"
                name="placementRestrictions"
                value={value}
                defaultChecked={placementRestrictions.includes(value)}
              />
              {CREATURE_ELEMENT_LABELS[value]}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={isPending}>
          配置制限を変える
        </button>
      </form>
    </>
  );
}

// 持てない分類をチェックする。チェックなしは制限なし（2026-11-11 オーナー。core#154）。選び方の誤りは画面の操作では起きない
export function ItemRestrictionsForm({
  action,
  id,
  revision,
  itemRestrictions,
}: {
  action: (previous: Notice, form: FormData) => Promise<Notice>;
  id: string;
  revision: number;
  itemRestrictions: ItemCategory[];
}) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      <form key={revision} action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        <fieldset>
          <legend>アイテム制限（チェックした分類は持てない）</legend>
          {ITEM_CATEGORIES.map((value) => (
            <label key={value}>
              <input
                type="checkbox"
                name="itemRestrictions"
                value={value}
                defaultChecked={itemRestrictions.includes(value)}
              />
              {ITEM_CATEGORY_LABELS[value]}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={isPending}>
          アイテム制限を変える
        </button>
      </form>
    </>
  );
}

export function StatsForm({
  action,
  id,
  revision,
  attack,
  hitPoints,
}: {
  action: (previous: StatsState, form: FormData) => Promise<StatsState>;
  id: string;
  revision: number;
  attack: number;
  hitPoints: number;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const kept = state.revision === revision ? state : {};

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      <form key={revision} action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        <label>
          AT
          <input
            type="number"
            name="attack"
            required
            defaultValue={kept.attack ?? attack}
            aria-invalid={kept.attackError ? true : undefined}
            aria-describedby={kept.attackError ? "attack-error" : undefined}
          />
        </label>
        {kept.attackError && (
          <p id="attack-error" role="alert">
            {kept.attackError}
          </p>
        )}
        <label>
          HP
          <input
            type="number"
            name="hitPoints"
            required
            defaultValue={kept.hitPoints ?? hitPoints}
            aria-invalid={kept.hitPointsError ? true : undefined}
            aria-describedby={
              kept.hitPointsError ? "hit-points-error" : undefined
            }
          />
        </label>
        {kept.hitPointsError && (
          <p id="hit-points-error" role="alert">
            {kept.hitPointsError}
          </p>
        )}
        <button type="submit" disabled={isPending}>
          AT と HP を変える
        </button>
      </form>
    </>
  );
}

// 能力の結果。誤りのときは選んだ種類と入力した倍率を残す
export type AbilitiesState = Notice &
  Kept & {
    kinds?: string[];
    percent?: string;
    percentError?: string;
    attackModifier?: string;
    hitPointsModifier?: string;
    attackModifierError?: string;
    hitPointsModifierError?: string;
    abilitiesError?: string;
    minimum?: string;
    maximum?: string;
    minimumError?: string;
    maximumError?: string;
    attackImmunityElements?: string[];
    attackImmunityElementsError?: string;
  };

// 能力はチェックで選び、値の要る能力（通行料の倍率・戦闘中の増減・戦闘中のランダム・攻撃無効）は隣の欄に値を入れる（2026-11-11 オーナー。core#156・core#157）
export function AbilitiesForm({
  action,
  id,
  revision,
  abilities,
}: {
  action: (previous: AbilitiesState, form: FormData) => Promise<AbilitiesState>;
  id: string;
  revision: number;
  abilities: CreatureAbilityView[];
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const kept = state.revision === revision ? state : {};
  const kinds: string[] = kept.kinds ?? abilities.map(({ kind }) => kind);
  const percent =
    kept.percent ??
    String(
      abilities.find(({ kind }) => kind === "TOLL_MULTIPLIER")?.percent ?? 150,
    );
  const battleModifier = abilities.find(
    ({ kind }) => kind === "BATTLE_MODIFIER",
  );
  const attackModifier =
    kept.attackModifier ?? String(battleModifier?.attackModifier ?? 0);
  const hitPointsModifier =
    kept.hitPointsModifier ?? String(battleModifier?.hitPointsModifier ?? 0);
  const battleRandom = abilities.find(
    ({ kind }) => kind === "BATTLE_RANDOM_STATS",
  );
  const minimum = kept.minimum ?? String(battleRandom?.minimum ?? 10);
  const maximum = kept.maximum ?? String(battleRandom?.maximum ?? 70);
  const attackImmunityElements: string[] =
    kept.attackImmunityElements ??
    abilities.find(({ kind }) => kind === "ATTACK_IMMUNITY")?.elements ??
    [];

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      <form key={revision} action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        <fieldset
          aria-invalid={kept.abilitiesError ? true : undefined}
          aria-describedby={kept.abilitiesError ? "abilities-error" : undefined}
        >
          <legend>能力</legend>
          {CREATURE_ABILITY_KINDS.map((value) => (
            <label key={value}>
              <input
                type="checkbox"
                name="abilities"
                value={value}
                defaultChecked={kinds.includes(value)}
              />
              {CREATURE_ABILITY_LABELS[value]}
            </label>
          ))}
          <label>
            通行料の倍率（%）
            <input
              type="number"
              name="tollMultiplierPercent"
              defaultValue={percent}
              aria-invalid={kept.percentError ? true : undefined}
              aria-describedby={
                kept.percentError ? "toll-multiplier-error" : undefined
              }
            />
          </label>
          <label>
            AT の増減
            <input
              type="number"
              name="battleModifierAttack"
              defaultValue={attackModifier}
              aria-invalid={kept.attackModifierError ? true : undefined}
              aria-describedby={
                kept.attackModifierError
                  ? "battle-modifier-attack-error"
                  : undefined
              }
            />
          </label>
          <label>
            HP の増減
            <input
              type="number"
              name="battleModifierHitPoints"
              defaultValue={hitPointsModifier}
              aria-invalid={kept.hitPointsModifierError ? true : undefined}
              aria-describedby={
                kept.hitPointsModifierError
                  ? "battle-modifier-hit-points-error"
                  : undefined
              }
            />
          </label>
          <label>
            最小
            <input
              type="number"
              name="battleRandomMinimum"
              defaultValue={minimum}
              aria-invalid={kept.minimumError ? true : undefined}
              aria-describedby={
                kept.minimumError ? "battle-random-minimum-error" : undefined
              }
            />
          </label>
          <label>
            最大
            <input
              type="number"
              name="battleRandomMaximum"
              defaultValue={maximum}
              aria-invalid={kept.maximumError ? true : undefined}
              aria-describedby={
                kept.maximumError ? "battle-random-maximum-error" : undefined
              }
            />
          </label>
          <fieldset
            aria-invalid={kept.attackImmunityElementsError ? true : undefined}
            aria-describedby={
              kept.attackImmunityElementsError
                ? "attack-immunity-elements-error"
                : undefined
            }
          >
            <legend>攻撃無効の属性</legend>
            {ATTACK_IMMUNITY_ELEMENTS.map((value) => (
              <label key={value}>
                <input
                  type="checkbox"
                  name="attackImmunityElements"
                  value={value}
                  defaultChecked={attackImmunityElements.includes(value)}
                />
                {CREATURE_ELEMENT_LABELS[value]}
              </label>
            ))}
          </fieldset>
        </fieldset>
        {kept.abilitiesError && (
          <p id="abilities-error" role="alert">
            {kept.abilitiesError}
          </p>
        )}
        {kept.percentError && (
          <p id="toll-multiplier-error" role="alert">
            {kept.percentError}
          </p>
        )}
        {kept.attackModifierError && (
          <p id="battle-modifier-attack-error" role="alert">
            {kept.attackModifierError}
          </p>
        )}
        {kept.hitPointsModifierError && (
          <p id="battle-modifier-hit-points-error" role="alert">
            {kept.hitPointsModifierError}
          </p>
        )}
        {kept.minimumError && (
          <p id="battle-random-minimum-error" role="alert">
            {kept.minimumError}
          </p>
        )}
        {kept.maximumError && (
          <p id="battle-random-maximum-error" role="alert">
            {kept.maximumError}
          </p>
        )}
        {kept.attackImmunityElementsError && (
          <p id="attack-immunity-elements-error" role="alert">
            {kept.attackImmunityElementsError}
          </p>
        )}
        <button type="submit" disabled={isPending}>
          能力を変える
        </button>
      </form>
    </>
  );
}

// 効果は種類を選んでから値を入れる（core の changeSpellEffect。種類ごとに値の意味が違うため、値の欄は 1 つにして選んだ種類の値として送る）。
// 「なし」を選ぶと値は送らない
export function EffectForm({
  action,
  id,
  revision,
  effect,
}: {
  action: (previous: EffectState, form: FormData) => Promise<EffectState>;
  id: string;
  revision: number;
  // 今の効果の種類と値（効果なしは kind が none。ターン数はターンをまたいで効き続ける効果だけ）
  effect: { kind: string; value: number | null; turns: number | null };
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const kept = state.revision === revision ? state : {};
  const kind = kept.kind ?? effect.kind;

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {/* 送った後にフォームが元に戻るとき、select は最初に描いたときの既定値に戻る（後から defaultValue を変えても効かない）ため、
          選んだ種類も key に入れて作り直す。入れないと、誤りで断られた後に「なし」のまま送ってしまう */}
      <form key={`${revision}:${kind}`} action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        <label>
          効果
          <select name="kind" defaultValue={kind}>
            <option value="none">なし</option>
            {SPELL_EFFECT_KINDS.map((entry) => (
              <option key={entry.kind} value={entry.kind}>
                {entry.label}（{entry.valueLabel}）
              </option>
            ))}
          </select>
        </label>
        <label>
          値
          <input
            type="number"
            name="value"
            defaultValue={kept.value ?? effect.value ?? 1}
            aria-invalid={kept.valueError ? true : undefined}
            aria-describedby={kept.valueError ? "value-error" : undefined}
          />
        </label>
        {kept.valueError && (
          <p id="value-error" role="alert">
            {kept.valueError}
          </p>
        )}
        <label>
          効き続けるターン数（サイコロを複数振る・サイコロの目を固定するだけ）
          <input
            type="number"
            name="turns"
            defaultValue={kept.turns ?? effect.turns ?? 1}
            aria-invalid={kept.turnsError ? true : undefined}
            aria-describedby={kept.turnsError ? "turns-error" : undefined}
          />
        </label>
        {kept.turnsError && (
          <p id="turns-error" role="alert">
            {kept.turnsError}
          </p>
        )}
        <button type="submit" disabled={isPending}>
          効果を変える
        </button>
      </form>
    </>
  );
}

export function CategoryForm({
  action,
  id,
  revision,
  category,
}: {
  action: Action;
  id: string;
  revision: number;
  category: ItemCategory;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      <form key={revision} action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        <label>
          分類
          <select name="category" defaultValue={category}>
            {ITEM_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {ITEM_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={isPending}>
          分類を変える
        </button>
      </form>
    </>
  );
}

// 効果は持てる種類（core の allowedEffectKinds）のチェックボックスと、値の要る効果の値の欄。1 つの種類は 1 つまで入れる
// （core は同じ種類を重ねて持てるが、見本に重ねるカードが無いため画面では選ばない。重ねるカードを作るときに見直す）
export function ItemEffectsForm({
  action,
  id,
  revision,
  allowedKinds,
  effects,
}: {
  action: (
    previous: ItemEffectsState,
    form: FormData,
  ) => Promise<ItemEffectsState>;
  id: string;
  revision: number;
  allowedKinds: ItemEffectKind[];
  effects: ItemEffectView[];
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const kept = state.revision === revision ? state : {};
  const kinds: string[] = kept.kinds ?? effects.map(({ kind }) => kind);
  const current = (kind: ItemEffectKind) =>
    effects.find((effect) => effect.kind === kind);
  const enteredValue = (kind: ItemEffectKind, fallback: number) =>
    kept.values?.[kind] ?? String(current(kind)?.value ?? fallback);
  const percent =
    kept.percent ?? String(current("ATTACK_MULTIPLIER")?.percent ?? 150);
  const opponentElements: string[] =
    kept.opponentElements ??
    current("ATTACK_MULTIPLIER")?.opponentElements ??
    [];
  const valued = allowedKinds.filter(
    (kind) =>
      kind === "ATTACK_MODIFIER" ||
      kind === "HIT_POINTS_MODIFIER" ||
      kind === "ATTACK_OVERRIDE",
  );

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      <form key={revision} action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        <fieldset>
          <legend>効果</legend>
          {allowedKinds.map((value) => (
            <label key={value}>
              <input
                type="checkbox"
                name="effects"
                value={value}
                defaultChecked={kinds.includes(value)}
              />
              {ITEM_EFFECT_LABELS[value]}
            </label>
          ))}
          {valued.map((kind) => (
            <label key={kind}>
              {ITEM_EFFECT_VALUE_LABELS[kind]}
              <input
                type="number"
                name={`value.${kind}`}
                defaultValue={enteredValue(
                  kind,
                  kind === "ATTACK_OVERRIDE" ? 30 : 0,
                )}
                aria-invalid={kept.valueErrors?.[kind] ? true : undefined}
                aria-describedby={
                  kept.valueErrors?.[kind] ? `value-${kind}-error` : undefined
                }
              />
            </label>
          ))}
          {allowedKinds.includes("ATTACK_MULTIPLIER") && (
            <>
              <label>
                強打の倍率（%）
                <input
                  type="number"
                  name="attackMultiplierPercent"
                  defaultValue={percent}
                  aria-invalid={kept.percentError ? true : undefined}
                  aria-describedby={
                    kept.percentError ? "attack-multiplier-error" : undefined
                  }
                />
              </label>
              <fieldset
                aria-invalid={kept.opponentElementsError ? true : undefined}
                aria-describedby={
                  kept.opponentElementsError
                    ? "opponent-elements-error"
                    : undefined
                }
              >
                <legend>強打する相手の属性（選ばなければいつも）</legend>
                {CREATURE_ELEMENTS.map((value) => (
                  <label key={value}>
                    <input
                      type="checkbox"
                      name="opponentElements"
                      value={value}
                      defaultChecked={opponentElements.includes(value)}
                    />
                    {CREATURE_ELEMENT_LABELS[value]}
                  </label>
                ))}
              </fieldset>
            </>
          )}
        </fieldset>
        {valued.map(
          (kind) =>
            kept.valueErrors?.[kind] && (
              <p key={kind} id={`value-${kind}-error`} role="alert">
                {kept.valueErrors[kind]}
              </p>
            ),
        )}
        {kept.percentError && (
          <p id="attack-multiplier-error" role="alert">
            {kept.percentError}
          </p>
        )}
        {kept.opponentElementsError && (
          <p id="opponent-elements-error" role="alert">
            {kept.opponentElementsError}
          </p>
        )}
        <button type="submit" disabled={isPending}>
          効果を変える
        </button>
      </form>
    </>
  );
}
