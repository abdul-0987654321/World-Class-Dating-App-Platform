# Photo Verification Components

Frontend components for the Photo Verification System. These components provide a complete UI for photo verification, status tracking, and admin management.

## Components Overview

### 1. VerificationBadge

Displays verification status badges on user profiles.

### 2. PhotoVerificationFlow

Complete verification wizard for uploading and verifying photos.

### 3. VerificationStatus

Shows user's verification progress and statistics.

### 4. AdminVerificationDashboard

Admin dashboard for reviewing duplicate flags and verification attempts.

---

## 1. VerificationBadge

### Description

A reusable badge component that displays a user's verification level with a tooltip showing details.

### Props

```typescript
interface VerificationBadgeProps {
  level: VerificationLevel; // 'none' | 'basic' | 'verified' | 'premium'
  showText?: boolean; // Show text label (default: true)
  size?: 'small' | 'medium' | 'large'; // Badge size (default: 'medium')
  verifiedDate?: string; // ISO date string for verification date
}
```

### Verification Levels

| Level      | Color | Icon         | Description                           |
| ---------- | ----- | ------------ | ------------------------------------- |
| `none`     | Gray  | Clock        | No photos verified yet                |
| `basic`    | Blue  | Shield       | Photo meets quality standards         |
| `verified` | Green | Check Circle | Photos verified with face matching    |
| `premium`  | Gold  | Star         | ID verified with video liveness check |

### Usage Example

```tsx
import { VerificationBadge } from '@/components/Verification';

// Basic usage
<VerificationBadge level="verified" />

// With custom size and verified date
<VerificationBadge
  level="premium"
  size="large"
  verifiedDate="2025-11-18T10:30:00Z"
  showText={true}
/>

// Small badge without text
<VerificationBadge
  level="basic"
  size="small"
  showText={false}
/>
```

### Styling

The component uses styled-components with:

- Responsive sizing (12px/16px/20px icons)
- Hover animations (1.05x scale)
- Tooltip on hover with verification details
- Color-coded backgrounds and text

### Integration

Add to user profile cards, search results, or any user display component:

```tsx
function UserProfileCard({ user }) {
  return (
    <div className="profile-card">
      <img src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
      <VerificationBadge level={user.verificationLevel} />
    </div>
  );
}
```

---

## 2. PhotoVerificationFlow

### Description

A comprehensive 3-step wizard that guides users through the photo verification process.

### Props

```typescript
interface PhotoVerificationFlowProps {
  userId: string; // ID of the user verifying photos
  referencePhotoUrl?: string; // URL of verified photo for face matching
  onVerificationComplete?: (result: VerificationResult) => void;
  onCancel?: () => void;
}

interface VerificationResult {
  success: boolean;
  verified: boolean;
  confidence: number; // 0.0 to 1.0
  details: {
    faceDetected: boolean;
    faceCount: number;
    qualityScore: number;
    matchScore?: number; // Only if referencePhotoUrl provided
  };
  liveness?: {
    isLive: boolean;
    confidence: number;
  };
  duplicate?: {
    isDuplicate: boolean;
    matchingUserIds: string[];
  };
  failureReason?: string;
}
```

### Steps

#### Step 1: Upload

- File selection via click or drag-and-drop
- File type validation (images only)
- File size validation (max 10MB)
- Live preview of selected photo
- Quality tips displayed

#### Step 2: Processing

- Upload progress indicator
- Verification status with animated steps:
  1. Uploading photo
  2. Detecting face
  3. Checking quality
  4. Matching face (if reference photo provided)

#### Step 3: Result

- **Success**: Shows confidence scores, quality scores, and verification details
- **Failure**: Shows specific failure reason with actionable solution

### Usage Example

```tsx
import { PhotoVerificationFlow } from '@/components/Verification';
import { useState } from 'react';

function VerificationPage() {
  const [showFlow, setShowFlow] = useState(false);

  const handleComplete = (result) => {
    console.log('Verification result:', result);
    if (result.verified) {
      // Update user profile
      // Show success message
      setShowFlow(false);
    }
  };

  return (
    <div>
      <button onClick={() => setShowFlow(true)}>Verify Photo</button>

      {showFlow && (
        <PhotoVerificationFlow
          userId={currentUser.id}
          referencePhotoUrl={currentUser.primaryPhoto}
          onVerificationComplete={handleComplete}
          onCancel={() => setShowFlow(false)}
        />
      )}
    </div>
  );
}
```

