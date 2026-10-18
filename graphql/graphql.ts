/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
/** カードの一覧の絞り込み */
export type CardFilter = {
  /** 名前に含まれる文字（前後の空白を除き、全角・半角、大文字・小文字の違いは無視する。空・空白だけは入力の誤り。50 文字まで） */
  nameContains?: string | null | undefined;
  /** 種類（指定が無ければすべて。空のリストは入力の誤り） */
  types?: Array<CardType> | null | undefined;
};

/** カードの種類（一覧の絞り込みに使う） */
export type CardType =
  | 'CREATURE'
  | 'ITEM'
  | 'SPELL';

/** クリーチャーを登録する入力 */
export type RegisterCreatureInput = {
  /** カード名（1〜50 文字。前後の空白は除いて保存する） */
  name: string;
};

/** アイテムを登録する入力 */
export type RegisterItemInput = {
  /** カード名（1〜50 文字。前後の空白は除いて保存する） */
  name: string;
};

export type CardsQueryVariables = Exact<{
  filter?: CardFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type CardsQuery = { cards:
    | { __typename: 'CardConnection', edges: Array<{ node:
          | { __typename: 'Creature', id: string, name: string, registeredAt: string, updatedAt: string }
          | { __typename: 'Item', id: string, name: string, registeredAt: string, updatedAt: string }
         }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'ValidationErrors' }
   };

export type RegisterCreatureMutationVariables = Exact<{
  input: RegisterCreatureInput;
}>;


export type RegisterCreatureMutation = { registerCreature:
    | { __typename: 'CardNameAlreadyInUseError' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RegisterCreatureSuccess', creature: { name: string } }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
      > }
   };

export type RegisterItemMutationVariables = Exact<{
  input: RegisterItemInput;
}>;


export type RegisterItemMutation = { registerItem:
    | { __typename: 'CardNameAlreadyInUseError' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RegisterItemSuccess', item: { name: string } }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
      > }
   };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const CardsDocument = new TypedDocumentString(`
    query Cards($filter: CardFilter, $after: String) {
  cards(filter: $filter, after: $after) {
    __typename
    ... on CardConnection {
      edges {
        node {
          __typename
          id
          name
          registeredAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CardsQuery, CardsQueryVariables>;
export const RegisterCreatureDocument = new TypedDocumentString(`
    mutation RegisterCreature($input: RegisterCreatureInput!) {
  registerCreature(input: $input) {
    __typename
    ... on RegisterCreatureSuccess {
      creature {
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
    `) as unknown as TypedDocumentString<RegisterCreatureMutation, RegisterCreatureMutationVariables>;
export const RegisterItemDocument = new TypedDocumentString(`
    mutation RegisterItem($input: RegisterItemInput!) {
  registerItem(input: $input) {
    __typename
    ... on RegisterItemSuccess {
      item {
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
    `) as unknown as TypedDocumentString<RegisterItemMutation, RegisterItemMutationVariables>;