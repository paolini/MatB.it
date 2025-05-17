import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/app/graphql/schema.graphql', // Percorso al tuo schema GraphQL
  generates: {
    './src/app/graphql/generated.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        contextType: './types#Context', // Percorso al tipo del tuo context
        avoidOptionals: true, // questo forza l'uso di `T | null` invece di `T | null | undefined`
      },
    },
  },
};

export default config;