### API Integration

The component automatically calls these endpoints:

- `POST /api/media/upload` - Upload photo to storage
- `POST /api/verification/comprehensive/:mediaId` - Verify photo

**SECURITY NOTE:** Authentication tokens are handled via httpOnly cookies in production.
The frontend does not need to manage tokens directly. The auth service handles this automatically.

In development/mock mode, tokens are stored in sessionStorage (NOT localStorage for security).
Never store sensitive authentication tokens in localStorage as they are vulnerable to XSS attacks.

### Error Handling

The component handles these errors gracefully:

- No face detected
- Multiple faces detected
- Photo quality too low
- Screenshot/printout detected (liveness failure)
- Duplicate profile detected
- Upload failures
- Network errors

### Customization

Override styles using styled-components:

```tsx
import styled from 'styled-components';
import { PhotoVerificationFlow } from '@/components/Verification';

const CustomVerificationFlow = styled(PhotoVerificationFlow)`
  max-width: 800px; // Custom width

  /* Override specific elements */
  ${Container} {
    background: #f5f5f5;
  }
`;
```

---

## 3. VerificationStatus

### Description

Displays a user's verification progress, statistics, and photo statuses.

### Props

```typescript
interface VerificationStatusProps {
  userId: string; // ID of user to show status for
  onStartVerification?: () => void; // Callback when user clicks "Start Verification"
}
```

### Features

#### Statistics Cards

- Verified photos count
- Pending verifications count
- Failed verifications count
- Total photos count

#### Progress Bar

- Visual progress indicator
- Percentage of verified photos

#### Informational Banners

- **No Verification**: Encourages users to get verified
- **Basic Verification**: Prompts upgrade to full verification
- **Failed Photos**: Alerts user to retry failed verifications

#### Photo Grid

- Displays all user photos with status
- Shows verification confidence scores
- Displays failure reasons for rejected photos
- Shows verification dates

#### Benefits Section

- Lists benefits of verification:
  - Increased trust
  - Higher visibility
  - Premium features
  - Safety & security

### Usage Example

```tsx
import { VerificationStatus } from '@/components/Verification';

function ProfilePage({ userId }) {
  const handleStartVerification = () => {
    // Open verification flow modal
    setShowVerificationFlow(true);
  };

  return (
    <div className="profile-page">
      <h1>My Verification Status</h1>
      <VerificationStatus userId={userId} onStartVerification={handleStartVerification} />
    </div>
  );
}
```

### API Integration

The component automatically fetches data from:

- `GET /api/verification/user/:userId/stats` - User verification statistics
- `GET /api/media/user/:userId` - User's photos with verification status

### Data Structure

The component expects this response format:

```typescript
// From /api/verification/user/:userId/stats
{
  stats: {
    verified: number;
    pending: number;
    failed: number;
    total: number;
    verificationLevel: 'none' | 'basic' | 'verified' | 'premium';
    isVerified: boolean;
  }
}

// From /api/media/user/:userId
{
  photos: [
    {
      id: string;
      url: string;
      verified: boolean;
      status: 'verified' | 'pending' | 'failed' | 'none';
      confidence?: number;
      qualityScore?: number;
      failureReason?: string;
      verifiedAt?: string;
    }
  ]
}
```

---

## 4. AdminVerificationDashboard

### Description

Admin dashboard for reviewing duplicate profile flags and verification attempts.

### Props

```typescript
interface AdminVerificationDashboardProps {
  adminId: string; // ID of admin user
}
```

### Features

#### Statistics Overview

- Total flags count
- Pending review count
- Confirmed duplicates count
- Dismissed flags count

#### Duplicate Flags Tab

- **Search**: Search by name or email
- **Filter**: Filter by status (flagged/reviewed/confirmed/dismissed)
- **Flag Cards**: Display user comparisons with:
  - User photos side-by-side
  - Match confidence score
  - Flag status badge
  - Creation and review dates
  - Review notes
