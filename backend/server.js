import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';

const PORT = process.env.PORT || 5001;

// GraphQL Schema Definition
const typeDefs = `#graphql
  type HomeData {
    title: String!
    welcomeMessage: String!
    description: String!
    features: [String!]!
  }

  type Query {
    home: HomeData!
  }
`;

// GraphQL Resolvers
const resolvers = {
  Query: {
    home: () => ({
      title: 'HUDS Nutrition Analyzer',
      welcomeMessage: 'Welcome to the HUDS Nutrition Analyzer!',
      description: 'Track your dining hall consumption, create diet goals, and monitor your nutritional intake.',
      features: [
        'View HUDS menu nutritional facts',
        'Analyze plate photos for nutritional content',
        'Create and track personalized diet goals',
        'Monitor your progress over time'
      ]
    })
  }
};

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Initialize Express app
const app = express();

// Start Apollo Server
await server.start();

// Apply middleware
app.use(
  '/graphql',
  cors(),
  express.json(),
  expressMiddleware(server)
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'GraphQL Server is running' });
});

app.listen(PORT, () => {
  console.log(`GraphQL Server is running on http://localhost:${PORT}/graphql`);
});

