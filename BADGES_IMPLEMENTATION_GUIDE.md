# Interest & Intention Badges Implementation Guide

## Overview
This document provides a comprehensive guide for the Interest and Intention Badges feature implementation in the dating app. This feature allows users to display their hobbies/interests and relationship intentions on their profiles, improving match quality and user compatibility.

## Features Implemented

### Interest Badges (30+ badges)
Users can select multiple interest badges that represent their hobbies and activities:

**Categories:**
- **Lifestyle:** Memes, Houseplants, Coffee, Wine, Meditation, Astrology
- **Sports & Fitness:** Fitness, Yoga, Hiking, Sports, Skiing, Beach
- **Arts & Culture:** Photography, Music, Art, Reading, Movies, Podcasts
- **Food & Drink:** Cooking, Brunch, Mocktails
- **Entertainment:** Gaming, Dancing, Board Games, Karaoke, Festivals
- **Outdoor:** Travel, Camping
- **Social:** Volunteering, Animals
- **Tech & Other:** Tech, Fashion, DIY

### Intention Badges (8 badges, max 2 per user)
Users can select up to 2 relationship intention badges with priority (primary/secondary):

1. **Fun casual dates** - Looking for casual, no-pressure dates
2. **Intimacy without commitment** - Physical intimacy without commitment
3. **Life partner** - Searching for someone to build a life with
4. **Ethical non-monogamy** - Consensual non-monogamous relationships
5. **Not sure yet** - Still figuring out what they want
6. **Long-term relationship** - Serious, committed relationship
7. **Marriage** - Looking for a partner with marriage intention
8. **Something serious** - Meaningful and committed, not rushing to marriage

---

## Architecture

### Database Schema

#### Tables Created

**1. `interest_badges`** - Master list of interest badges
```sql
- id (UUID, PK)
- name (VARCHAR(100), UNIQUE)
- slug (VARCHAR(100), UNIQUE)
- icon (VARCHAR(50))
- category (ENUM)
- display_order (INTEGER)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

**2. `intention_badges`** - Master list of intention badges
```sql
- id (UUID, PK)
- name (VARCHAR(100), UNIQUE)
- slug (VARCHAR(100), UNIQUE)
- icon (VARCHAR(50))
- description (TEXT)
- display_order (INTEGER)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

**3. `user_interest_badges`** - Junction table for user interest selections
```sql
- id (UUID, PK)
- user_id (UUID, FK to users)
- badge_id (UUID, FK to interest_badges)
- selected_at (TIMESTAMP)
- UNIQUE(user_id, badge_id)
```

**4. `user_intention_badges`** - Junction table for user intention selections (max 2)
```sql
- id (UUID, PK)
- user_id (UUID, FK to users)
- badge_id (UUID, FK to intention_badges)
- priority (INTEGER, 1 or 2)
- selected_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- UNIQUE(user_id, badge_id)
- UNIQUE(user_id, priority)
```

#### Views Created

- `v_interest_badge_popularity` - Shows popularity statistics for interest badges
- `v_intention_badge_distribution` - Shows distribution statistics for intention badges
- `v_user_badges_profile` - Quick lookup for user's complete badge profile

#### Functions Created

- `get_user_interest_badges(user_id)` - Retrieve user's interest badges
- `get_user_intention_badges(user_id)` - Retrieve user's intention badges
- `count_shared_interest_badges(user1_id, user2_id)` - Count shared interests
- `check_intention_compatibility(user1_id, user2_id)` - Check intention match

---

## Backend Implementation

### User Service

#### Location: `backend/services/user-service/`

**1. Entities** - `src/domain/entities/InterestIntentionBadge.entity.ts`
- Defines TypeScript interfaces for badges
- DTOs for updating badges
- Response types with populated data

**2. Repository** - `src/domain/repositories/interestIntentionBadge.repository.ts`
- Database access layer
- CRUD operations for badges
- Matching helper functions

