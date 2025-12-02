# Admin User Management - Setup Guide

Quick setup guide to integrate the admin user management system into your dating app.

## Files Created

### Services
- `src/services/admin-user.service.ts` - Admin user service with API calls and mock data

### Hooks
- `src/hooks/useAdminUsers.ts` - React Query hooks for user management

### Components (src/components/Admin/)
- `UserDetailView.tsx` - Comprehensive user detail component
- `UserModerationActions.tsx` - Moderation actions (warn, suspend, ban, unban)
- `UserReportsView.tsx` - View user reports and flags
- `UserEditForm.tsx` - Edit user information
- `UserMatchesView.tsx` - View matches and conversations
- `SubscriptionManagement.tsx` - Manage user subscriptions
- `index.ts` - Component exports

### Pages (src/pages/Admin/)
- `UserManagementDashboard.tsx` - User list with search, filter, pagination
- `UserManagementPage.tsx` - Main page integrating all components
- `INTEGRATION_EXAMPLE.tsx` - Integration examples

### Documentation
- `ADMIN_USER_MANAGEMENT.md` - Full documentation
- `ADMIN_SETUP_GUIDE.md` - This file

## Quick Start

### 1. Verify Dependencies

All required dependencies are already in `package.json`:

```json
{
  "@tanstack/react-query": "^5.8.4",
  "react-router-dom": "^6.21.0",
  "react-icons": "^5.5.0",
  "react-toastify": "^11.0.5",
  "tailwindcss": "^3.3.6"
}
```

### 2. Add to Your Routes

In your main App.tsx or routing configuration:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { UserManagementPage } from './pages/Admin';
import 'react-toastify/dist/ReactToastify.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Other routes */}
          <Route path="/admin/users" element={<UserManagementPage />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer position="top-right" />
    </QueryClientProvider>
  );
}
```

### 3. Configure Environment Variables (Optional)

For production API integration:

```env
# .env.development or .env.production
VITE_API_URL=https://your-api-domain.com
```

If not set, the system will use mock data.

### 4. Test the Implementation

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/admin/users` in your browser

3. You should see the user management dashboard with mock data

## Features Available

### User List
- ✅ Search by name, email, or ID
- ✅ Filter by status (All, Active, Verified, Premium, Suspended, Banned, Reported)
- ✅ Sort by multiple columns
- ✅ Pagination
- ✅ View user details

### User Details
- ✅ Profile information (name, email, age, gender, location, bio)
- ✅ Account status (verification status, activity)
- ✅ Statistics (matches, messages, photos, reports)
- ✅ Activity metrics (logins, swipes, likes)
- ✅ Device information
- ✅ Subscription details

### Moderation
- ✅ Warn user
- ✅ Suspend user (with duration)
- ✅ Unsuspend user
- ✅ Ban user (permanent)
- ✅ Unban user
- ✅ All actions require reason (audit trail)

### Reports
- ✅ View all reports against a user
- ✅ Report categories and status
- ✅ Reporter information
- ✅ Action taken details
- ✅ Summary statistics

### Profile Editing
- ✅ Edit user information
- ✅ Verify user
- ✅ Form validation
- ✅ Real-time updates

### Matches & Conversations
- ✅ View all user matches
- ✅ View active conversations
- ✅ Message counts and timestamps
- ✅ Blocked status indicators

### Subscription Management
- ✅ View current subscription
- ✅ Upgrade/downgrade users
- ✅ Set subscription duration
- ✅ Visual tier cards

## Customization

### Change Colors

The system uses Tailwind CSS. To change the primary color scheme:

1. Update `tailwind.config.js`:
   ```js
   module.exports = {
     theme: {
       extend: {
         colors: {
           primary: '#your-color',
         },
       },
     },
   };
   ```

2. Replace `pink-500`, `purple-500` classes in components with your color

### Add Additional Fields

To add new user fields:

1. Update types in `src/services/admin-user.service.ts`:
   ```typescript
   export interface AdminUser {
     // ... existing fields
     customField: string;
   }
   ```

2. Update `UserEditForm.tsx` to include the new field

3. Update `UserDetailView.tsx` to display the new field

### Custom Moderation Actions

To add new moderation actions:

1. Update `ModerationAction` type in service
2. Add new button in `UserModerationActions.tsx`
3. Create corresponding API endpoint

## API Integration

### Connect to Real Backend

The service layer is ready for real API integration. Update your backend to implement these endpoints:

```
GET    /api/admin/users
GET    /api/admin/users/:id
GET    /api/admin/users/:id/activity
GET    /api/admin/users/:id/matches
GET    /api/admin/users/:id/conversations
GET    /api/admin/users/:id/reports
PATCH  /api/admin/users/:id
POST   /api/admin/users/:id/moderation
POST   /api/admin/users/:id/subscription
DELETE /api/admin/users/:id
POST   /api/admin/users/:id/verify
POST   /api/admin/users/:id/reset-password
```

### Request/Response Examples

**Get Users List**:
```
GET /api/admin/users?page=1&limit=10&filter=active&search=john

Response:
{
  "users": [...],
  "totalCount": 100,
  "totalPages": 10,
  "currentPage": 1
}
```

**Perform Moderation Action**:
```
POST /api/admin/users/:id/moderation

Body:
{
  "type": "suspend",
  "reason": "Violation of community guidelines",
  "duration": 7,
  "adminId": "admin-123"
}

Response: 204 No Content
```

## Authentication & Authorization

Add authentication checks before allowing access:

```tsx
import { Navigate } from 'react-router-dom';

function ProtectedAdminRoute({ children }) {
  const { user, isAuthenticated } = useAuth(); // Your auth hook

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/unauthorized" />;
  }

  return children;
}

// Usage
<Route
  path="/admin/users"
  element={
    <ProtectedAdminRoute>
      <UserManagementPage />
    </ProtectedAdminRoute>
  }
/>
```

## Performance Tips

1. **Pagination**: Already implemented - shows 10 users per page
2. **Lazy Loading**: User details only load when selected
3. **Caching**: React Query caches data for 30-60 seconds
4. **Debounce Search**: Add debouncing to search input:
   ```tsx
   import { useDebouncedValue } from '@/hooks/useDebounce';
   const debouncedSearch = useDebouncedValue(searchTerm, 500);
   ```

## Troubleshooting

### Issue: "Cannot find module '@tanstack/react-query'"
**Solution**: Install dependencies
```bash
npm install
```

### Issue: Components not styled correctly
**Solution**: Ensure Tailwind CSS is configured:
```bash
# Check tailwind.config.js exists
# Ensure index.css has Tailwind directives
```

### Issue: API calls returning 401/403
**Solution**: Check authentication headers in `api.client.ts`

### Issue: Mock data not showing
**Solution**: Ensure `VITE_API_URL` is not set in development

## Next Steps

1. ✅ Test all features with mock data
2. ✅ Implement authentication/authorization
3. ✅ Connect to real backend API
4. ✅ Add admin navigation menu
5. ✅ Implement audit logging
6. ✅ Add unit tests
7. ✅ Deploy to production

## Support

For detailed information, refer to:
- `ADMIN_USER_MANAGEMENT.md` - Complete documentation
- `INTEGRATION_EXAMPLE.tsx` - Integration examples
- React Query docs: https://tanstack.com/query/latest

## Summary

You now have a complete admin user management system with:
- User listing, search, and filtering
- Detailed user profiles
- Moderation tools
- Report viewing
- Profile editing
- Match/conversation viewing
- Subscription management

All features are fully functional with mock data and ready for API integration!
