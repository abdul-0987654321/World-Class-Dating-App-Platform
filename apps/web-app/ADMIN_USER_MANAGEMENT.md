# Admin User Management System

Complete admin dashboard user management implementation for the dating app platform.

## Overview

This implementation provides a comprehensive user management system for administrators with the following features:

1. User list with search, filter, and pagination
2. Detailed user profile view with activity and subscription status
3. User moderation actions (warn, suspend, ban, unban)
4. View user reports and flags
5. Edit user information
6. View user's matches and conversations (for moderation)
7. Subscription management (upgrade/downgrade users)

## Architecture

### Services Layer

**File**: `src/services/admin-user.service.ts`

- Handles all admin-level user management API calls
- Provides mock data for development/testing
- Type-safe interfaces for all data structures
- Includes methods for:
  - User listing with filters and pagination
  - User details and activity
  - Matches and conversations
  - User reports
  - Moderation actions
  - Profile updates
  - Subscription management

### React Query Hooks

**File**: `src/hooks/useAdminUsers.ts`

Custom hooks for data fetching and mutations:

- `useAdminUsers()` - Fetch users list with filters
- `useAdminUser()` - Fetch single user details
- `useUserActivity()` - Fetch user activity data
- `useUserMatches()` - Fetch user's matches
- `useUserConversations()` - Fetch user's conversations
- `useUserReports()` - Fetch reports against user
- `useUpdateUser()` - Mutation for updating user data
- `useModerationAction()` - Mutation for moderation actions
- `useUpdateSubscription()` - Mutation for subscription changes
- `useDeleteUser()` - Mutation for deleting users
- `useVerifyUser()` - Mutation for verifying users
- `useResetPassword()` - Mutation for password resets

All hooks include proper cache invalidation and toast notifications.

## Components

### 1. UserManagementDashboard

**File**: `src/pages/Admin/UserManagementDashboard.tsx`

Main dashboard component with:
- Search functionality (by name, email, or ID)
- Filter buttons (All, Active, Verified, Premium, Suspended, Banned, Reported)
- Sortable columns (Name, Join Date, Last Active, Report Count)
- Pagination controls
- User statistics display
- Responsive table layout

**Usage**:
```tsx
import { UserManagementDashboard } from './pages/Admin/UserManagementDashboard';

<UserManagementDashboard onSelectUser={(user) => console.log(user)} />
```

### 2. UserDetailView

**File**: `src/components/Admin/UserDetailView.tsx`

Comprehensive user detail view with tabs:
- **Overview**: Profile info, account status, statistics
- **Activity**: Login history, device info, engagement metrics
- **Subscription**: Current plan, benefits, subscription dates

**Usage**:
```tsx
import { UserDetailView } from './components/Admin';

<UserDetailView userId="user-123" onClose={() => {}} />
```

### 3. UserModerationActions

**File**: `src/components/Admin/UserModerationActions.tsx`

Moderation action buttons with modal confirmations:
- Warn User
- Suspend User (with duration selection)
- Unsuspend User
- Ban User (permanent)
- Unban User

Each action requires a reason and shows appropriate warnings.

**Usage**:
```tsx
import { UserModerationActions } from './components/Admin';

<UserModerationActions
  user={selectedUser}
  onActionComplete={() => console.log('Action completed')}
/>
```

### 4. UserReportsView

**File**: `src/components/Admin/UserReportsView.tsx`

Display all reports against a user:
- Report category badges
- Status indicators (Pending, Investigating, Resolved, Dismissed)
- Reporter information
- Action taken details
- Summary statistics

**Usage**:
```tsx
import { UserReportsView } from './components/Admin';

<UserReportsView userId="user-123" />
```

### 5. UserEditForm

**File**: `src/components/Admin/UserEditForm.tsx`

Editable form for user information:
- First Name, Last Name
- Email
- Age, Gender, Location
- Bio
- Verification button
- Form validation

**Usage**:
```tsx
import { UserEditForm } from './components/Admin';

<UserEditForm
  user={selectedUser}
  onSave={() => console.log('Saved')}
  onCancel={() => console.log('Cancelled')}
/>
```

### 6. UserMatchesView

**File**: `src/components/Admin/UserMatchesView.tsx`

View user's matches and conversations:
- **Matches Tab**: Shows all user matches with message counts
- **Conversations Tab**: Shows active conversations with last message
- Statistics for both tabs
- Blocked match indicators

**Usage**:
```tsx
import { UserMatchesView } from './components/Admin';

<UserMatchesView userId="user-123" />
```

### 7. SubscriptionManagement

**File**: `src/components/Admin/SubscriptionManagement.tsx`

Manage user subscriptions:
- Visual tier cards (Free, Gold, Platinum, Diamond)
- Upgrade/Downgrade indicators
- Duration selection for paid tiers
- Reason requirement for audit trail
- Current subscription details

