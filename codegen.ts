import type { CodegenConfig } from "@graphql-codegen/cli";

// スキーマは、make gen-api が前提にする版の core のイメージから取り出したもの（graphql/schema.graphql）だけを読む。
// 生成物（graphql/）は手で直さない
const config: CodegenConfig = {
  schema: "graphql/schema.graphql",
  documents: ["app/**/*.{ts,tsx}", "lib/**/*.ts"],
  ignoreNoDocuments: true,
  generates: {
    "./graphql/": {
      preset: "client",
      // 断片（fragment）を使うまでは、マスクの仕組みを生成しない
      presetConfig: { fragmentMasking: false },
      config: {
        // 文字列のまま fetch で送るため、AST ではなく文字列で持つ
        documentMode: "string",
        useTypeImports: true,
        enumsAsTypes: true,
        // core は UUID・DateTime を文字列で返す
        scalars: { UUID: "string", DateTime: "string" },
      },
    },
  },
};

export default config;
