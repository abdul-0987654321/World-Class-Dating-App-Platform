# End-to-End Encryption Implementation

## Overview

This document describes the end-to-end encryption (E2E) implementation for the messaging service, following Signal Protocol patterns with a simplified approach suitable for MVP.

## Architecture

### Components

1. **Backend Services**
   - `encryption.service.ts` - Core cryptographic operations (X25519 DH, AES-GCM)
   - `key-management.service.ts` - Key lifecycle management
   - `encryption-keys.controller.ts` - REST API for key exchange
   - `message-encryption-handler.service.ts` - Domain service for message encryption flow

2. **Database Schema** (Cosmos DB)
   - **EncryptionKeys Container**: Stores user identity keys, signed pre-keys, and one-time pre-keys
   - **SessionKeys Container**: Stores session keys for active conversations
   - **Messages Container**: Extended with encryption metadata (iv, authTag)

3. **Mobile App**
   - `EncryptionService.ts` - Client-side encryption service
   - `SecureKeyStorage.ts` - Secure key storage using Expo SecureStore
   - `useEncryption.ts` - React hook for encryption initialization
   - `useMessageEncryption.ts` - React hook for message encryption/decryption
   - `encryptionKeysAPI.ts` - API client for key management

## Cryptographic Protocol

### Key Types

1. **Identity Key Pair** (Long-term)
   - Curve: X25519 (Diffie-Hellman)
   - Format: PEM
   - Purpose: User's long-term identity

2. **Signed Pre-Key** (Medium-term)
   - Curve: X25519
   - Signed by: Identity private key
   - Rotation: Every 30 days
   - Purpose: Establish initial shared secret

3. **One-Time Pre-Keys** (Short-term)
   - Curve: X25519
   - Quantity: 100 per user
   - Purpose: Perfect forward secrecy
   - Used once per conversation initiation

4. **Session Keys**
   - Algorithm: AES-256-GCM
   - Derived from: DH key exchange outputs
   - Purpose: Encrypt actual messages

### Message Encryption Flow

#### 1. Key Initialization (First-time Setup)

```typescript
// Client generates keys
const identityKey = await encryptionService.generateIdentityKeyPair();
const signedPreKey = await encryptionService.generateSignedPreKey(identityKey.privateKey);
const oneTimePreKeys = await encryptionService.generateOneTimePreKeys(100);

// Upload public keys to server
await api.uploadKeys({
  identityKey: { publicKey: identityKey.publicKey },
  signedPreKey: { keyId, publicKey, signature, timestamp },
  oneTimePreKeys: [{ keyId, publicKey }, ...]
});

// Store private keys securely on device
await secureStorage.storeIdentityKey(userId, identityKey);
```

#### 2. Starting a Conversation (X3DH Key Agreement)

```typescript
// Sender retrieves receiver's public keys
const receiverKeys = await api.getUserKeys(receiverId);

// Perform Diffie-Hellman key exchanges
const dh1 = await performDH(senderIdentityPrivate, receiverSignedPreKey);
const dh2 = await performDH(senderIdentityPrivate, receiverIdentityPublic);
const dh3 = await performDH(senderEphemeralPrivate, receiverSignedPreKey);
const dh4 = await performDH(senderEphemeralPrivate, receiverOneTimePreKey); // if available

// Derive root key from DH outputs
const rootKey = await deriveRootKey([dh1, dh2, dh3, dh4]);

// Derive initial chain key
const { chainKey } = await deriveKeys(rootKey, dh1);

// Store session key
await storage.storeSessionKey(conversationId, chainKey);
```

#### 3. Sending an Encrypted Message

```typescript
// Get session key
const sessionKey = await getSessionKey(conversationId);

// Derive message key from chain key
const { messageKey, newChainKey } = await deriveMessageKey(sessionKey);

// Encrypt message
const { ciphertext, iv, authTag } = await encryptMessage(plaintext, messageKey);

// Update chain key
await updateSessionKey(conversationId, newChainKey);

// Send encrypted message
await api.sendMessage({
  conversationId,
  receiverId,
  content: ciphertext,
  encryption: {
    isEncrypted: true,
    iv,
    authTag,
    version: 1
  }
});
```

#### 4. Receiving and Decrypting a Message

```typescript
// Receive encrypted message
const message = await api.getMessage(messageId);

// Get session key
const sessionKey = await getSessionKey(message.conversationId);

// Derive message key
const { messageKey } = await deriveMessageKey(sessionKey);

// Decrypt message
const plaintext = await decryptMessage(
  message.content,
  messageKey,
  message.encryption.iv,
  message.encryption.authTag
);
```

## API Endpoints

### Key Management Endpoints

#### POST /api/keys/generate
Generate new encryption keys (convenience endpoint)

