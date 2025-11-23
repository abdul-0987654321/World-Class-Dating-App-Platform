import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const typeDefs = `#graphql
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello from GraphQL!',
  },
};

export async function createGraphQLServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  return {
    listen: async (port: number) => {
      const { url } = await startStandaloneServer(server, {
        listen: { port },
      });
      console.log(`GraphQL server ready at ${url}`);
      return url;
    },
    stop: async () => {
      await server.stop();
    },
  };
}
