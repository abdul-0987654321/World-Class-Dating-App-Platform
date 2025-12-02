# E2E Encryption Quick Start Guide

## For Backend Developers

### 1. Start the Messaging Service

```bash
cd backend/services/messaging-service
npm install
npm run dev
```

The service will run on `http://localhost:3003`

### 2. Initialize Encryption Containers

The containers are created automatically on first run. To manually initialize:

```typescript
import { runEncryptionMigration } from './src/infrastructure/database/encryption-init';
import { CosmosClient } from '@azure/cosmos';

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
});

await runEncryptionMigration(client, 'Flamoral');
```

### 3. Test API Endpoints

```bash
# Get auth token first
TOKEN="your-jwt-token"

# Generate new encryption keys
curl -X POST http://localhost:3003/api/keys/generate \
  -H "Authorization: Bearer $TOKEN"

# Upload keys
curl -X POST http://localhost:3003/api/keys/upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "identityKey": { "publicKey": "..." },
    "signedPreKey": { "keyId": 123, "publicKey": "...", "signature": "...", "timestamp": 1234567890 },
    "oneTimePreKeys": [{ "keyId": 1, "publicKey": "..." }]
  }'

# Get user's public keys
curl http://localhost:3003/api/keys/user123 \
  -H "Authorization: Bearer $TOKEN"
```

## For Mobile Developers

### 1. Install Dependencies

```bash
cd apps/mobile-app
npm install expo-crypto expo-secure-store buffer
```

### 2. Import and Use Encryption

```typescript
import { useEncryption, useMessageEncryption } from './hooks/encryption';

function ChatScreen() {
  // Initialize encryption
  const { status } = useEncryption();

  // Use for messages
  const { prepareMessageForSending, decryptReceivedMessage } = useMessageEncryption();

  // Send encrypted message
  const sendMessage = async (text: string) => {
    const encrypted = await prepareMessageForSending(text, conversationId);
    await api.sendMessage({
      content: encrypted.content,
      encryption: encrypted.encryption,
    });
  };

  // Decrypt received message
  const displayMessage = async (message) => {
    const plaintext = await decryptReceivedMessage(message);
    return plaintext;
  };
}
```

### 3. Run the App

```bash
# Start Expo
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Testing the Full Flow

### 1. Initialize User A

```bash
# Mobile App (User A)
# - App auto-initializes encryption on login
# - Keys are generated and uploaded to server
```

### 2. Initialize User B

```bash
# Mobile App (User B)
# - App auto-initializes encryption on login
```

### 3. Send Encrypted Message

```typescript
// User A sends to User B
const message = "Hello, User B!";
const encrypted = await prepareMessageForSending(message, conversationId);

// This encrypts the message and sends it to server
await messagingAPI.sendMessage({
  conversationId,
  receiverId: userB.id,
  content: encrypted.content,
  encryption: encrypted.encryption,
});
```

### 4. Receive and Decrypt

```typescript
// User B receives the message
const receivedMessage = await messagingAPI.getMessages(conversationId);

// Decrypt it
const plaintext = await decryptReceivedMessage(receivedMessage[0]);
// plaintext === "Hello, User B!"
```

## Quick Debug Commands

### Check if user has encryption keys

```typescript
const hasKeys = await SecureKeyStorage.hasKeys(userId);
console.log('Has keys:', hasKeys);
```

### Get encryption status

```typescript
const { status } = useEncryption();
console.log('Initialized:', status.isInitialized);
console.log('Loading:', status.isLoading);
console.log('Error:', status.error);
```

### Test encryption/decryption

```typescript
const EncryptionService = require('./services/encryption/EncryptionService').default;

// Test round-trip
const key = await EncryptionService.generateSessionKey();
const encrypted = await EncryptionService.encryptMessage('Test', key);
const decrypted = await EncryptionService.decryptMessage(encrypted, key);
console.log('Success:', decrypted === 'Test');
```

## Common Commands

### Backend

```bash
# Run tests
npm test -- encryption

# Build
npm run build

# Lint
npm run lint
```

### Mobile

```bash
# Run tests
npm test

# Type check
npm run type-check

# Clear cache
npm start -- --clear
```

## Environment Setup

### Backend (.env)

```env
COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
JWT_ACCESS_SECRET=your-jwt-secret
PORT=3003
```

### Mobile (.env)

```env
EXPO_PUBLIC_MESSAGING_SERVICE_URL=http://localhost:3003
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Troubleshooting

### "Encryption not initialized"
```bash
# Check if keys exist
const hasKeys = await SecureKeyStorage.hasKeys(userId);

# Manually initialize
await initializeEncryption();
```

### "Failed to decrypt message"
```bash
# Check encryption metadata
console.log(message.encryption);

# Verify session key exists
const sessionKey = await SecureKeyStorage.getSessionKey(conversationId);
```

### SecureStore not available
```bash
# Check device compatibility
const available = await SecureStore.isAvailableAsync();
console.log('SecureStore available:', available);
```

## Next Steps

1. Read [E2E_ENCRYPTION_SUMMARY.md](./E2E_ENCRYPTION_SUMMARY.md) for full details
2. Read [Backend Implementation](./backend/services/messaging-service/E2E_ENCRYPTION_IMPLEMENTATION.md)
3. Read [Mobile Setup Guide](./apps/mobile-app/ENCRYPTION_SETUP.md)

## Important Notes

⚠️ **PRODUCTION WARNING**: The mobile encryption uses placeholder crypto. Must replace with production libraries before launch!

```bash
# Install production crypto
npm install react-native-libsodium react-native-aes-crypto
```

✅ **MVP READY**: Backend encryption is production-ready
🔧 **NEEDS WORK**: Mobile crypto needs upgrade
📱 **TESTED**: Integration tests pending

Happy coding! 🔐