**Usage**:
```tsx
import { SubscriptionManagement } from './components/Admin';

<SubscriptionManagement
  user={selectedUser}
  onUpdate={() => console.log('Updated')}
/>
```

### 8. UserManagementPage

**File**: `src/pages/Admin/UserManagementPage.tsx`

Main page that integrates all components:
- Switches between list view and detail view
- Tab navigation for different sections
- Responsive layout
- Back navigation

**Usage**:
```tsx
import { UserManagementPage } from './pages/Admin';

// In your router
<Route path="/admin/users" element={<UserManagementPage />} />
```

## Data Flow

```
User Action → React Query Hook → Service Layer → API/Mock Data
                     ↓
              Cache Update
                     ↓
            Component Re-render
                     ↓
              Toast Notification
```

## API Integration

The service layer is designed to work with real APIs. To connect to your backend:

1. Set the `VITE_API_URL` environment variable
2. The service will automatically switch from mock data to real API calls
3. All endpoints follow RESTful conventions:

```
GET    /api/admin/users                    - List users
GET    /api/admin/users/:id                - Get user details
GET    /api/admin/users/:id/activity       - Get user activity
GET    /api/admin/users/:id/matches        - Get user matches
GET    /api/admin/users/:id/conversations  - Get user conversations
GET    /api/admin/users/:id/reports        - Get reports against user
PATCH  /api/admin/users/:id                - Update user
POST   /api/admin/users/:id/moderation     - Perform moderation action
POST   /api/admin/users/:id/subscription   - Update subscription
DELETE /api/admin/users/:id                - Delete user
POST   /api/admin/users/:id/verify         - Verify user
POST   /api/admin/users/:id/reset-password - Reset password
```

## Styling

All components use:
- Tailwind CSS for styling
- Consistent color scheme (pink/purple primary colors)
- Responsive design
- React Icons for icons
- Gradient backgrounds for visual appeal

## State Management

- React Query for server state
- Local component state for UI state
- No global state management needed (React Query handles caching)

## Error Handling

- All API calls include error handling
- Toast notifications for success/error states
- Loading states during async operations
- Graceful fallbacks for missing data

## Features Implemented

✅ User list with search, filter, pagination
✅ User detail view with profile info, activity, subscription status
✅ User moderation actions (warn, suspend, ban, unban)
✅ View user reports and flags
✅ Edit user information
✅ View user's matches and conversations (for moderation)
✅ Subscription management (upgrade/downgrade users)

## Mock Data

The system includes comprehensive mock data generation for development:
- 50 mock users with realistic data
- Random subscription tiers
- Activity metrics
- Matches and conversations
- Reports

## Usage Example

```tsx
import { UserManagementPage } from '@/pages/Admin';

// Add to your admin routes
function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin/users" element={<UserManagementPage />} />
      {/* Other admin routes */}
    </Routes>
  );
}
```

## Security Considerations

1. All API calls include authentication headers
2. Admin ID is required for moderation actions (audit trail)
3. Reasons required for all moderation and subscription changes
4. Confirmation modals for destructive actions
5. Role-based access control should be implemented at the route level

## Performance Optimizations

- React Query caching reduces unnecessary API calls
- Pagination for large user lists
- Lazy loading of user details
- Debounced search input (can be added)
- Conditional data fetching based on active tab

## Future Enhancements

Potential improvements:
- Bulk user actions
- Export user data
- Advanced filtering (date ranges, custom fields)
- User activity timeline
- Automated moderation rules
- Email templates for notifications
- Audit log viewer
- Performance metrics dashboard

## Dependencies

Required packages (already in package.json):
- `@tanstack/react-query` - Data fetching and caching
- `react-router-dom` - Navigation
- `react-icons` - Icons
- `react-toastify` - Toast notifications
- `tailwindcss` - Styling

## Testing

To test the implementation:

1. Navigate to `/admin/users` in your application
2. Use the search and filter functionality
3. Click on any user to view details
4. Test each tab (Overview, Edit, Moderation, Reports, Matches, Subscription)
5. Perform moderation actions
6. Edit user information
7. Change subscriptions

All actions will use mock data unless `VITE_API_URL` is configured.

## Troubleshooting

**Issue**: Components not rendering
- Check that React Query provider is set up in your app
- Verify all imports are correct

**Issue**: API calls failing
- Check `VITE_API_URL` environment variable
- Verify API endpoints match the service implementation
- Check authentication headers

**Issue**: Styling issues
- Ensure Tailwind CSS is properly configured
- Check that all required Tailwind classes are included in your build

## Support

For questions or issues with this implementation, please refer to:
- React Query documentation: https://tanstack.com/query/latest
- Tailwind CSS documentation: https://tailwindcss.com/docs
- React Icons: https://react-icons.github.io/react-icons/
