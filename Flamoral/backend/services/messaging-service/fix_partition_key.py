filepath = 'src/infrastructure/database/cosmos-optimized.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add PartitionKeyKind to imports
content = content.replace(
    "import { CosmosClient, Database, Container, IndexingPolicy, ContainerDefinition } from '@azure/cosmos';",
    "import { CosmosClient, Database, Container, IndexingPolicy, ContainerDefinition, PartitionKeyKind } from '@azure/cosmos';"
)

# Replace string 'Hash' with PartitionKeyKind.Hash
content = content.replace("kind: 'Hash',", "kind: PartitionKeyKind.Hash,")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed PartitionKeyKind in cosmos-optimized.ts")
