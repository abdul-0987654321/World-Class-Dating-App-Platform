# Travel Mode Feature - Visual Overview

## Feature Highlights

### 1. Core Travel Mode
```
┌─────────────────────────────────────────┐
│  TRAVEL MODE                            │
│  ═══════════════════════════════════    │
│                                         │
│  ✈️  Set Your Destination               │
│      Paris, France                      │
│      📅 Jun 15 - Jun 22, 2025           │
│                                         │
│  👥 Match Preferences:                  │
│      ✓ Match with locals                │
│      ✓ Match with travelers             │
│                                         │
│  📍 Your profile will show:             │
│      "Traveling to Paris 🗼"            │
│                                         │
│  [  Save Travel Plan  ]                 │
└─────────────────────────────────────────┘
```

### 2. Profile Badge Display
```
┌───────────────────────────┐
│  👤 Profile Card          │
│  ┌─────────────────────┐  │
│  │                     │  │
│  │     [Photo]         │  │
│  │                     │  │
│  └─────────────────────┘  │
│                           │
│  ✈️ Traveling to Paris    │
│     (Jun 15-22)           │
│                           │
│  Sarah, 28                │
│  Love exploring new       │
│  cities and cultures!     │
│                           │
│  ❤️    ✕    ⭐            │
└───────────────────────────┘
```

### 3. Discovery Integration
```
Discovery Algorithm Flow:
═══════════════════════════

User Location Check
        │
        ├── Is Traveling? ──► YES ──► Use Destination Location
        │                              │
        └── NO ──► Use Home Location   │
                                       │
                    ┌──────────────────┘
                    ▼
            Search Profiles in Location
                    │
                    ├── User Preferences
                    │   │
                    │   ├── Match with locals only?
                    │   ├── Match with travelers only?
                    │   └── Match with both?
                    │
                    ▼
            Apply Filters & Return Profiles
                    │
                    ▼
            Show in Swipe Stack
```

### 4. Premium Tiers Comparison

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│   Feature    │     FREE     │   PREMIUM    │ PREMIUM PLUS │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ Travel Mode  │      ✓       │      ✓       │      ✓       │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ Destinations │      1       │      3       │  Unlimited   │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ Travel Badge │      ✓       │      ✓       │      ✓       │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ Travel       │              │              │              │
│ History      │   Basic      │   Detailed   │   Advanced   │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ Match Before │              │              │              │
│ Arrival      │      ✓       │      ✓       │      ✓       │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ Passport     │              │              │              │
│ (Location    │      ✗       │      ✗       │      ✓       │
│ Change)      │              │              │              │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ Priority     │              │              │              │
│ in Dest.     │      ✗       │      ✓       │      ✓       │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### 5. Passport Feature (Premium Plus)
```
┌─────────────────────────────────────────┐
│  🌍 PASSPORT                            │
│  ═══════════════════════════════════    │
│                                         │
│  Change your location anywhere!         │
│                                         │
│  Current Virtual Location:              │
│  📍 Tokyo, Japan                        │
│                                         │
│  [🔍 Search New Location]               │
│                                         │
│  Recent Locations:                      │
│  • Paris, France (24 matches)           │
│  • London, UK (18 matches)              │
│  • New York, USA (31 matches)           │
│                                         │
│  This Month: 12 changes                 │
│  ✓ Unlimited changes available          │
└─────────────────────────────────────────┘
```

### 6. Travel Schedule View
```
┌─────────────────────────────────────────┐
│  MY TRAVELS                             │
│  ═══════════════════════════════════    │
│                                         │
│  ✈️ ACTIVE TRAVEL                       │
│  ┌─────────────────────────────────┐   │
│  │ 📍 Paris, France                │   │
│  │ 📅 Jun 15 - Jun 22              │   │
│  │ ⏱️  3 days remaining             │   │
│  │                                 │   │
│  │ 👀 48 views  💬 12 messages     │   │
│  │ ❤️  15 matches                  │   │
│  │                                 │   │
│  │ [Complete Early] [Extend]      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  📅 UPCOMING TRAVELS                    │
│  ┌─────────────────────────────────┐   │
│  │ Barcelona, Spain                │   │
│  │ Jul 1 - Jul 8 (in 16 days)     │   │
│  │ [Edit] [Cancel]                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [+ Add New Destination]                │
└─────────────────────────────────────────┘
```

### 7. Travel History
```
┌─────────────────────────────────────────┐
│  TRAVEL HISTORY                         │
│  ═══════════════════════════════════    │
│                                         │
│  📊 Your Travel Stats                   │
│  ┌─────────────────────────────────┐   │
│  │ 🌍 12 Cities                    │   │
│  │ 🗺️  8 Countries                 │   │
│  │ ❤️  87 Matches                  │   │
│  │ 💬 234 Conversations            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  📍 Recent Destinations:                │
│                                         │
│  🗼 Paris, France                       │
│     May 2025 • 15 matches               │
│                                         │
│  🗽 New York, USA                       │
│     Apr 2025 • 23 matches               │
│                                         │
│  🏛️  Rome, Italy                        │
│     Mar 2025 • 11 matches               │
│                                         │
│  [View All]                             │
└─────────────────────────────────────────┘
```

