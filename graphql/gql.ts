/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query Cards($filter: CardFilter, $after: String) {\n    cards(filter: $filter, after: $after) {\n      __typename\n      ... on CardConnection {\n        edges {\n          node {\n            __typename\n            id\n            name\n            registeredAt\n            updatedAt\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": typeof types.CardsDocument,
    "\n  mutation RegisterCreature($input: RegisterCreatureInput!) {\n    registerCreature(input: $input) {\n      __typename\n      ... on RegisterCreatureSuccess {\n        creature {\n          name\n        }\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n": typeof types.RegisterCreatureDocument,
    "\n  mutation RegisterItem($input: RegisterItemInput!) {\n    registerItem(input: $input) {\n      __typename\n      ... on RegisterItemSuccess {\n        item {\n          name\n        }\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n": typeof types.RegisterItemDocument,
};
const documents: Documents = {
    "\n  query Cards($filter: CardFilter, $after: String) {\n    cards(filter: $filter, after: $after) {\n      __typename\n      ... on CardConnection {\n        edges {\n          node {\n            __typename\n            id\n            name\n            registeredAt\n            updatedAt\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": types.CardsDocument,
    "\n  mutation RegisterCreature($input: RegisterCreatureInput!) {\n    registerCreature(input: $input) {\n      __typename\n      ... on RegisterCreatureSuccess {\n        creature {\n          name\n        }\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n": types.RegisterCreatureDocument,
    "\n  mutation RegisterItem($input: RegisterItemInput!) {\n    registerItem(input: $input) {\n      __typename\n      ... on RegisterItemSuccess {\n        item {\n          name\n        }\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n": types.RegisterItemDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Cards($filter: CardFilter, $after: String) {\n    cards(filter: $filter, after: $after) {\n      __typename\n      ... on CardConnection {\n        edges {\n          node {\n            __typename\n            id\n            name\n            registeredAt\n            updatedAt\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').CardsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RegisterCreature($input: RegisterCreatureInput!) {\n    registerCreature(input: $input) {\n      __typename\n      ... on RegisterCreatureSuccess {\n        creature {\n          name\n        }\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').RegisterCreatureDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RegisterItem($input: RegisterItemInput!) {\n    registerItem(input: $input) {\n      __typename\n      ... on RegisterItemSuccess {\n        item {\n          name\n        }\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').RegisterItemDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
