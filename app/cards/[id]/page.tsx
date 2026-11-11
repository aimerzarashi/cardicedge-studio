import Link from "next/link";
import { graphql } from "@/graphql";
import { CARD_TYPE_LABELS } from "@/lib/card-type";
import { callCore } from "@/lib/core";
import {
  elementsLabel,
  placementRestrictionsLabel,
} from "@/lib/creature-element";
import { dateTimeFormat } from "@/lib/format";
import {
  ITEM_CATEGORY_LABELS,
  itemRestrictionsLabel,
  signedBonus,
} from "@/lib/item-category";
import { RARITY_LABELS } from "@/lib/rarity";
import { STATUS_LABELS } from "@/lib/status";
import { spellEffectLabel, spellEffectValue } from "../../messages";
import { publishCard, retireCard } from "../actions";
import { CardStatusButton } from "../card-status-button";
import {
  changeCardCost,
  changeCardRarity,
  changeCreatureElements,
  changeCreatureItemRestrictions,
  changeCreatureMovement,
  changeCreaturePlacementRestrictions,
  changeCreatureStats,
  changeItemCategory,
  changeItemStatBonuses,
  changeSpellEffect,
} from "./actions";
import {
  CategoryForm,
  CostForm,
  EffectForm,
  ElementsForm,
  ItemRestrictionsForm,
  MovementForm,
  PlacementRestrictionsForm,
  RarityForm,
  StatBonusesForm,
  StatsForm,
} from "./spec-form";

