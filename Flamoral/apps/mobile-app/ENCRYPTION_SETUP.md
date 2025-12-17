# Mobile App Encryption Setup Guide

## Overview

This guide explains how to set up and use end-to-end encryption in the mobile app.

## Installation

### Required Dependencies

Add these dependencies to your `package.json`:

```json
{
  "dependencies": {
    "expo-crypto": "~13.0.0",
    "expo-secure-store": "~13.0.0",
    "buffer": "^6.0.3"
  }
}
```

Install dependencies:
```bash
cd apps/mobile-app
npm install
```

### Production Crypto Libraries (Required for Production)

For production, replace placeholder crypto with proper libraries:

```bash
npm install @react-native-community/netinfo
npm install react-native-aes-crypto
npm install react-native-libsodium
```

## File Structure

```
src/
├── services/
│   └── encryption/
│       ├── EncryptionService.ts      # Core encryption service
│       ├── SecureKeyStorage.ts       # Secure key storage
│       └── index.ts                  # Exports
├── hooks/
│   └── encryption/
│       ├── useEncryption.ts          # Encryption initialization hook
│       ├── useMessageEncryption.ts   # Message encryption hook
│       └── index.ts                  # Exports
└── services/
    └── api/
        └── encryptionKeysAPI.ts      # API client for key management
```

## Usage

### 1. Initialize Encryption on App Start

```typescript
import { useEncryption } from './hooks/encryption';

function App() {
  const { status, initializeEncryption } = useEncryption();

  useEffect(() => {
    // Encryption auto-initializes when user is authenticated
    // Or manually initialize:
    initializeEncryption();
  }, []);

  if (status.isLoading) {
    return <LoadingScreen message="Initializing encryption..." />;
  }

  if (status.error) {
    return <ErrorScreen message={status.error} />;
  }

  return <MainApp />;
}
```

### 2. Send Encrypted Message

```typescript
import { useMessageEncryption } from './hooks/encryption';

function ChatScreen({ conversationId }) {
  const { prepareMessageForSending, encryptionStatus } = useMessageEncryption();
  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    // Encrypt message
    const encrypted = await prepareMessageForSending(message, conversationId);

    // Send to server
    await messagingAPI.sendMessage({
      conversationId,
      receiverId,
      content: encrypted.content,
      encryption: encrypted.encryption,
    });

    setMessage('');
  };

  return (
    <View>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Type a message..."
      />
      <Button
        title={encryptionStatus.isInitialized ? "Send Encrypted" : "Send"}
        onPress={sendMessage}
      />
    </View>
  );
}
```

### 3. Decrypt Received Messages

```typescript
import { useMessageEncryption } from './hooks/encryption';

function MessageItem({ message }) {
  const { decryptReceivedMessage } = useMessageEncryption();
  const [decryptedText, setDecryptedText] = useState('');

  useEffect(() => {
    const decrypt = async () => {
      const plaintext = await decryptReceivedMessage(message);
      setDecryptedText(plaintext);
    };

    decrypt();
  }, [message]);

  return (
    <View>
      <Text>{decryptedText}</Text>
      {message.encryption?.isEncrypted && (
        <Icon name="lock" size={12} color="green" />
      )}
    </View>
  );
}
```

### 4. Decrypt Conversation History

```typescript
import { useMessageEncryption } from './hooks/encryption';

function ConversationScreen({ conversationId }) {
  const { decryptMessages, isProcessing } = useMessageEncryption();
  const [messages, setMessages] = useState([]);
  const [decryptedMessages, setDecryptedMessages] = useState(new Map());

  useEffect(() => {
    const loadAndDecrypt = async () => {
      // Fetch messages
      const fetchedMessages = await messagingAPI.getMessages(conversationId);
      setMessages(fetchedMessages);

      // Decrypt all messages
      const decrypted = await decryptMessages(fetchedMessages);
      setDecryptedMessages(decrypted);
    };

    loadAndDecrypt();
  }, [conversationId]);

  return (
    <FlatList
      data={messages}
      renderItem={({ item }) => (
        <MessageItem
          message={item}
          decryptedText={decryptedMessages.get(item.id)}
        />
      )}
    />
  );
}
```

## API Integration

### Upload Encryption Keys

```typescript
import { encryptionKeysAPI } from './services/api/encryptionKeysAPI';

// After generating keys
const result = await encryptionKeysAPI.uploadKeys({
  identityKey: { publicKey: keys.identityKey.publicKey },
  signedPreKey: {
    keyId: keys.signedPreKey.keyId,
    publicKey: keys.signedPreKey.publicKey,
    signature: keys.signedPreKey.signature,
    timestamp: keys.signedPreKey.timestamp,
  },
  oneTimePreKeys: keys.oneTimePreKeys.map(key => ({
    keyId: key.keyId,
    publicKey: key.publicKey,
  })),
});
```

### Get User's Public Keys

```typescript
// Before starting a new conversation
const result = await encryptionKeysAPI.getUserKeys(otherUserId);

if (result.success && result.data) {
  const { identityKey, signedPreKey, oneTimePreKeys } = result.data;
  // Use these to establish session
}
```