**3. Service** - `src/domain/services/interestIntentionBadge.service.ts`
- Business logic for badge operations
- Validation and error handling
- Analytics functions

**4. Controller** - `src/api/controllers/interestIntentionBadge.controller.ts`
- HTTP request handlers
- Request validation
- Response formatting

**5. Routes** - `src/api/routes/interestIntentionBadge.routes.ts`
- API endpoint definitions
- Middleware application
- Swagger documentation

**6. Validators** - `src/api/validators/interestIntentionBadge.validator.ts`
- Joi validation schemas
- Request body validation
- Parameter validation

### API Endpoints

#### Get Available Badges
```http
GET /api/badges/interests
GET /api/badges/interests/category/:category
GET /api/badges/intentions
```

#### Get User's Badges
```http
GET /api/badges/users/me
GET /api/badges/users/:userId
GET /api/badges/users/me/interests
GET /api/badges/users/me/intentions
```

#### Update User's Badges
```http
PUT /api/badges/users/me/interests
Body: { badge_ids: ["uuid1", "uuid2", ...] }

PUT /api/badges/users/me/intentions
Body: {
  badges: [
    { badge_id: "uuid1", priority: 1 },
    { badge_id: "uuid2", priority: 2 }
  ]
}
```

#### Individual Badge Operations
```http
POST /api/badges/users/me/interests/add
DELETE /api/badges/users/me/interests/:badgeId
POST /api/badges/users/me/intentions/add
DELETE /api/badges/users/me/intentions/:badgeId
```

#### Analytics
```http
GET /api/badges/analytics/interests/popularity
GET /api/badges/analytics/intentions/distribution
```

### Matching Service

#### Location: `backend/services/matching-service/`

**Badge Matching Service** - `src/domain/services/badge-matching.service.ts`

Features:
- Calculate badge compatibility scores (0-100)
- Count shared interest badges
- Check intention compatibility
- Filter candidates by badges
- Boost match scores based on badge compatibility

**Scoring Algorithm:**
- Interest badges: Jaccard similarity + shared badge bonus
- Intention badges: Priority-weighted matching
- Match score boost: Up to +20 points for high badge compatibility

---

## Frontend Implementation

### Location: `apps/web-app/src/components/badges/`

### Components

**1. BadgeDisplay.tsx**
- Displays selected badges on profiles
- Supports both interest and intention badges
- Configurable size (sm, md, lg)
- Shows limited count with "+X more" indicator
- Color-coded by badge type

**Props:**
```typescript
{
  badges: Badge[]
  type: 'interest' | 'intention'
  showCount?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}
```

**2. BadgeSelector.tsx**
- Interactive badge selection interface
- Search functionality
- Category filtering (for interests)
- Max selection enforcement
- Visual feedback for selection state

**Props:**
```typescript
{
  type: 'interest' | 'intention'
  availableBadges: Badge[]
  selectedBadges: Badge[]
  onSelect: (badges: Badge[]) => void
  maxSelections?: number
  searchable?: boolean
  categorized?: boolean
}
```

**3. BadgeFilter.tsx**
- Filtering interface for discovery/search
- Dropdown with badge selection
- Active filter count display
- Clear all functionality

**Props:**
```typescript
{
  type: 'interest' | 'intention'
  availableBadges: Badge[]
  selectedBadges: string[]
  onFilterChange: (badgeIds: string[]) => void
}
```

### Usage Examples

#### Profile Setup/Edit
```tsx
import { BadgeSelector } from '@/components/badges';

<BadgeSelector
  type="interest"
  availableBadges={interestBadges}
  selectedBadges={userInterests}
  onSelect={setUserInterests}
  maxSelections={20}
/>

<BadgeSelector
  type="intention"
  availableBadges={intentionBadges}
  selectedBadges={userIntentions}
  onSelect={setUserIntentions}
  maxSelections={2}
/>
```

