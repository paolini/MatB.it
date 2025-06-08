'use client';

import { ApolloClient, InMemoryCache, ApolloProvider as ApolloProviderClient } from '@apollo/client';

const client = new ApolloClient({
  uri: '/graphql', // O l'URL del tuo server GraphQL esterno
  cache: new InMemoryCache(),
});

export default function ApolloContainer({ children }: {
    children: React.ReactNode
}) {
  return (
    <ApolloProviderClient client={client}>
      {children}
    </ApolloProviderClient>
  );
}