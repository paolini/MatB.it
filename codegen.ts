import type { CodegenConfig } from '@graphql-codegen/cli';

const custumPlugin = {
  add: {
    content: 'import { ObjectId } from "mongodb";'
  }
}

const config: CodegenConfig = {
  schema: './src/app/graphql/schema.graphql', // Percorso al tuo schema GraphQL
  generates: {
    './src/app/graphql/generated.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        contextType: './types#Context', // Percorso al tipo del tuo context
        avoidOptionals: true, // questo forza l'uso di `T | null` invece di `T | null | undefined`
/*        scalars: {
          JSON: 'Record<string, unknown>',
          ObjectId: '{ input: string, output: ObjectId }',
          Timestamp: '{ input: string, output: Date }',
        },*/      
      },
    },
  },
};

export default config;