#### Profile Display
```tsx
import { BadgeDisplay } from '@/components/badges';

<BadgeDisplay
  badges={user.interest_badges}
  type="interest"
  showCount={5}
  size="md"
/>

<BadgeDisplay
  badges={user.intention_badges}
  type="intention"
  showCount={2}
  size="lg"
/>
```

#### Discovery Filters
```tsx
import { BadgeFilter } from '@/components/badges';

<BadgeFilter
  type="interest"
  availableBadges={interestBadges}
  selectedBadges={filterInterests}
  onFilterChange={setFilterInterests}
/>

<BadgeFilter
  type="intention"
  availableBadges={intentionBadges}
  selectedBadges={filterIntentions}
  onFilterChange={setFilterIntentions}
/>
```

---

## Migration & Deployment

### Database Migration

**File:** `database/migrations/20251202_create_badges_tables.sql`

**Run Migration:**
```bash
# Navigate to database directory
cd database

# Run migration (adjust connection details)
psql -h localhost -U flamoral_user -d flamoral_db -f migrations/20251202_create_badges_tables.sql
```

### Seed Data
- 34 interest badges pre-seeded across 9 categories
- 8 intention badges pre-seeded with descriptions
- All badges active by default

### Verification
```sql
-- Check badge counts
SELECT COUNT(*) FROM interest_badges;  -- Should return 34
SELECT COUNT(*) FROM intention_badges; -- Should return 8

-- Check seed data
SELECT category, COUNT(*) FROM interest_badges GROUP BY category;
SELECT name, description FROM intention_badges;
```

---

## Integration Points

### Profile Setup Flow
1. User registration → Basic info
2. Photo upload
3. **Badge selection** (NEW)
   - Select interests (optional, up to 20)
   - Select intentions (optional, up to 2)
4. Preferences setup
5. Complete profile

### Profile Edit
- Add "Interests & Intentions" section
- Allow editing at any time
- Show current selections
- Use BadgeSelector components

### Profile Display
- Show badges prominently on profile cards
- Display in profile detail view
- Use BadgeDisplay component
- Show shared badges on match screen

### Discovery/Search
- Add badge filters to advanced filters
- Filter by specific interests
- Filter by compatible intentions
- Use BadgeFilter components

### Matching Algorithm Enhancement
- Include badge compatibility in match scoring
- Boost scores for shared interests
- Prioritize compatible intentions
- Weight: ~15-20% of total match score

---

## Best Practices

### Data Handling
- Always validate badge IDs before database operations
- Enforce max selections (20 for interests, 2 for intentions)
- Handle null/empty badge arrays gracefully
- Cache badge master lists to reduce database queries

### UX Considerations
- Make badge selection optional but encouraged
- Show badge benefits during onboarding
- Allow easy editing of badges
- Display shared badges prominently on match cards
- Use color coding to distinguish badge types

### Performance
- Index all foreign keys
- Use batch queries for badge lookups
- Cache user badge profiles
- Paginate badge lists in selectors

### Privacy
- All users can see all badges on profiles
- No sensitive information in badge selections
- Consider hiding intentions for free users (premium feature)

---

## Testing

### Backend Tests
```bash
cd backend/services/user-service
npm test -- badges
```

**Test Coverage:**
- Badge CRUD operations
- Validation (max selections, unique constraints)
- Shared badge counting
- Compatibility checking
- Filter building

### Frontend Tests
```bash
cd apps/web-app
npm test -- badges
```

**Test Coverage:**
- Component rendering
- Badge selection/deselection
- Search functionality
- Category filtering
- Max selection enforcement

### Integration Tests
- End-to-end badge selection flow
- Profile display with badges
- Discovery filtering by badges
- Match scoring with badges

---

## Monitoring & Analytics

### Metrics to Track
- Badge selection rate (% of users with badges)
- Most popular interest badges
- Intention badge distribution
- Average shared badges per match
- Match score improvement with badges

