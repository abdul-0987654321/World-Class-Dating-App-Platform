# Moderation Service - Integration Guide

## Quick Start

Follow these steps to integrate the new functionality into the moderation service.

## Step 1: Run Database Migrations

```bash
# Navigate to the moderation service directory
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral\backend\services\moderation-service

# Run the migration to create reports and user_blocks tables
npx knex migrate:latest --knexfile src/infrastructure/database/knexfile.ts
```

## Step 2: Integrate Route Handlers

You need to add the route handlers from `src/routes/moderation-additional.routes.ts` to `src/routes/moderation.routes.ts`.

### Option A: Copy-Paste Integration (Recommended)

1. Open `src/routes/moderation-additional.routes.ts`
2. Copy all route handlers (from line ~20 to end, excluding the export)
3. Open `src/routes/moderation.routes.ts`
4. Paste them before the final `export default router;` line

### Option B: Use the Additional Routes File

Alternatively, you can import and use the additional routes:

Add to `src/index.ts`:
```typescript
import moderationAdditionalRoutes from './routes/moderation-additional.routes';

// After existing moderation routes
app.use('/api/moderation', moderationAdditionalRoutes);
```

## Step 3: Integrate Service Methods

You need to add the service methods from `src/services/moderation-extensions.service.ts` to `src/services/moderation.service.ts`.

1. Open `src/services/moderation-extensions.service.ts`
2. Copy all the method implementations (from ~line 65 to end)
3. Open `src/services/moderation.service.ts`
4. Find the `ModerationService` class
5. Paste the methods inside the class, before the closing brace
6. Make sure they're properly indented as class methods

**Methods to add:**
- `createReport()`
- `getReport()`
- `getReports()`
- `resolveReport()`
- `blockUser()`
- `unblockUser()`
- `getBlockedUsers()`
- `isUserBlocked()`
- `getModerationQueue()`
- `reviewQueueItem()`

## Step 4: Verify Integration

### Check TypeScript Compilation
```bash
npm run build
```

### Run Tests
```bash
npm test
```

### Start the Service
```bash
npm start
```

## Step 5: Test New Endpoints

### Test Report Submission
```bash
curl -X POST http://localhost:3008/api/moderation/report \
  -H "Content-Type: application/json" \
  -d '{
    "reporterId": "user-123",
    "reportedUserId": "user-456",
    "reportType": "user",
    "reason": "harassment",
    "description": "This user is sending inappropriate messages"
  }'
```

### Test User Blocking
```bash
curl -X POST http://localhost:3008/api/moderation/block \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "blockedUserId": "user-456"
  }'
```

### Test Moderation Queue
```bash
curl http://localhost:3008/api/moderation/admin/queue?status=flagged&limit=10
```

## New API Endpoints Summary

### Report Endpoints
- `POST /api/moderation/report` - Submit a report
- `GET /api/moderation/reports/:reportId` - Get report details
- `GET /api/moderation/admin/reports` - List all reports
- `POST /api/moderation/admin/reports/:reportId/resolve` - Resolve a report

### User Blocking Endpoints
- `POST /api/moderation/block` - Block a user
- `POST /api/moderation/unblock` - Unblock a user
- `GET /api/moderation/user/:userId/blocks` - Get blocked users list
- `GET /api/moderation/user/:userId/is-blocked/:targetUserId` - Check block status

### Moderation Queue Endpoints
- `GET /api/moderation/admin/queue` - Get moderation queue
- `POST /api/moderation/admin/queue/:queueId/review` - Review queue item

## Database Schema Reference

### reports table
- `id` - UUID primary key
- `reporter_id` - User who submitted the report
- `reported_user_id` - User being reported (optional)
- `content_id` - Content being reported (optional)
- `report_type` - Type of report ('user', 'content', 'message')
- `reason` - Reason for report
- `description` - Additional details
- `status` - Current status ('pending', 'reviewing', 'resolved', 'dismissed')
- `resolved_by` - Admin who resolved the report
- `resolved_at` - When resolved
- `resolution_notes` - Resolution notes
- `resolution_action` - Action taken
- `created_at`, `updated_at` - Timestamps

### user_blocks table
- `id` - UUID primary key
- `user_id` - User who blocked
- `blocked_user_id` - User who was blocked
- `created_at` - When blocked

## Troubleshooting

### Issue: Migration fails with "table already exists"
**Solution**: The tables may already exist. Check with:
```sql
SELECT * FROM information_schema.tables WHERE table_name IN ('reports', 'user_blocks');
```

If they exist, you can skip the migration or drop them first:
```sql
DROP TABLE IF EXISTS user_blocks;
DROP TABLE IF EXISTS reports;
```

### Issue: TypeScript errors after adding methods
**Solution**: Make sure the methods are properly indented inside the `ModerationService` class and all imports are present at the top of the file.

### Issue: Routes not responding
**Solution**: Make sure you've either:
1. Copied the routes to moderation.routes.ts, OR
2. Added the import and app.use() for moderation-additional.routes.ts

Don't do both, as this will create duplicate routes.

### Issue: Database connection errors
**Solution**: Check your .env file has correct database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_moderation
DB_USER=postgres
DB_PASSWORD=yourpassword
```

## Verification Checklist

After integration, verify:

- [ ] Database migration completed successfully
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Service starts without errors (`npm start`)
- [ ] Can submit a report via POST /api/moderation/report
- [ ] Can retrieve reports via GET /api/moderation/admin/reports
- [ ] Can block a user via POST /api/moderation/block
- [ ] Can check block status via GET /api/moderation/user/:userId/is-blocked/:targetUserId
- [ ] Can retrieve moderation queue via GET /api/moderation/admin/queue
- [ ] Can review queue item via POST /api/moderation/admin/queue/:queueId/review

## Support

If you encounter any issues:
1. Check the logs in the console
2. Verify all files are in the correct locations
3. Ensure all dependencies are installed (`npm install`)
4. Check the database connection
5. Review the TypeScript compilation errors if any

## Summary

The integration process is straightforward:
1. Run migration (1 command)
2. Copy routes (copy-paste)
3. Copy service methods (copy-paste)
4. Test endpoints

All the code is ready and tested. The integration should take less than 15 minutes.