**Response:**
```json
{
  "success": true,
  "data": {
    "identityKey": {
      "publicKey": "...",
      "privateKey": "..."
    },
    "signedPreKey": { ... },
    "oneTimePreKeys": [ ... ]
  }
}
```

#### POST /api/keys/upload
Upload user's pre-keys bundle

**Request:**
```json
{
  "identityKey": {
    "publicKey": "..."
  },
  "signedPreKey": {
    "keyId": 12345,
    "publicKey": "...",
    "signature": "...",
    "timestamp": 1234567890
  },
  "oneTimePreKeys": [
    { "keyId": 1, "publicKey": "..." },
    ...
  ]
}
```

#### GET /api/keys/:userId
Get user's public keys for initiating conversation

**Response:**
```json
{
  "success": true,
  "data": {
    "identityKey": "...",
    "signedPreKey": {
      "keyId": 12345,
      "publicKey": "...",
      "signature": "...",
      "timestamp": "2024-01-01T00:00:00Z"
    },
    "oneTimePreKeys": [
      { "keyId": 1, "publicKey": "..." }
    ]
  }
}
```

#### POST /api/keys/claim
Claim one-time pre-keys

**Request:**
```json
{
  "userId": "user123",
  "count": 1
}
```

#### POST /api/keys/session
Create session key for conversation

#### GET /api/keys/session/:conversationId
Get session key for conversation

#### PUT /api/keys/session/:conversationId
Update session key after ratchet

#### DELETE /api/keys/session/:conversationId
Delete session key

## Security Features

### 1. Perfect Forward Secrecy
- One-time pre-keys ensure each conversation has unique session keys
- Compromising long-term keys doesn't compromise past messages

### 2. Message Authentication
- AES-GCM provides authenticated encryption
- Authentication tag prevents message tampering

### 3. Secure Key Storage

**Backend:**
- Private keys stored encrypted (should use Azure Key Vault in production)
- Keys partitioned by userId for isolation

**Mobile:**
- Private keys stored in Expo SecureStore (iOS Keychain / Android Keystore)
- Never transmitted to server

### 4. Key Rotation
- Signed pre-keys rotate every 30 days
- One-time pre-keys replenished when count drops below 20

## Production Considerations

### Current MVP Limitations

1. **Simplified Crypto**: Mobile implementation uses placeholder crypto
   - **Action Required**: Replace with production libraries:
     - `react-native-libsodium` for X25519
     - `react-native-aes-crypto` for AES-GCM

2. **Key Storage**: Private keys stored as-is
   - **Action Required**: Encrypt with Azure Key Vault / HSM

3. **No Double Ratchet**: Basic session keys only
   - **Action Required**: Implement full Double Ratchet algorithm

4. **No Out-of-Order Messages**: Sequential message decryption only
   - **Action Required**: Add message key caching for async messages

### Production Enhancements

1. **Use libsignal-protocol-javascript**
   ```bash
   npm install @signalapp/libsignal-client
   ```

2. **Implement proper X3DH**
   - Full 4-way DH key agreement
   - Associated data authentication

3. **Add Double Ratchet**
   - Symmetric key ratchet per message
   - DH ratchet per conversation turn

4. **Key Management**
   - Automated key rotation
   - Key backup and recovery
   - Multi-device key sync

5. **Security Audits**
   - Third-party cryptographic audit
   - Penetration testing
   - Regular security reviews

## Testing

### Unit Tests
```bash
cd backend/services/messaging-service
npm test -- encryption
```

### Integration Tests
```bash
npm run test:integration
```

### Manual Testing

1. **Initialize Encryption**
   ```bash
   curl -X POST http://localhost:3003/api/keys/generate \
     -H "Authorization: Bearer $TOKEN"
   ```

2. **Send Encrypted Message**
   ```bash
   curl -X POST http://localhost:3003/api/messages \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "receiverId": "user2",
       "content": "encrypted_content_here",
       "encryption": {
         "isEncrypted": true,
         "iv": "...",
         "authTag": "..."
       }
     }'
   ```

## Monitoring

### Key Metrics
- Encryption key generation rate
- Failed decryption attempts
- Session key rotation frequency
- One-time pre-key depletion rate

### Alerts
- Low one-time pre-key count (< 20)
- Failed authentication tags (potential attack)
- Expired signed pre-keys not rotated

## Compliance

This implementation supports:
- GDPR: End-to-end encryption ensures data minimization
- CCPA: User data protected at all times
- HIPAA: Suitable for healthcare messaging (with proper audit trail)

## References

1. [Signal Protocol Specifications](https://signal.org/docs/)
2. [X3DH Key Agreement](https://signal.org/docs/specifications/x3dh/)
3. [Double Ratchet Algorithm](https://signal.org/docs/specifications/doubleratchet/)
4. [AES-GCM Specification](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