- **Review Modal**:
  - Compare user photos in detail
  - Add review notes
  - Confirm duplicate or dismiss flag

#### Verification Attempts Tab

- Table view of all verification attempts
- Columns:
  - User (name and email)
  - Attempt type
  - Result (success/failure)
  - IP address
  - Date
  - Actions (view details)
- Filter by result status

### Usage Example

```tsx
import { AdminVerificationDashboard } from '@/components/Verification';

function AdminPage({ currentAdmin }) {
  return (
    <div className="admin-page">
      <h1>Admin Panel</h1>
      <AdminVerificationDashboard adminId={currentAdmin.id} />
    </div>
  );
}
```

### Admin Actions

#### Reviewing Duplicate Flags

1. Click "Review" button on a flagged profile
2. Modal opens with side-by-side photo comparison
3. Review the match confidence score
4. Add review notes (optional)
5. Choose action:
   - **Dismiss**: Flag as false positive (not duplicate)
   - **Confirm**: Confirm as duplicate profile

### API Integration

The component uses these admin-only endpoints:

```typescript
// Get all duplicate flags
GET /api/admin/verification/duplicate-flags

// Get all verification attempts
GET /api/admin/verification/attempts

// Get dashboard statistics
GET /api/admin/verification/stats

// Review a duplicate flag
POST /api/admin/verification/duplicate-flags/:flagId/review
{
  status: 'confirmed' | 'dismissed',
  reviewedBy: string,
  reviewNotes: string
}
```

### Permissions

This component should only be accessible to admin users. Implement route protection:

```tsx
import { AdminVerificationDashboard } from '@/components/Verification';
import { useAuth } from '@/hooks/useAuth';

function AdminRoute() {
  const { user, isAdmin } = useAuth();

  if (!isAdmin) {
    return <Redirect to="/unauthorized" />;
  }

  return <AdminVerificationDashboard adminId={user.id} />;
}
```

### Data Structures

```typescript
interface DuplicateFlag {
  id: string;
  userId: string;
  matchingUserId: string;
  confidenceScore: number; // 0.0 to 1.0
  status: 'flagged' | 'reviewed' | 'confirmed' | 'dismissed';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  userDetails: {
    name: string;
    email: string;
    photoUrl: string;
  };
  matchingUserDetails: {
    name: string;
    email: string;
    photoUrl: string;
  };
}

interface VerificationAttempt {
  id: string;
  userId: string;
  mediaId: string;
  attemptType: string; // 'upload', 'retry', 'manual_review'
  result: string; // 'success', 'failure', 'pending'
  errorMessage?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  userDetails: {
    name: string;
    email: string;
  };
}
```

---

## Integration Guide

### 1. Install Dependencies

```bash
npm install react react-icons styled-components
npm install --save-dev @types/react @types/styled-components
```

### 2. Import Components

```tsx
// Individual imports
import { VerificationBadge } from '@/components/Verification';
import { PhotoVerificationFlow } from '@/components/Verification';
import { VerificationStatus } from '@/components/Verification';
import { AdminVerificationDashboard } from '@/components/Verification';

// Or import all at once
import * as Verification from '@/components/Verification';

<Verification.VerificationBadge level="verified" />;
```

### 3. Complete User Flow Example

```tsx
import React, { useState } from 'react';
import {
  VerificationBadge,
  PhotoVerificationFlow,
  VerificationStatus,
} from '@/components/Verification';

function UserProfilePage({ user, isCurrentUser }) {
  const [showVerificationFlow, setShowVerificationFlow] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleVerificationComplete = (result) => {
    if (result.verified) {
      // Update user verification level
      user.verificationLevel = result.details.matchScore ? 'verified' : 'basic';

      // Refresh verification status
      setRefreshKey((prev) => prev + 1);

      // Close flow
      setShowVerificationFlow(false);

      // Show success message
      alert('Photo verified successfully!');
    }
  };

  return (
    <div className="profile-page">
      {/* Show badge on profile */}
      <div className="profile-header">
        <img src={user.avatar} alt={user.name} />
        <h1>{user.name}</h1>
        <VerificationBadge level={user.verificationLevel} verifiedDate={user.verifiedAt} />
      </div>

      {/* Show verification status for current user */}
      {isCurrentUser && (
        <>
          <VerificationStatus
            key={refreshKey}
            userId={user.id}
            onStartVerification={() => setShowVerificationFlow(true)}
          />

          {/* Verification flow modal */}
          {showVerificationFlow && (
            <div className="modal">
              <PhotoVerificationFlow
                userId={user.id}
                referencePhotoUrl={user.primaryPhoto}
                onVerificationComplete={handleVerificationComplete}
                onCancel={() => setShowVerificationFlow(false)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default UserProfilePage;
```

