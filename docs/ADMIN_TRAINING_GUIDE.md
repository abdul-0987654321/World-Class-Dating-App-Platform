# Content Moderation System - Admin Training Guide

**ConnectSphere Dating Platform**
**Version:** 1.0
**Date:** November 18, 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Moderation Queue](#moderation-queue)
5. [Reviewing Content](#reviewing-content)
6. [Statistics & Analytics](#statistics--analytics)
7. [User Management](#user-management)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [FAQs](#faqs)

---

## Introduction

### Welcome to ConnectSphere Moderation

Welcome to the ConnectSphere Content Moderation System! As an admin, you play a crucial role in maintaining a safe, respectful community for all users.

### Your Role

As a Content Moderator, you will:
- Review flagged content (photos, text, profiles)
- Make approve/reject decisions
- Enforce community guidelines
- Monitor platform safety metrics
- Protect users from inappropriate content

### System Overview

ConnectSphere uses a **three-tier moderation system**:

1. **AI Auto-Moderation** (AWS Rekognition + Azure Content Moderator)
   - Automatically approves safe content (risk < 50%)
   - Automatically rejects highly inappropriate content (risk > 90%)
   - Flags borderline content (risk 50-90%) for manual review

2. **Manual Review** (Your Role)
   - Review AI-flagged content
   - Make final approve/reject decisions
   - Add context and notes

3. **Progressive Sanctions**
   - Automatic warnings for first violations
   - Escalating suspensions (1 day → 7 days → 30 days)
   - Permanent bans for severe/repeated violations

---

## Getting Started

### Logging In

1. Navigate to: `https://app.connectsphere.com`
2. Click **"Admin Login"** or go to `/admin/login`
3. Enter your admin credentials
4. Two-factor authentication required (if enabled)

### First Login Checklist

- [ ] Verify your admin dashboard loads
- [ ] Check that you can access Moderation Queue
- [ ] Confirm Statistics Dashboard is accessible
- [ ] Review your profile settings
- [ ] Set notification preferences

### Navigation

**Admin Sidebar:**
```
📊 Dashboard
🚨 Moderation Queue  ← Most frequently used
📈 Statistics
👥 User Management
⚙️ Settings
```

---

## Dashboard Overview

### Admin Dashboard Home

When you log in, you'll see the Admin Dashboard with:

**Quick Stats:**
- Items in queue (requiring review)
- Today's moderation count
- Current suspension count
- New violations (last 24 hours)

**Recent Activity:**
- Last 10 reviewed items
- Recent user restrictions
- Moderator activity log

**Alerts:**
- Urgent items in queue (risk > 90%)
- Users approaching ban threshold
- System health alerts

---

## Moderation Queue

### Accessing the Queue

Click **"Moderation Queue"** in the sidebar or navigate to `/admin/moderation/queue`.

### Understanding the Queue

The queue displays all content flagged by AI for manual review.

**Queue Columns:**

| Column | Description |
|--------|-------------|
| **Preview** | Thumbnail of photo or text excerpt |
| **Risk Score** | AI confidence (50-100%) - higher = more likely inappropriate |
| **Violations** | AI-detected violation types |
| **Priority** | Urgent/High/Medium/Low |
| **User** | Username and violation history |
| **Flagged** | Date/time flagged |
| **Actions** | Review button |

### Priority Levels

Items are auto-prioritized based on risk score:

🔴 **Urgent** (90-100% risk)
- Immediate attention required
- Likely severe violation
- Review within 1 hour

🟠 **High** (75-90% risk)
- Review within 24 hours
- Potentially serious violation

🔵 **Medium** (60-75% risk)
- Review within 3 days
- Borderline content

⚪ **Low** (50-60% risk)
- Review when available
- Likely false positive

**Recommendation:** Always start with Urgent items, then High, Medium, Low.

---

### Filtering the Queue

Use filters to focus on specific content:

**Status Filter:**
- **Flagged:** Awaiting review (default)
- **Reviewing:** Currently being reviewed
- **Resolved:** Already reviewed

**Priority Filter:**
- Urgent
- High
- Medium
- Low

**Content Type Filter** (if available):
- Images
- Text
- Profiles

**Example Usage:**
1. Click "Priority" dropdown
2. Select "Urgent"
3. Queue shows only urgent items
4. Review these first

---

## Reviewing Content

### Step-by-Step Review Process

#### 1. Open Review Modal

- Click **"Review"** button on any queue item
- Review modal opens with full details

#### 2. Examine Content

**For Images:**
- View full-size photo
- Check for:
  - Nudity/sexual content
  - Violence/gore
  - Hate symbols
  - Illegal activities
  - Inappropriate context

**For Text:**
- Read full text carefully
- Check for:
  - Profanity
  - Hate speech
  - Sexual solicitation
  - Harassment
  - Spam/scams

#### 3. Review AI Assessment

**Risk Score:**
- 90-100%: Very likely inappropriate
- 75-90%: Probably inappropriate
- 60-75%: Possibly inappropriate
- 50-60%: Borderline/unclear

**Detected Violations:**
- AI-identified issues
- Multiple violations possible
- Use as guidance, not absolute truth

**Important:** AI is not perfect! Use your judgment and our guidelines.

#### 4. Check User History

**User Info Panel:**
- Total violations
- Severe violations
- Current status (active/warned/suspended)
- Previous similar violations

**Consider:**
- First-time offender vs. repeat violator
- Severity of past violations
- Time since last violation

#### 5. Make Your Decision

**Option A: Approve**

Use when:
- Content follows community guidelines
- AI false positive
- Context makes it acceptable
- Artistic/educational value

**Steps:**
1. Click **"Approve"** button
2. Add notes explaining decision
3. Click **"Submit"**

**Example Note:** "Artistic nude photo within guidelines - classical art recreation"

**Option B: Reject**

Use when:
- Violates community guidelines
- Inappropriate for platform
- Confirmed by manual review

**Steps:**
1. Click **"Reject"** button
2. Select violation type(s)
3. Add notes explaining decision
4. Click **"Submit"**

**Example Note:** "Explicit nudity - genitals clearly visible, violates Section 3.2 of guidelines"

#### 6. Add Notes (Required)

**Good Notes:**
- Specific and clear
- Reference guidelines section (if applicable)
- Explain reasoning
- Objective tone

**Examples:**
```
✅ Good: "Rejected - Explicit nudity visible (breasts exposed). Violates Community Guideline 3.2. User has 2 previous similar violations."

❌ Bad: "Inappropriate"

✅ Good: "Approved - Swimsuit photo at beach, context appropriate. Within guideline 3.4 exceptions."

❌ Bad: "Looks fine"
```

#### 7. Submit Review

- Click **"Submit"** or **"Confirm"**
- Success notification appears
- Modal closes
- Queue refreshes (item removed)

### After Submission

**If Approved:**
- Content published to platform
- User can see it
- Moderation log updated

**If Rejected:**
- Content removed permanently
- User violation recorded
- Automatic sanctions applied:
  - 1st-2nd violation: Warning email
  - 3rd violation: 1-day suspension
  - 4th violation: 7-day suspension
  - 5+ violations: Permanent ban
- User sees rejection in violation history

---

## Decision-Making Guidelines

### When to Approve

✅ **Approve if:**
- Content clearly follows guidelines
- AI over-flagged (false positive)
- Context makes it acceptable
- Borderline but leans acceptable
- Educational/artistic value
- User has clean history + minor issue

### When to Reject

❌ **Reject if:**
- Clear guideline violation
- Explicit sexual content
- Violence/gore
- Hate speech/symbols
- Illegal activities
- User has violation pattern
- Borderline but leans inappropriate

### Gray Areas

**When Unsure:**
1. Re-read community guidelines
2. Check similar past decisions
3. Consult with senior moderator
4. If still unsure: **Reject** (err on side of caution)
5. Document reasoning clearly

**Examples of Gray Areas:**
- Artistic nude vs. pornography
- Swimsuit vs. lingerie
- Political speech vs. hate speech
- Cultural differences

**Best Practice:** When in doubt, consult!

---

## Statistics & Analytics

### Accessing Statistics

Navigate to `/admin/moderation/stats` or click **"Statistics"** in sidebar.

### Overview Cards

**Metrics Displayed:**
- Total Moderated (all-time or date range)
- Approval Rate (%)
- Rejection Rate (%)
- Items Flagged for Review
- Average Risk Score
- Pending Queue Size

**What to Monitor:**
- Approval rate 70-80% = healthy (AI working well)
- Approval rate > 90% = AI too sensitive
- Approval rate < 50% = AI missing violations

### Daily Trend Chart

**Shows:**
- Moderation volume per day
- Approved (green) vs. Flagged (yellow) vs. Rejected (red)
- Stacked bar chart
- Last 7, 30, or 90 days

**Use Cases:**
- Identify busy days
- Spot unusual spikes
- Plan moderator schedules

### Violation Breakdown

**Displays:**
- Top 10 violation types
- Count and percentage
- Horizontal bar chart

**Insights:**
- Most common violations
- Areas users struggle with
- Trends over time

**Example:**
If "Explicit Nudity" is #1 at 45%, focus education efforts there.

### Top Violators

**Shows:**
- Ranked list of users with most violations
- User name, photo, count, status

**Use Cases:**
- Identify problematic users
- Check if bans working
- Spot abuse patterns

**Action:** If banned user still appearing, verify ban enforcement.

### Moderator Performance

**Metrics:**
- Reviews per moderator
- Average review time
- Performance rating

**Your Performance:**
- **Excellent:** < 60 seconds avg review time
- **Good:** 60-120 seconds
- **Average:** > 120 seconds

**Quality vs. Speed:** Prioritize quality! Don't rush.

### Date Range Selection

Change date range to view different periods:
- Last 7 Days (recent trends)
- Last 30 Days (monthly overview)
- Last 90 Days (quarterly trends)

---

## User Management

### Viewing User Moderation Records

1. Navigate to User Management
2. Search for user by name/email/ID
3. Click user to view record

**User Record Shows:**
- Current status (active/warned/suspended/banned)
- Total violations
- Severe violations
- Warnings issued
- Suspension count
- Current suspension end date (if applicable)
- Ban date and reason (if banned)

### Manual Actions (Advanced)

**Warning User:**
- Issue formal warning
- Send warning email
- Record in violation history

**Suspending User:**
- Set suspension duration (1, 7, 30 days, custom)
- Add reason
- User notified via email

**Banning User:**
- Permanent account restriction
- Requires reason
- Manager approval (if configured)
- User notified

**Reversing Actions:**
- Admins can unsuspend users
- Cannot reverse violations (only record notes)
- Bans require manager approval to reverse

---

## Best Practices

### Review Quality

**Do:**
- ✅ Review every piece of content fully
- ✅ Read all text carefully
- ✅ View images at full size
- ✅ Check user history before deciding
- ✅ Add clear, detailed notes
- ✅ Be consistent with guidelines
- ✅ Ask for help when unsure

**Don't:**
- ❌ Rush through reviews
- ❌ Make assumptions
- ❌ Approve without viewing fully
- ❌ Let personal biases influence decisions
- ❌ Skip notes
- ❌ Review when tired/distracted

### Time Management

**Recommended Schedule:**
- Review urgent items first (always)
- Spend 1-2 minutes per item (average)
- Take 10-minute breaks every hour
- Don't review more than 4 hours straight

**Productivity Tips:**
- Start with hardest items when fresh
- Batch similar content types
- Set daily review goals (e.g., 50 items)
- Use keyboard shortcuts (if available)

### Consistency

**Important:** Be consistent with:
- Guideline interpretation
- Violation severity assessment
- Note-taking style
- Approval/rejection thresholds

**How:**
- Review guidelines weekly
- Compare decisions with peers
- Participate in calibration sessions
- Document edge cases

### Self-Care

Content moderation can be emotionally taxing.

**Take Care of Yourself:**
- Take regular breaks
- Don't review before bed
- Talk to team if content bothers you
- Use counseling resources if needed
- Know your limits

**Red Flags:**
- Reviewing feels numbing
- You're irritable after work
- Disturbing content in your thoughts
- Avoiding work

**Action:** Speak with your manager immediately.

---

## Troubleshooting

### Common Issues

**Issue: Queue not loading**

**Solution:**
1. Refresh page (F5)
2. Clear browser cache
3. Check internet connection
4. Contact IT if persists

**Issue: Review modal won't open**

**Solution:**
1. Disable pop-up blocker
2. Try different browser
3. Clear cookies
4. Report bug if persists

**Issue: Can't see image in review modal**

**Solution:**
1. Check if image URL is broken
2. Try reloading modal
3. Check browser console for errors
4. Report to development team

**Issue: Submitted review but item still in queue**

**Solution:**
1. Refresh queue page
2. Check if review actually saved (check stats)
3. Don't review again (may duplicate)
4. Contact tech support

**Issue: Disagree with AI risk score**

**Solution:**
- This is normal! AI is guidance only.
- Use your judgment
- Document why you disagree in notes
- Report systematic AI errors to tech team

### When to Escalate

**Escalate to Manager when:**
- Unsure about complex decision
- Potential legal issues
- High-profile user violation
- Media attention likely
- Threatening content
- Child safety concerns (IMMEDIATE)

**How to Escalate:**
1. Click "Escalate" button (if available)
2. Or email manager with item link
3. For urgent: Call manager directly
4. For child safety: Call manager + authorities

---

## FAQs

**Q: How long should I spend on each review?**

A: Average 1-2 minutes. Urgent/complex items may take 3-5 minutes. Don't rush, but don't over-analyze.

**Q: What if I accidentally approve something I should have rejected?**

A: Contact your manager immediately. They can reverse the decision and re-review.

**Q: Can users appeal my decisions?**

A: Yes (if appeals enabled). Appeals go to senior moderators. Your decision and notes will be reviewed.

**Q: What if I'm not sure about a decision?**

A: When in doubt:
1. Re-check guidelines
2. Ask a peer/manager
3. If still unsure, reject (safer)
4. Document uncertainty in notes

**Q: How are my performance metrics calculated?**

A: Based on:
- Number of reviews
- Average review time
- Decision consistency (checked via audits)
- Appeals won/lost (if applicable)

**Q: Can I filter the queue to see only certain types of content?**

A: Yes! Use the filters at the top of the queue page.

**Q: What happens to users after multiple violations?**

A:
- Violations 1-2: Warnings
- Violation 3: 1-day suspension
- Violation 4: 7-day suspension
- Violation 5+: Permanent ban

(Severe violations may skip steps)

**Q: How do I report a bug or suggest an improvement?**

A: Use the "Feedback" button in the admin panel or email `moderation-support@connectsphere.com`.

**Q: What if I see illegal content (child exploitation, terrorism)?**

A: **STOP. ESCALATE IMMEDIATELY.**
1. Do NOT review further
2. Click "Escalate" and mark "Illegal Content"
3. Call manager immediately
4. For CSAM: Also call 1-800-THE-LOST (CyberTipline)
5. Document but don't describe in detail

**Q: Can I work remotely?**

A: Check with your manager. Some positions allow remote work with VPN access.

**Q: How often are guidelines updated?**

A: Quarterly or as needed. You'll be notified of changes and required to re-read.

**Q: What if a user contacts me directly about a decision?**

A: **Never respond directly.** Forward to community support team. Moderators should not engage with users.

---

## Quick Reference

### Review Decision Flowchart

```
Start
  ↓
View Content Fully
  ↓
Check AI Assessment
  ↓
Review User History
  ↓
Does it violate guidelines? ─ No → Check if borderline
  ↓ Yes                              ↓ Yes
Consider user history          Err on side of caution → REJECT
  ↓                                  ↓ No
Severe or repeat violator?           APPROVE
  ↓ Yes → REJECT
  ↓ No
First-time minor violation?
  ↓ Yes → Consider APPROVE
  ↓ No → REJECT

Add detailed notes → Submit
```

### Keyboard Shortcuts (if enabled)

- `A` - Approve
- `R` - Reject
- `N` - Add notes
- `Esc` - Close modal
- `→` - Next item
- `←` - Previous item
- `U` - Filter by Urgent
- `F` - Filter by Flagged

---

## Training Completion

### Congratulations!

You've completed the Admin Training Guide for the ConnectSphere Content Moderation System.

### Next Steps

1. [ ] Shadow experienced moderator (1-2 shifts)
2. [ ] Review community guidelines in detail
3. [ ] Complete practice reviews (test queue)
4. [ ] Get manager sign-off
5. [ ] Begin solo moderation with spot-checks

### Resources

- **Community Guidelines:** `/docs/community-guidelines.pdf`
- **Moderator Handbook:** `/docs/moderator-handbook.md`
- **Tech Support:** `support@connectsphere.com`
- **Manager:** `[Your Manager's Contact]`
- **Emergency Escalation:** `[Emergency Contact]`

---

**Welcome to the team! Thank you for helping keep ConnectSphere safe.**

---

**Document Version:** 1.0
**Last Updated:** November 18, 2025
**Next Review:** February 18, 2026
