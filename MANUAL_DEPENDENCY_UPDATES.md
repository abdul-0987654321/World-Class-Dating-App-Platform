# Manual Dependency Updates Guide

If you prefer to update the package.json files manually, follow these instructions for each service.

## Quick Reference Table

| Service | Add @flamoral/shared | Add axios | Add knex |
|---------|---------------------|-----------|----------|
| messaging-service | ✅ | ✅ | ✅ |
| advertising-service | ✅ | ❌ | ❌ |
| analytics-service | ✅ | ❌ | ✅ |
| api-gateway | ✅ | ❌ | ❌ |
| auth-service | ✅ | ❌ | ✅ |
| matching-service | ✅ | ❌ | ❌ |
| media-service | ✅ | ✅ | ❌ |
| moderation-service | ✅ | ❌ | ❌ |
| notification-service | ✅ | ❌ | ❌ |
| payment-service | ✅ | ❌ | ❌ |
| user-service | ✅ | ✅ | ❌ |

## Detailed Instructions

### 1. messaging-service

**File**: `backend/services/messaging-service/package.json`

In the `dependencies` object, add these THREE entries:
```json
"@flamoral/shared": "*",
"axios": "^1.6.2",
"knex": "^3.1.0"
```

**Note**: Place `@flamoral/shared` as the FIRST dependency for consistency.

---

### 2. advertising-service

**File**: `backend/services/advertising-service/package.json`

In the `dependencies` object, add:
```json
"@flamoral/shared": "*"
```

**Note**: This service already has axios and knex.

---

### 3. analytics-service

**File**: `backend/services/analytics-service/package.json`

In the `dependencies` object, add these TWO entries:
```json
"@flamoral/shared": "*",
"knex": "^3.1.0"
```

---

### 4. api-gateway

**File**: `backend/services/api-gateway/package.json`

In the `dependencies` object, add:
```json
"@flamoral/shared": "*"
```

**Note**: This service already has axios.

---

### 5. auth-service

**File**: `backend/services/auth-service/package.json`

In the `dependencies` object, add these TWO entries:
```json
"@flamoral/shared": "*",
"knex": "^3.1.0"
```

---

### 6. matching-service

**File**: `backend/services/matching-service/package.json`

In the `dependencies` object, add:
```json
"@flamoral/shared": "*"
```

**Note**: This service already has both axios and knex.

---

### 7. media-service

**File**: `backend/services/media-service/package.json`

In the `dependencies` object, add these TWO entries:
```json
"@flamoral/shared": "*",
"axios": "^1.6.2"
```

**Note**: This service already has knex.

---

### 8. moderation-service

**File**: `backend/services/moderation-service/package.json`

In the `dependencies` object, add:
```json
"@flamoral/shared": "*"
```

**Note**: This service already has both axios and knex.

---

### 9. notification-service

**File**: `backend/services/notification-service/package.json`

In the `dependencies` object, add:
```json
"@flamoral/shared": "*"
```

**Note**: This service already has knex.

---

### 10. payment-service

**File**: `backend/services/payment-service/package.json`

In the `dependencies` object, add:
```json
"@flamoral/shared": "*"
```

**Note**: This service already has both axios and knex.

---

### 11. user-service

**File**: `backend/services/user-service/package.json`

In the `dependencies` object, add these TWO entries:
```json
"@flamoral/shared": "*",
"axios": "^1.6.2"
```

**Note**: This service already has knex.

---

## Example: Before and After

### Before (messaging-service)
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.0",
    "cors": "^2.8.5",
    ...
  }
}
```

### After (messaging-service)
```json
{
  "dependencies": {
    "@flamoral/shared": "*",
    "express": "^4.18.2",
    "socket.io": "^4.6.0",
    "cors": "^2.8.5",
    ...
    "axios": "^1.6.2",
    "knex": "^3.1.0"
  }
}
```

## Important Notes

1. **Alphabetical Order**: While not strictly required, it's common practice to keep dependencies in alphabetical order. However, placing `@flamoral/shared` first is fine since `@` comes before letters.

2. **JSON Syntax**: Remember to add commas between entries, except for the last entry.

3. **Version Numbers**: Use the exact versions specified:
   - `@flamoral/shared`: `"*"` (workspace reference)
   - `axios`: `"^1.6.2"`
   - `knex`: `"^3.1.0"`

4. **Validation**: After editing, validate your JSON using a JSON validator or by running:
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('./backend/services/SERVICE_NAME/package.json'))"
   ```

## After Making Changes

1. Save all files
2. Run from the project root:
   ```bash
   npm install
   ```
3. Verify no errors occur
4. Run your build/test commands
5. Commit the changes

## Web App

The `apps/web-app/package.json` already has all required vite/rollup dependencies. No changes needed.
