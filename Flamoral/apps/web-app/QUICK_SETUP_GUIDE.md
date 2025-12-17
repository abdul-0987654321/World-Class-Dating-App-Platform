# Quick Setup Guide - Email Verification Frontend

## Summary
Email verification components have been created. Due to file locking issues, some files have `_UPDATED` suffix and need to be manually replaced.

## Quick Setup (3 Commands)

Run these commands from the `apps/web-app` directory:

```bash
# 1. Replace App.tsx with updated routing
mv src/App_UPDATED.tsx src/App.tsx

# 2. Replace LoginPage with verification error handling
mv src/pages/Auth/LoginPage_UPDATED.tsx src/pages/Auth/LoginPage.tsx

# 3. Replace Auth index with new exports
mv src/pages/Auth/index_UPDATED.ts src/pages/Auth/index.ts
```

## What Was Created

### New Components (Already Created - No Action Needed)
- `src/pages/Auth/VerifyEmailPage.tsx` - Email verification page
- `src/pages/Auth/ResendVerificationPage.tsx` - Resend verification email page

### Updated Files (Need Manual Replacement)
- `src/App_UPDATED.tsx` → Replace `src/App.tsx`
- `src/pages/Auth/LoginPage_UPDATED.tsx` → Replace `src/pages/Auth/LoginPage.tsx`
- `src/pages/Auth/index_UPDATED.ts` → Replace `src/pages/Auth/index.ts`

## New Routes

After setup, these routes will be available:

- `/verify-email?token=xxx` - Email verification page
- `/resend-verification` - Resend verification email page

## Testing

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Test verification flow:**
   - Register a new account
   - Check email for verification link
   - Click link to verify email

3. **Test resend flow:**
   - Go to `/resend-verification`
   - Enter email and submit
   - Check for new verification email

4. **Test login with unverified account:**
   - Try to login before verifying
   - Should see error with resend link

## Need More Info?

See `EMAIL_VERIFICATION_IMPLEMENTATION.md` for complete documentation including:
- Detailed component features
- Design patterns used
- Error handling
- Troubleshooting guide
- Testing checklist

## Troubleshooting

**Routes not working?**
- Make sure you ran the `mv` commands above
- Check that `src/App.tsx` contains the new routes
- Restart your dev server

**Backend errors?**
- Verify backend has `/auth/verify-email` endpoint
- Verify backend has `/auth/resend-verification` endpoint
- Check that email sending is configured

**Need to revert?**
If you backed up the original files:
```bash
mv src/App.tsx.backup src/App.tsx
mv src/pages/Auth/LoginPage.tsx.backup src/pages/Auth/LoginPage.tsx
```