const cardQuery = graphql(`
  query Card($id: UUID!) {
    card(id: $id) {
      __typename
      ... on Card {
        id
        name
        status
        cost
        rarity
        revision
        registeredAt
        updatedAt
      }
      ... on Creature {
        elements
        attack
        hitPoints
        movement
        itemRestrictions
        placementRestrictions
      }
      ... on Item {
        category
        attackBonus
        hitPointsBonus
      }
      ... on Spell {
        effect {
          __typename
          ... on SpellDrawCardsEffect {
            count
          }
          ... on SpellGainMagicEffect {
            perLap
          }
          ... on SpellRollDiceEffect {
            count
          }
          ... on SpellFixedDiceCurseEffect {
            value
            turns
          }
          ... on SpellDamageEffect {
            amount
          }
        }
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
      <h1>カード</h1>
      <p>
        <Link href="/cards">カードの一覧へ</Link>
      </p>
      <p role="alert">このカードは見つかりません</p>
    </main>
  );
}

export default async function CardPage({ params }: PageProps<"/cards/[id]">) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return <NotFound />;
  }

  const result = await callCore(cardQuery, { id });
  if (!result.ok) {
    return (
      <main>
        <h1>カード</h1>
        <p>
          <Link href="/cards">カードの一覧へ</Link>
        </p>
        <p role="alert">
          core に接続できません。時間をおいて再読み込みしてください。{" "}
          <Link href={`/cards/${id}`}>再読み込み</Link>
        </p>
      </main>
    );
  }
  const card = result.data.card;
  switch (card.__typename) {
    case "ForbiddenError":
      return (
        <main>
          <h1>カード</h1>
          <p role="alert">この操作をする権限がありません</p>
        </main>
      );
    case "CardNotFoundError":
      return <NotFound />;
  }

  // 性能を変えられるのは準備中だけ（公開中・使用不可は表示だけ）
  const editable = card.status === "DRAFT";
  return (
    <main>
      <h1>{card.name}</h1>
      <p>
        <Link href="/cards">カードの一覧へ</Link>
      </p>
      <dl>
        <dt>種類</dt>
        <dd>{CARD_TYPE_LABELS[card.__typename]}</dd>
        <dt>状態</dt>
        <dd>{STATUS_LABELS[card.status]}</dd>
        <dt>登録日時</dt>
        <dd>{dateTimeFormat.format(new Date(card.registeredAt))}</dd>
        <dt>更新日時</dt>
        <dd>{dateTimeFormat.format(new Date(card.updatedAt))}</dd>
      </dl>

      <section aria-labelledby="status-heading">
        <h2 id="status-heading">公開</h2>
        {card.status === "PUBLISHED" ? (
          <CardStatusButton
            action={retireCard}
            label="使用不可にする"
            id={card.id}
            revision={card.revision}
            name={card.name}
          />
        ) : (
          <CardStatusButton
            action={publishCard}
            label="公開する"
            id={card.id}
            revision={card.revision}
            name={card.name}
          />
        )}
      </section>

      <section aria-labelledby="spec-heading">
        <h2 id="spec-heading">性能</h2>
        {editable ? (
          <>
            <CostForm
              action={changeCardCost}
              id={card.id}
              revision={card.revision}
              cost={card.cost}
            />
            <RarityForm
              action={changeCardRarity}
              id={card.id}
              revision={card.revision}
              rarity={card.rarity}
            />
            {card.__typename === "Creature" && (
              <>
                <ElementsForm
                  action={changeCreatureElements}
                  id={card.id}
                  revision={card.revision}
                  elements={card.elements}
                />
                <StatsForm
                  action={changeCreatureStats}
                  id={card.id}
                  revision={card.revision}
                  attack={card.attack}
                  hitPoints={card.hitPoints}
                />
                <MovementForm
                  action={changeCreatureMovement}
                  id={card.id}
                  revision={card.revision}
                  movement={card.movement}
                />
                <ItemRestrictionsForm
                  action={changeCreatureItemRestrictions}
                  id={card.id}
                  revision={card.revision}
                  itemRestrictions={card.itemRestrictions}
                />
                <PlacementRestrictionsForm
                  action={changeCreaturePlacementRestrictions}
                  id={card.id}
                  revision={card.revision}
                  placementRestrictions={card.placementRestrictions}
                />
              </>
            )}
            {card.__typename === "Item" && (
              <>
                <CategoryForm
                  action={changeItemCategory}
                  id={card.id}
                  revision={card.revision}
                  category={card.category}
                />
                <StatBonusesForm
                  action={changeItemStatBonuses}
                  id={card.id}
                  revision={card.revision}
                  attackBonus={card.attackBonus}
                  hitPointsBonus={card.hitPointsBonus}
                />
              </>
            )}
            {card.__typename === "Spell" && (
              <EffectForm
                action={changeSpellEffect}
                id={card.id}
                revision={card.revision}
                effect={spellEffectValue(card.effect)}
              />
            )}
          </>
        ) : (
          <dl>
            <dt>コスト</dt>
            <dd>{card.cost}</dd>
            <dt>希少度</dt>
            <dd>{RARITY_LABELS[card.rarity]}</dd>
            {card.__typename === "Creature" && (
              <>
                <dt>属性</dt>
                <dd>{elementsLabel(card.elements)}</dd>
                <dt>AT</dt>
                <dd>{card.attack}</dd>
                <dt>HP</dt>
                <dd>{card.hitPoints}</dd>
                <dt>移動</dt>
                <dd>{card.movement}</dd>
                <dt>アイテム制限</dt>
                <dd>{itemRestrictionsLabel(card.itemRestrictions)}</dd>
                <dt>配置制限</dt>
                <dd>
                  {placementRestrictionsLabel(card.placementRestrictions)}
                </dd>
              </>
            )}
            {card.__typename === "Item" && (
              <>
                <dt>分類</dt>
                <dd>{ITEM_CATEGORY_LABELS[card.category]}</dd>
                <dt>AT の増減</dt>
                <dd>{signedBonus(card.attackBonus)}</dd>
                <dt>HP の増減</dt>
                <dd>{signedBonus(card.hitPointsBonus)}</dd>
              </>
            )}
            {card.__typename === "Spell" && (
              <>
                <dt>効果</dt>
                <dd>{spellEffectLabel(card.effect)}</dd>
              </>
            )}
          </dl>
        )}
      </section>
    </main>
  );
}
