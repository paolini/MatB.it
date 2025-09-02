'use client';

import { ApolloClient, InMemoryCache, ApolloProvider as ApolloProviderClient, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Crea il link HTTP
const httpLink = createHttpLink({
  uri: '/graphql',
});

// Crea il link per l'autenticazione che include il token
const authLink = setContext((_, { headers }) => {
  // Ottieni il token dalla query string se presente
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  return {
    headers: {
      ...headers,
      ...(token && { 'x-access-token': token })
    }
  };
});

const client = new ApolloClient({
  // Link = middleware Apollo: authLink aggiunge headers, poi httpLink fa la richiesta
  link: authLink.concat(httpLink),
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