---

## Styling & Theming

All components use styled-components. You can customize the theme:

```tsx
import { ThemeProvider } from 'styled-components';

const verificationTheme = {
  colors: {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    gray: '#6b7280',
  },
  borderRadius: {
    small: '6px',
    medium: '8px',
    large: '12px',
    full: '9999px',
  },
};

function App() {
  return <ThemeProvider theme={verificationTheme}>{/* Your app components */}</ThemeProvider>;
}
```

---

## Testing

### Unit Tests

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { VerificationBadge } from '@/components/Verification';

describe('VerificationBadge', () => {
  it('renders verified badge', () => {
    render(<VerificationBadge level="verified" />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('shows tooltip on hover', () => {
    render(<VerificationBadge level="premium" />);
    // Test tooltip visibility on hover
  });
});
```

### E2E Tests

```tsx
describe('Photo Verification Flow', () => {
  it('completes verification successfully', () => {
    cy.visit('/profile');
    cy.contains('Start Verification').click();

    // Upload photo
    cy.get('input[type="file"]').attachFile('test-photo.jpg');
    cy.contains('Verify Photo').click();

    // Wait for verification
    cy.contains('Verification Successful!', { timeout: 10000 });

    // Check badge updated
    cy.contains('Verified').should('be.visible');
  });
});
```

---

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **ARIA Labels**: Proper ARIA labels on all buttons and inputs
- **Color Contrast**: Minimum 4.5:1 contrast ratio
- **Screen Reader Support**: Descriptive text for all visual elements
- **Focus Indicators**: Visible focus states on all interactive elements

```tsx
// Example accessibility features
<button
  aria-label="Start photo verification"
  onClick={onStartVerification}
>
  Verify Photo
</button>

<img
  src={user.photo}
  alt={`Profile photo of ${user.name}`}
/>

<div role="alert" aria-live="polite">
  {verificationResult.message}
</div>
```

---

## Troubleshooting

### Issue: "Authentication failed"

**Solution**: Authentication is handled automatically via httpOnly cookies in production.
Ensure the user is logged in via the auth service. In development mode, tokens are
stored in sessionStorage automatically by the auth service - no manual storage needed.

### Issue: "Failed to upload photo"

**Solution**: Check CORS settings and file size limits on backend.

### Issue: "Verification stuck on processing"

**Solution**: Check Azure Face API credentials and endpoint configuration.

### Issue: "Components not styled correctly"

**Solution**: Ensure styled-components is installed and ThemeProvider is set up.

---

## Performance Optimization

### Lazy Loading

```tsx
import { lazy, Suspense } from 'react';

const AdminVerificationDashboard = lazy(
  () => import('@/components/Verification/AdminVerificationDashboard')
);

function AdminPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminVerificationDashboard adminId={currentAdmin.id} />
    </Suspense>
  );
}
```

### Memoization

```tsx
import { memo } from 'react';

const VerificationBadge = memo(({ level, showText, size }) => {
  // Component implementation
});
```

---

## API Reference

See [PHOTO_VERIFICATION_COMPLETE.md](../../../../PHOTO_VERIFICATION_COMPLETE.md) for complete backend API documentation.

---

## Support

For issues or questions:

- Check the [main documentation](../../../../PHOTO_VERIFICATION_COMPLETE.md)
- Review the [integration guide](#integration-guide)
- Contact the development team

---

**Last Updated**: November 18, 2025
**Version**: 1.0.0
**Status**: Production Ready