## Security Best Practices

### 1. Key Storage

- **NEVER** log private keys
- **NEVER** send private keys to server
- Store only in Expo SecureStore
- Clear keys on logout

```typescript
// Good
await SecureKeyStorage.storeIdentityKey(userId, keyPair);

// Bad - NEVER DO THIS
console.log('Private key:', keyPair.privateKey);
fetch('/api/keys', { body: { privateKey: keyPair.privateKey } });
```

### 2. Message Handling

- Always encrypt before sending
- Always decrypt before displaying
- Handle encryption failures gracefully

```typescript
// Good
try {
  const encrypted = await prepareMessageForSending(text, conversationId);
  await sendMessage(encrypted);
} catch (error) {
  console.error('Encryption failed:', error);
  // Show user-friendly error
  Alert.alert('Unable to send', 'Please check your connection');
}

// Bad - sending plaintext
await sendMessage({ content: text }); // No encryption!
```

### 3. Error Handling

```typescript
const { decryptReceivedMessage } = useMessageEncryption();

const plaintext = await decryptReceivedMessage(message);

if (plaintext.startsWith('[Encrypted message -')) {
  // Decryption failed - show appropriate UI
  return <Text>Unable to decrypt message</Text>;
}
```

## Encryption Indicators

Show users when messages are encrypted:

```typescript
function MessageItem({ message }) {
  const isEncrypted = message.encryption?.isEncrypted === true;

  return (
    <View style={styles.message}>
      <Text>{decryptedText}</Text>
      {isEncrypted && (
        <View style={styles.encryptionBadge}>
          <Icon name="lock" size={14} color="#00AA00" />
          <Text style={styles.encryptedLabel}>Encrypted</Text>
        </View>
      )}
    </View>
  );
}
```

## Debugging

### Check Encryption Status

```typescript
const { status } = useEncryption();

console.log('Encryption initialized:', status.isInitialized);
console.log('Loading:', status.isLoading);
console.log('Error:', status.error);
```

### Verify Keys Are Stored

```typescript
const hasKeys = await SecureKeyStorage.hasKeys(userId);
console.log('User has encryption keys:', hasKeys);

const identityKey = await SecureKeyStorage.getIdentityKey(userId);
console.log('Identity key exists:', !!identityKey);
```

### Test Encryption/Decryption

```typescript
// Test round-trip
const sessionKey = await EncryptionService.generateSessionKey();
const encrypted = await EncryptionService.encryptMessage('Hello!', sessionKey);
const decrypted = await EncryptionService.decryptMessage(encrypted, sessionKey);

console.log('Decrypted matches original:', decrypted === 'Hello!');
```

## Migration Path for Production

### Step 1: Install Production Crypto Libraries

```bash
npm install react-native-libsodium react-native-aes-crypto
cd ios && pod install && cd ..
```

### Step 2: Replace Placeholder Crypto

Update `EncryptionService.ts`:

```typescript
import { crypto_box_keypair } from 'react-native-libsodium';
import AES from 'react-native-aes-crypto';

async generateIdentityKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto_box_keypair();
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

async encryptMessage(plaintext: string, sessionKey: string) {
  const iv = await generateRandomBytes(12);
  const ciphertext = await AES.encrypt(
    plaintext,
    sessionKey,
    iv,
    'aes-256-gcm'
  );
  return { ciphertext, iv, authTag: ciphertext.authTag };
}
```

### Step 3: Update Key Storage Format

```typescript
// Add key versioning for migration
interface StoredKey {
  version: number;
  key: string;
  algorithm: 'x25519' | 'ed25519';
}
```

## Common Issues

### 1. "Encryption not initialized"

**Solution:** Wait for encryption to initialize before sending messages

```typescript
const { status } = useEncryption();

if (!status.isInitialized) {
  return <LoadingScreen />;
}
```

### 2. "Failed to decrypt message"

**Possible causes:**
- Session key mismatch
- Corrupted message
- Wrong decryption key

**Solution:** Re-establish session or request sender to resend

### 3. SecureStore errors on Android

**Solution:** Ensure Android Keystore is available

```typescript
import * as SecureStore from 'expo-secure-store';

const isAvailable = await SecureStore.isAvailableAsync();
if (!isAvailable) {
  Alert.alert('Secure storage not available on this device');
}
```

## Testing

### Unit Tests

```bash
npm test -- encryption
```

### Integration Tests

```typescript
import { EncryptionService } from './services/encryption';

describe('Encryption Service', () => {
  it('should encrypt and decrypt message', async () => {
    const plaintext = 'Hello, World!';
    const sessionKey = await EncryptionService.generateSessionKey();

    const encrypted = await EncryptionService.encryptMessage(
      plaintext,
      sessionKey
    );

    const decrypted = await EncryptionService.decryptMessage(
      encrypted,
      sessionKey
    );

    expect(decrypted).toBe(plaintext);
  });
});
```

## Support

For issues or questions:
1. Check console logs for errors
2. Verify encryption status
3. Check network connectivity
4. Contact support with encryption version number

## License

This encryption implementation is part of the Flamoral dating app platform.
