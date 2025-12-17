# Enhanced Cosmos DB Setup

## Additional Containers Needed

Add the following code to `cosmos-client.ts` to support enhanced messaging features:

### 1. Add Reactions Container Property

```typescript
private reactionsContainer: Container | null = null;
```

### 2. Initialize Reactions Container

Add this code after the conversations container initialization:

```typescript
// Get or create Reactions container
const { container: reactionsContainer } = await database.containers.createIfNotExists({
  id: 'reactions',
  partitionKey: '/conversationId',
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [{ path: '/*' }],
    excludedPaths: [{ path: '/"_etag"/?' }],
  },
});
this.reactionsContainer = reactionsContainer;
logger.info('Container "reactions" ready');
```

### 3. Add Getter Method

```typescript
/**
 * Get Reactions container
 */
getReactionsContainer(): Container {
  if (!this.reactionsContainer) {
    throw new Error('Cosmos DB not initialized. Call initialize() first.');
  }
  return this.reactionsContainer;
}
```

## Note

The reactions container uses `/conversationId` as the partition key to ensure all reactions
for messages in the same conversation are co-located for efficient querying.
