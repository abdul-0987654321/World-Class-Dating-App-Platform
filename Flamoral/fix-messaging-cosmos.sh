#!/bin/bash
# Fix messaging-service to make Cosmos DB optional

FILE="backend/services/messaging-service/src/index.ts"

# Patch the startServer function to make Cosmos optional
sed -i.bak '104,107s/.*Initializing Cosmos DB.*/    \/\/ Initialize Cosmos DB connection (optional)\n    if (process.env.COSMOS_ENDPOINT \&\& process.env.COSMOS_KEY) {\n      logger.info('\''Initializing Cosmos DB connection...'\'');\n      await cosmosClient.initialize();\n      logger.info('\''Cosmos DB connection established'\'');\n    } else {\n      logger.warn('\''Cosmos DB not configured - running without Cosmos DB support'\'');\n    }/' "$FILE"

echo "Fixed messaging-service index.ts"
