import Link from "next/link";
import { graphql } from "@/graphql";
import { CARD_TYPE_LABELS } from "@/lib/card-type";
import { callCore } from "@/lib/core";
import { dateTimeFormat } from "@/lib/format";
import { editURL } from "./edit-url";

const starterDeckSetQuery = graphql(`
  query StarterDeckSet {
    starterDeckSet {
      __typename
      ... on StarterDeckSet {
        updatedAt
        decks {
          name
          cards {
            count
            card {
              __typename
              id
              name
            }
          }
          source {
            presetDeckId
            changedSinceCopied
            presetDeckDeleted
          }
        }
      }
    }
  }
`);

export default async function StarterDeckSetPage() {
  const result = await callCore(starterDeckSetQuery);

  if (!result.ok) {
    return (
      <main>
        <h1>スターターデッキ</h1>
        <p role="alert">
          core に接続できません。時間をおいて再読み込みしてください。{" "}
          <Link href="/starter-deck-set">再読み込み</Link>
        </p>
      </main>
    );
  }
  const set = result.data.starterDeckSet;
  if (set.__typename === "ForbiddenError") {
    return (
      <main>
        <h1>スターターデッキ</h1>
        <p role="alert">この操作をする権限がありません</p>
      </main>
    );
  }

  // 変更の画面は、今のスターターデッキの元を選んだ状態で開く。削除された元は選べないので除く
  const sources = set.decks
    .filter((deck) => !deck.source.presetDeckDeleted)
    .map((deck) => deck.source.presetDeckId);

  return (
    <main>
      <h1>スターターデッキ</h1>
      {set.decks.length === 0 ? (
        <p>スターターデッキは設定されていません</p>
      ) : (
        <>
          {set.updatedAt && (
            <p>設定日時: {dateTimeFormat.format(new Date(set.updatedAt))}</p>
          )}
          {set.decks.map((deck) => (
            <section
              key={deck.source.presetDeckId}
              aria-labelledby={`deck-${deck.source.presetDeckId}`}
            >
              <h2 id={`deck-${deck.source.presetDeckId}`}>{deck.name}</h2>
              {deck.source.presetDeckDeleted ? (
                <p role="status">元のプリセットデッキは削除されています</p>
              ) : (
                <p>
                  <Link href={`/preset-decks/${deck.source.presetDeckId}`}>
                    元のプリセットデッキ
                  </Link>
                </p>
              )}
              {deck.source.changedSinceCopied && (
                <p role="status">
                  元のプリセットデッキが変わっています。変更の画面で設定し直すと反映されます。{" "}
                  <Link href={editURL({ selected: sources })}>変更する</Link>
                </p>
              )}
              <table>
                <thead>
                  <tr>
                    <th>カード名</th>
                    <th>種類</th>
                    <th>枚数</th>
                  </tr>
                </thead>
                <tbody>
                  {deck.cards.map(({ card, count }) => (
                    <tr key={card.id}>
                      <td>{card.name}</td>
                      <td>{CARD_TYPE_LABELS[card.__typename]}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </>
      )}
      <p>
        <Link href={editURL({ selected: sources })}>変更する</Link>
      </p>
    </main>
  );
}
