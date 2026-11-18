// 画面（Server Action・ページ）と tests/ の両方が読むため、server-only や "use server" のファイルには置かない
// （"use server" のファイルは非同期の関数しか export できず、server-only はテストの Node から読めない）。
// 操作の名前は全体で一意にする（codegen の決まり）
import { graphql } from "@/graphql";

export const npcMindsetRevisionQuery = graphql(`
  query NpcMindsetRevision($id: UUID!) {
    npcMindset(id: $id) {
      __typename
      ... on NpcMindset {
        revision
      }
    }
  }
`);

export const registerNpcMindsetMutation = graphql(`
  mutation RegisterNpcMindset($input: RegisterNpcMindsetInput!) {
    registerNpcMindset(input: $input) {
      __typename
      ... on RegisterNpcMindsetSuccess {
        id
        revision
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

export const setNpcMindsetActionWeightsMutation = graphql(`
  mutation SetNpcMindsetActionWeights($input: SetNpcMindsetActionWeightsInput!) {
    setNpcMindsetActionWeights(input: $input) {
      __typename
      ... on SetNpcMindsetActionWeightsSuccess {
        id
        revision
      }
      ... on ValidationErrors {
        errors {
          __typename
          field
          ... on FieldOutOfRange {
            min
            max
          }
        }
      }
    }
  }
`);

export const setNpcMindsetCriterionWeightsMutation = graphql(`
  mutation SetNpcMindsetCriterionWeights(
    $input: SetNpcMindsetCriterionWeightsInput!
  ) {
    setNpcMindsetCriterionWeights(input: $input) {
      __typename
      ... on SetNpcMindsetCriterionWeightsSuccess {
        id
        revision
      }
      ... on ValidationErrors {
        errors {
          __typename
          field
          ... on FieldOutOfRange {
            min
            max
          }
        }
      }
    }
  }
`);

export const publishNpcMindsetMutation = graphql(`
  mutation PublishNpcMindset($input: PublishNpcMindsetInput!) {
    publishNpcMindset(input: $input) {
      __typename
      ... on PublishNpcMindsetSuccess {
        id
        revision
      }
    }
  }
`);