### 8. Popular Destinations
```
┌─────────────────────────────────────────┐
│  POPULAR DESTINATIONS                   │
│  ═══════════════════════════════════    │
│                                         │
│  🔍 [Search cities...]                  │
│                                         │
│  🔥 Trending Now                        │
│                                         │
│  🗼 Paris, France                       │
│     1,234 travelers • Very Popular      │
│                                         │
│  🗽 New York, USA                       │
│     987 travelers • Popular             │
│                                         │
│  🗾 Tokyo, Japan                        │
│     856 travelers • Popular             │
│                                         │
│  🏖️  Barcelona, Spain                   │
│     743 travelers • Popular             │
│                                         │
│  🏛️  Rome, Italy                        │
│     654 travelers • Popular             │
│                                         │
│  [See All Destinations]                 │
└─────────────────────────────────────────┘
```

## User Flow Diagrams

### Flow 1: Setting Up Travel Mode

```
START
  │
  ├─► Enable Travel Mode Toggle
  │
  ├─► Click "Add Destination"
  │
  ├─► Search or Select Popular City
  │     │
  │     ├─► See: Paris, France
  │     └─► Select
  │
  ├─► Pick Travel Dates
  │     │
  │     ├─► Start: Jun 15, 2025
  │     └─► End: Jun 22, 2025
  │
  ├─► Set Preferences
  │     │
  │     ├─► Match with locals: ✓
  │     └─► Match with travelers: ✓
  │
  ├─► Save Travel Plan
  │
  ├─► Travel Created (Status: Scheduled)
  │
  └─► Profile Badge Added
        "Traveling to Paris"
```

### Flow 2: Auto-Activation & Discovery

```
Jun 15, 2025 00:00 (Start Date Arrives)
  │
  ├─► Background Job Runs
  │
  ├─► Travel Status: Scheduled → Active
  │
  ├─► User's Discovery Location Updates
  │     │
  │     ├─► Old: New York, USA
  │     └─► New: Paris, France
  │
  ├─► Discovery Shows Paris Profiles
  │     │
  │     ├─► Locals in Paris
  │     └─► Other Travelers in Paris
  │
  ├─► Profile Badge Updates
  │     │
  │     ├─► Old: "Traveling to Paris"
  │     └─► New: "Currently in Paris"
  │
  └─► User Gets Notification
        "Your trip to Paris has started! 🎉"
```

### Flow 3: Using Passport (Premium Plus)

```
Premium Plus User Opens Passport
  │
  ├─► View Current Virtual Location
  │     └─► Current: Paris, France
  │
  ├─► Click "Change Location"
  │
  ├─► Search for New City
  │     └─► Type: "Tokyo"
  │
  ├─► Select Tokyo, Japan
  │
  ├─► Instant Location Change
  │     │
  │     ├─► Discovery Updates Immediately
  │     ├─► Shows Tokyo Profiles
  │     └─► No waiting for dates
  │
  ├─► Location History Updated
  │     │
  │     ├─► Paris → Tokyo
  │     └─► Change Count: +1
  │
  └─► Start Matching in Tokyo
```

## Database Schema Visualization

```
┌─────────────────────────┐
│ user_travel_sessions    │
├─────────────────────────┤
│ id (PK)                 │
│ user_id (FK)            │─────┐
│ destination_city        │     │
│ destination_country     │     │
│ destination_latitude    │     │
│ destination_longitude   │     │
│ start_date              │     │
│ end_date                │     │
│ status                  │     │
│ is_current              │     │
│ show_on_profile         │     │
│ match_with_locals       │     │
│ match_with_travelers    │     │
│ views_count             │     │
│ matches_count           │     │
│ messages_count          │     │
└─────────────────────────┘     │
                                │
                                │
┌─────────────────────────┐     │
│ user_travel_history     │     │
├─────────────────────────┤     │
│ id (PK)                 │     │
│ user_id (FK)            │─────┤
│ travel_session_id (FK)  │     │
│ city                    │     │
│ country                 │     │
│ start_date              │     │
│ end_date                │     │
│ total_views             │     │
│ total_matches           │     │
│ total_messages          │     │
└─────────────────────────┘     │
                                │
                                │
┌─────────────────────────┐     │
│ user_passport_sessions  │     │
├─────────────────────────┤     │
│ id (PK)                 │     │
│ user_id (FK)            │─────┤
│ current_city            │     │
│ current_country         │     │
│ current_latitude        │     │
│ current_longitude       │     │
│ is_active               │     │
│ changes_count           │     │
│ last_change_at          │     │
│ expires_at              │     │
└─────────────────────────┘     │
                                │
                                │
┌─────────────────────────┐     │
│ travel_mode_settings    │     │
├─────────────────────────┤     │
│ id (PK)                 │     │
│ user_id (FK)            │─────┘
│ travel_mode_enabled     │
│ unlimited_passport_...  │
│ auto_location_switch    │
│ notify_local_matches    │
│ show_travel_badge       │
│ max_simultaneous_...    │
│ passport_changes_...    │
│ notify_before_arrival   │
│ notify_days_before      │
└─────────────────────────┘
```