### Analytics Queries
```sql
-- Badge adoption rate
SELECT
  COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(*) FROM users) as adoption_rate
FROM user_interest_badges;

-- Top 10 interest badges
SELECT * FROM v_interest_badge_popularity LIMIT 10;

-- Intention badge distribution
SELECT * FROM v_intention_badge_distribution;
```

---

## Future Enhancements

### Potential Features
1. **Custom Badges** - Allow premium users to create custom badges
2. **Badge Verification** - Verify certain interests with photos/activities
3. **Badge Matching Events** - Events based on shared interests
4. **Badge Challenges** - Gamification around trying new interests
5. **Seasonal Badges** - Limited-time badges for holidays/events
6. **Badge Stories** - Short stories/posts about interests
7. **Badge-based Icebreakers** - Conversation starters from shared badges
8. **Badge Recommendations** - Suggest badges based on profile

### Scalability Considerations
- Implement caching layer for badge data
- Add CDN for badge icons/images
- Consider NoSQL for badge analytics
- Implement badge sync across services

---

## Support & Maintenance

### Common Issues

**Issue:** User can't select more badges
**Solution:** Check if max limit reached (20 for interests, 2 for intentions)

**Issue:** Badges not displaying on profile
**Solution:** Verify badge IDs exist in database, check is_active flag

**Issue:** Intention badge validation error
**Solution:** Ensure priorities are unique (1 or 2) and max 2 badges

### Database Maintenance
```sql
-- Clean up orphaned badge selections
DELETE FROM user_interest_badges
WHERE badge_id NOT IN (SELECT id FROM interest_badges WHERE is_active = TRUE);

-- Update badge display orders
UPDATE interest_badges SET display_order = display_order + 10
WHERE category = 'lifestyle';
```

---

## Files Created/Modified

### Database
- ✅ `database/migrations/20251202_create_badges_tables.sql`

### Backend - User Service
- ✅ `backend/services/user-service/src/domain/entities/InterestIntentionBadge.entity.ts`
- ✅ `backend/services/user-service/src/domain/repositories/interestIntentionBadge.repository.ts`
- ✅ `backend/services/user-service/src/domain/services/interestIntentionBadge.service.ts`
- ✅ `backend/services/user-service/src/api/controllers/interestIntentionBadge.controller.ts`
- ✅ `backend/services/user-service/src/api/routes/interestIntentionBadge.routes.ts`
- ✅ `backend/services/user-service/src/api/validators/interestIntentionBadge.validator.ts`
- ⚠️ `backend/services/user-service/src/index.ts` (modified to add routes)

### Backend - Matching Service
- ✅ `backend/services/matching-service/src/domain/services/badge-matching.service.ts`

### Frontend - Web App
- ✅ `apps/web-app/src/components/badges/BadgeDisplay.tsx`
- ✅ `apps/web-app/src/components/badges/BadgeSelector.tsx`
- ✅ `apps/web-app/src/components/badges/BadgeFilter.tsx`
- ✅ `apps/web-app/src/components/badges/index.ts`

---

## Quick Start Checklist

- [ ] Run database migration
- [ ] Verify seed data loaded correctly
- [ ] Start user-service and matching-service
- [ ] Test API endpoints with Postman/curl
- [ ] Integrate BadgeSelector in profile setup
- [ ] Integrate BadgeDisplay in profile views
- [ ] Add BadgeFilter to discovery/search
- [ ] Test end-to-end flow
- [ ] Monitor badge adoption metrics
- [ ] Gather user feedback

---

## Contact & Resources

**Documentation:**
- API Docs: `/api-docs` (Swagger)
- Database Schema: `DATABASE_SCHEMA.md`
- Architecture: `ARCHITECTURE.md`

**Support:**
- Backend issues: User Service team
- Frontend issues: Web App team
- Database issues: Infrastructure team

---

*Last Updated: 2025-12-02*
*Version: 1.0.0*
