"use client";

import { useActionState } from "react";
import type {
  CardRarity,
  CreatureElement,
  ItemCategory,
} from "@/graphql/graphql";
import {
  CREATURE_ELEMENT_LABELS,
  CREATURE_ELEMENTS,
} from "@/lib/creature-element";
import { ITEM_CATEGORIES, ITEM_CATEGORY_LABELS } from "@/lib/item-category";
import { RARITIES, RARITY_LABELS } from "@/lib/rarity";
import type { Kept, Notice } from "../../deck-form";

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

// アイテムの増減のフォームの結果。形は攻撃力と体力のフォームと同じ
export type StatBonusesState = Notice &
  Kept & {
    attackBonus?: string;
    hitPointsBonus?: string;
    attackBonusError?: string;
    hitPointsBonusError?: string;
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

export function StatBonusesForm({
  action,
  id,
  revision,
  attackBonus,
  hitPointsBonus,
}: {
  action: (
    previous: StatBonusesState,
    form: FormData,
  ) => Promise<StatBonusesState>;
  id: string;
  revision: number;
  attackBonus: number;
  hitPointsBonus: number;
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
          AT の増減
          <input
            type="number"
            name="attackBonus"
            required
            defaultValue={kept.attackBonus ?? attackBonus}
            aria-invalid={kept.attackBonusError ? true : undefined}
            aria-describedby={
              kept.attackBonusError ? "attack-bonus-error" : undefined
            }
          />
        </label>
        {kept.attackBonusError && (
          <p id="attack-bonus-error" role="alert">
            {kept.attackBonusError}
          </p>
        )}
        <label>
          HP の増減
          <input
            type="number"
            name="hitPointsBonus"
            required
            defaultValue={kept.hitPointsBonus ?? hitPointsBonus}
            aria-invalid={kept.hitPointsBonusError ? true : undefined}
            aria-describedby={
              kept.hitPointsBonusError ? "hit-points-bonus-error" : undefined
            }
          />
        </label>
        {kept.hitPointsBonusError && (
          <p id="hit-points-bonus-error" role="alert">
            {kept.hitPointsBonusError}
          </p>
        )}
        <button type="submit" disabled={isPending}>
          増減を変える
        </button>
      </form>
    </>
  );
}