## API Request/Response Examples

### Create Travel Destination
```http
POST /api/travel/destinations
Authorization: Bearer <token>
Content-Type: application/json

{
  "city": "Paris",
  "state": "Île-de-France",
  "country": "France",
  "countryCode": "FR",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "timezone": "Europe/Paris",
  "startDate": "2025-06-15T00:00:00Z",
  "endDate": "2025-06-22T23:59:59Z",
  "showOnProfile": true,
  "matchBeforeArrival": true
}

Response 201 Created:
{
  "id": "travel_123abc",
  "city": "Paris",
  "country": "France",
  "startDate": "2025-06-15T00:00:00Z",
  "endDate": "2025-06-22T23:59:59Z",
  "status": "scheduled",
  "isActive": false,
  "showOnProfile": true,
  "daysUntilArrival": 45,
  "createdAt": "2025-05-01T10:30:00Z"
}
```

### Get Current Travel
```http
GET /api/travel/current
Authorization: Bearer <token>

Response 200 OK:
{
  "id": "travel_123abc",
  "city": "Paris",
  "country": "France",
  "startDate": "2025-06-15T00:00:00Z",
  "endDate": "2025-06-22T23:59:59Z",
  "status": "active",
  "isActive": true,
  "showOnProfile": true,
  "daysRemaining": 3,
  "stats": {
    "views": 48,
    "matches": 15,
    "messages": 12
  }
}
```

### Change Passport Location
```http
POST /api/travel/passport/change
Authorization: Bearer <token>
Content-Type: application/json

{
  "city": "Tokyo",
  "country": "Japan",
  "latitude": 35.6762,
  "longitude": 139.6503
}

Response 200 OK:
{
  "id": "passport_456def",
  "currentCity": "Tokyo",
  "currentCountry": "Japan",
  "isActive": true,
  "changesCount": 13,
  "lastChangeAt": "2025-05-01T14:30:00Z"
}
```

## Notification Examples

### Travel Starting Soon
```
┌─────────────────────────────────┐
│  🛫 Your Trip Starts Tomorrow!  │
│                                 │
│  Your trip to Paris starts      │
│  tomorrow! Get ready to meet    │
│  new people. 🎉                 │
│                                 │
│  [View Details]                 │
└─────────────────────────────────┘
```

### Travel Activated
```
┌─────────────────────────────────┐
│  🎉 Welcome to Paris!           │
│                                 │
│  Your travel mode is now        │
│  active. Start swiping to       │
│  meet locals and travelers!     │
│                                 │
│  [Start Swiping]                │
└─────────────────────────────────┘
```

### Travel Completed
```
┌─────────────────────────────────┐
│  ✅ Trip Complete!              │
│                                 │
│  Your Paris adventure is over!  │
│                                 │
│  • 15 matches                   │
│  • 48 profile views             │
│  • 12 conversations             │
│                                 │
│  [View Travel History]          │
└─────────────────────────────────┘
```

## Monetization Strategy

### Upgrade Prompts

**Free User Hits Limit:**
```
┌─────────────────────────────────┐
│  🔒 Upgrade to Add More         │
│                                 │
│  You've reached your limit      │
│  of 1 active destination.       │
│                                 │
│  Upgrade to Premium for:        │
│  • 3 simultaneous travels       │
│  • Priority in destinations     │
│  • Advanced statistics          │
│                                 │
│  [Upgrade to Premium - $9.99]   │
└─────────────────────────────────┘
```

**Passport Feature Teaser:**
```
┌─────────────────────────────────┐
│  🌍 Explore Anywhere Instantly  │
│                                 │
│  With Passport, change your     │
│  location without waiting for   │
│  travel dates!                  │
│                                 │
│  Premium Plus includes:         │
│  • Unlimited location changes   │
│  • No travel dates needed       │
│  • Explore the world instantly  │
│                                 │
│  [Try Premium Plus - $19.99]    │
└─────────────────────────────────┘
```

## Success Metrics

### KPIs to Track

**Adoption:**
- 30%+ users enable travel mode (target)
- 2.5 average travels per user per year
- 60% return travel users

**Engagement:**
- 40% higher match rate while traveling
- 25% more messages sent
- 50% longer session duration

**Revenue:**
- 20% conversion to Premium (travel limit)
- 10% conversion to Premium Plus (passport)
- $15 ARPU increase

---

**Implementation Status:** Ready to Deploy
**Documentation:** Complete
**Estimated ROI:** High (Premium conversion + engagement boost)
