// 画面（Server Action・ページ）と tests/ の両方が読むため、server-only や "use server" のファイルには置かない
// （"use server" のファイルは非同期の関数しか export できず、server-only はテストの Node から読めない）。
// 操作の名前は全体で一意にする（codegen の決まり）
import { graphql } from "@/graphql";

// 操作の結果の revision が詳細に届いたかを確かめる（投影の遅れを待つ。wait-card.ts）
export const cardRevisionQuery = graphql(`
  query CardRevision($id: UUID!) {
    card(id: $id) {
      __typename
      ... on Card {
        revision
      }
    }
  }
`);

// テストが、名前で絞った一覧に複数のカードが届くのを待つ（tests/card.ts）
export const cardsRevisionQuery = graphql(`
  query CardsRevision($name: String!) {
    cards(filter: { nameContains: $name }, first: 100) {
      __typename
      ... on CardConnection {
        edges {
          node {
            id
            revision
          }
        }
      }
    }
  }
`);

export const publishCardMutation = graphql(`
  mutation PublishCard($input: PublishCardInput!) {
    publishCard(input: $input) {
      __typename
      ... on PublishCardSuccess {
        id
        revision
      }
    }
  }
`);

export const registerCreatureMutation = graphql(`
  mutation RegisterCreature($input: RegisterCreatureInput!) {
    registerCreature(input: $input) {
      __typename
      ... on RegisterCreatureSuccess {
        creature {
          id
          revision
          name
        }
      }
      ... on ValidationErrors {
        errors {
          __typename
          ... on FieldTooLong {
            max
          }
        }
      }
    }
  }
`);
