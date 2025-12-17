# Workflow Creation Guide

A comprehensive guide to creating and managing workflows in the Flamoral Workflow Engine.

## Table of Contents

1. [Workflow Structure](#workflow-structure)
2. [Available Triggers](#available-triggers)
3. [Available Conditions](#available-conditions)
4. [Available Actions](#available-actions)
5. [Workflow Examples](#workflow-examples)
6. [Best Practices](#best-practices)

---

## Workflow Structure

Every workflow consists of three main components:

```json
{
  "name": "Workflow Name",
  "description": "What this workflow does",
  "trigger": { /* Single trigger */ },
  "conditions": [ /* Optional array of conditions */ ],
  "actions": [ /* Array of actions to execute */ ],
  "status": "draft|active|paused|archived",
  "priority": 0-100,
  "tags": ["tag1", "tag2"]
}
```

### Fields Explained

- **name** (required): Human-readable name for the workflow
- **description** (optional): Detailed explanation of the workflow's purpose
- **trigger** (required): Event that starts the workflow
- **conditions** (optional): Criteria that must be met to execute actions
- **actions** (required): Operations to perform when triggered
- **status** (required): Current state of the workflow
- **priority** (optional): Higher priority workflows execute first (0-100)
- **tags** (optional): Categories for organization

---

## Available Triggers

### 1. Match Events

#### match_created
Triggered when two users match.

**Expected Data:**
```json
{
  "userId": "string",
  "matchedUserId": "string",
  "matchId": "string",
  "timestamp": "ISO-8601"
}
```

**Use Cases:**
- Send congratulations messages
- Award bonus coins for first match
- Provide conversation starters

#### like_received
Triggered when a user receives a like.

**Expected Data:**
```json
{
  "likerId": "string",
  "receiverId": "string",
  "timestamp": "ISO-8601"
}
```

**Use Cases:**
- Notify user of new like
- Encourage premium upgrade to see who liked them

#### super_like
Triggered when a user receives a super like.

**Expected Data:**
```json
{
  "likerId": "string",
  "receiverId": "string",
  "timestamp": "ISO-8601"
}
```

**Use Cases:**
- Highlight super like with special notification
- Boost visibility of both users

### 2. Messaging Events

#### message_sent
Triggered when a user sends a message.

**Expected Data:**
```json
{
  "senderId": "string",
  "receiverId": "string",
  "messageId": "string",
  "content": "string",
  "timestamp": "ISO-8601"
}
```

**Use Cases:**
- Track messaging milestones
- Award engagement badges
- Monitor for spam/abuse

### 3. Payment Events

#### subscription_purchase
Triggered when a user purchases a subscription.

**Expected Data:**
```json
{
  "userId": "string",
  "subscriptionId": "string",
  "planType": "string",
  "amount": "number",
  "timestamp": "ISO-8601"
}
```

**Use Cases:**
- Welcome premium users
- Grant bonus features
- Send thank you messages

#### coin_purchase
Triggered when a user purchases coins.

**Expected Data:**
```json
{
  "userId": "string",
  "amount": "number",
  "coins": "number",
  "timestamp": "ISO-8601"
}
```

**Use Cases:**
- Add bonus coins
- Thank users for purchase
- Suggest features to use coins on

### 4. User Lifecycle Events

#### first_login
Triggered when a user logs in for the first time.

**Expected Data:**
```json
{
  "userId": "string",
  "timestamp": "ISO-8601"
}
```

**Use Cases:**
- Welcome new users
- Start onboarding flow
- Grant welcome bonuses

#### profile_completed
Triggered when a user completes their profile.

**Expected Data:**
```json
{
  "userId": "string",
  "completeness": "number",
  "timestamp": "ISO-8601"
}
```

**Use Cases:**
- Reward profile completion
- Activate profile boost
- Congratulate user

#### abandoned_onboarding
Triggered when a user abandons the onboarding process.

**Expected Data:**
```json
{
  "userId": "string",
  "lastStep": "string",
  "timestamp": "ISO-8601"
}
```

**Use Cases:**
- Re-engage users
- Offer incentives to complete
- Send reminder emails

#### user_inactive_7d
Triggered when a user has been inactive for 7 days.

**Expected Data:**
```json
{
  "userId": "string",
  "lastActiveAt": "ISO-8601",
  "timestamp": "ISO-8601"
}
```

**Use Cases:**
- Win-back campaigns
- Special offers for return
- Show new matches/features

---

## Available Conditions

Conditions filter which users receive actions. All conditions must pass (AND logic) unless specified otherwise.

### 1. user_premium

Check if user has an active premium subscription.

```json
{
  "type": "user_premium",
  "operator": "eq",
  "value": true
}
```

**Operators:** `eq`, `neq`

### 2. profile_complete_percentage

Check user's profile completion percentage.

```json
{
  "type": "profile_complete_percentage",
  "operator": "gte",
  "value": 80
}
```

**Operators:** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`

### 3. match_count

Check number of matches a user has.

```json
{
  "type": "match_count",
  "operator": "gt",
  "value": 10
}
```

**Operators:** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`

### 4. message_count

Check number of messages sent by user.

```json
{
  "type": "message_count",
  "operator": "gte",
  "value": 50
}
```

**Operators:** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`

### Multiple Conditions

Use `logicalOperator` to chain conditions:

```json
{
  "conditions": [
    {
      "type": "user_premium",
      "operator": "eq",
      "value": true
    },
    {
      "type": "profile_complete_percentage",
      "operator": "gte",
      "value": 90,
      "logicalOperator": "AND"
    }
  ]
}
```

---

## Available Actions

### 1. send_push

Send push notification to user's device.

```json
{
  "type": "send_push",
  "config": {
    "title": "Notification Title",
    "body": "Notification message",
    "data": {
      "key": "value"
    }
  },
  "delay": 0
}
```

### 2. send_sms

Send SMS message to user's phone.

```json
{
  "type": "send_sms",
  "config": {
    "message": "Your SMS message here"
  },
  "delay": 0
}
```

### 3. send_email

Send email to user.

```json
{
  "type": "send_email",
  "config": {
    "subject": "Email Subject",
    "body": "Email body",
    "template": "template_name",
    "templateData": {
      "key": "value"
    }
  },
  "delay": 0
}
```

### 4. send_in_app_message

Display in-app notification.

```json
{
  "type": "send_in_app_message",
  "config": {
    "title": "Message Title",
    "message": "Message content",
    "type": "info|success|warning|error",
    "actionUrl": "/path/to/action"
  },
  "delay": 0
}
```

### 5. add_coins

Add coins to user's account.

```json
{
  "type": "add_coins",
  "config": {
    "amount": 50,
    "reason": "reward_description"
  },
  "delay": 0,
  "retryOnFailure": true
}
```

### 6. activate_boost

Activate profile boost for user.

```json
{
  "type": "activate_boost",
  "config": {
    "duration": 30,
    "type": "profile_boost"
  },
  "delay": 0,
  "retryOnFailure": true
}
```

### 7. update_profile_score

Adjust user's profile score.

```json
{
  "type": "update_profile_score",
  "config": {
    "scoreAdjustment": 10,
    "reason": "adjustment_reason"
  },
  "delay": 0
}
```

### 8. promote_user

Increase user visibility in discovery.

```json
{
  "type": "promote_user",
  "config": {
    "duration": 60,
    "priority": "high|medium|low"
  },
  "delay": 0
}
```

### Action Parameters

- **delay** (optional): Milliseconds to wait before executing
- **retryOnFailure** (optional): Retry action if it fails

---

## Workflow Examples

### Example 1: Welcome New Users

```json
{
  "name": "Welcome New Users",
  "description": "Greet new users and give them a starting boost",
  "trigger": {
    "type": "first_login"
  },
  "conditions": [],
  "actions": [
    {
      "type": "send_push",
      "config": {
        "title": "Welcome to Flamoral!",
        "body": "Start your dating journey today!"
      }
    },
    {
      "type": "add_coins",
      "config": {
        "amount": 20,
        "reason": "welcome_bonus"
      },
      "delay": 2000
    },
    {
      "type": "send_in_app_message",
      "config": {
        "title": "Getting Started",
        "message": "Complete your profile to unlock matching!",
        "type": "info"
      },
      "delay": 5000
    }
  ],
  "status": "active",
  "priority": 10,
  "tags": ["onboarding", "welcome"]
}
```

### Example 2: Re-engage Inactive Premium Users

```json
{
  "name": "Win Back Premium Users",
  "description": "Special offer for inactive premium subscribers",
  "trigger": {
    "type": "user_inactive_7d"
  },
  "conditions": [
    {
      "type": "user_premium",
      "operator": "eq",
      "value": true
    }
  ],
  "actions": [
    {
      "type": "send_email",
      "config": {
        "subject": "We Miss You!",
        "template": "premium_winback",
        "templateData": {
          "offerCode": "COMEBACK50"
        }
      }
    },
    {
      "type": "send_push",
      "config": {
        "title": "Check Your New Matches",
        "body": "You have potential matches waiting!"
      },
      "delay": 3600000
    },
    {
      "type": "add_coins",
      "config": {
        "amount": 50,
        "reason": "premium_winback"
      },
      "delay": 3600000
    }
  ],
  "status": "active",
  "priority": 9,
  "tags": ["retention", "premium", "inactive"]
}
```

### Example 3: Milestone Celebration

```json
{
  "name": "100 Messages Milestone",
  "description": "Celebrate users who send 100 messages",
  "trigger": {
    "type": "message_sent"
  },
  "conditions": [
    {
      "type": "message_count",
      "operator": "eq",
      "value": 100
    }
  ],
  "actions": [
    {
      "type": "send_push",
      "config": {
        "title": "🎉 Milestone Reached!",
        "body": "You've sent 100 messages! Here's a reward."
      }
    },
    {
      "type": "add_coins",
      "config": {
        "amount": 25,
        "reason": "message_milestone_100"
      },
      "delay": 1000
    },
    {
      "type": "activate_boost",
      "config": {
        "duration": 30,
        "type": "profile_boost"
      },
      "delay": 2000
    }
  ],
  "status": "active",
  "priority": 7,
  "tags": ["engagement", "milestone"]
}
```

---

## Best Practices

### 1. Naming Conventions

- Use descriptive names: "Welcome New Premium Users" not "Workflow 1"
- Include trigger type in name: "First Login: Welcome Message"
- Keep names under 50 characters

### 2. Workflow Organization

- Use tags to categorize: `["retention"]`, `["monetization"]`, `["onboarding"]`
- Set appropriate priorities (0-100):
  - Critical workflows: 90-100
  - High priority: 70-89
  - Normal: 50-69
  - Low: 0-49

### 3. Condition Design

- Keep conditions simple and focused
- Use multiple workflows instead of complex condition logic
- Test conditions thoroughly before activating
- Consider using OR logic sparingly

### 4. Action Sequencing

- Use delays between related actions
- Order actions by importance (most critical first)
- Enable `retryOnFailure` for important actions
- Keep action chains under 5 actions when possible

### 5. Testing Strategy

1. Create workflow in "draft" status
2. Test with manual trigger
3. Verify each action executes correctly
4. Check execution logs
5. Activate workflow
6. Monitor for 24 hours
7. Review analytics

### 6. Performance Optimization

- Avoid unnecessary conditions
- Use specific triggers instead of catch-all
- Set reasonable delays between actions
- Monitor workflow execution times
- Archive unused workflows

### 7. User Experience

- Don't overwhelm users with notifications
- Space out communications (use delays)
- Provide value in every interaction
- Make messages personal and relevant
- Test notification copy

### 8. Monitoring

- Check execution success rates weekly
- Review failed executions
- Monitor action performance
- Track user engagement metrics
- A/B test workflow variations

### 9. Security

- Never include sensitive data in workflow configs
- Use internal service keys for API calls
- Log all workflow executions
- Review workflows for potential abuse
- Implement rate limiting where needed

### 10. Documentation

- Document workflow purpose
- Note business logic in description
- Track changes and versions
- Share with team members
- Keep templates updated

---

## Common Patterns

### Pattern 1: Progressive Disclosure

Start simple, add complexity over time:

```
Day 1: Welcome message
Day 3: Feature tutorial
Day 7: Premium offer
Day 14: Success story
```

### Pattern 2: Milestone Rewards

Celebrate user achievements:

```
First match → Congratulations + 10 coins
10 matches → Badge + 25 coins
50 matches → Special boost + 50 coins
```

### Pattern 3: Re-engagement Ladder

Graduated approach to inactive users:

```
3 days inactive → Friendly reminder
7 days inactive → Special offer
14 days inactive → Major incentive
30 days inactive → Last chance offer
```

### Pattern 4: Conditional Incentives

Target specific user segments:

```
Premium + High engagement → Extra perks
Free + Complete profile → Upgrade nudge
New user + Many likes → Boost encouragement
```

---

## Troubleshooting

### Workflow Not Triggering

1. Check workflow status (must be "active")
2. Verify trigger type matches event
3. Check RabbitMQ queue connections
4. Review execution logs for errors
5. Test with manual trigger

### Actions Not Executing

1. Verify conditions are met
2. Check action configuration
3. Review service URLs in config
4. Test internal service authentication
5. Check retry attempts

### Poor Performance

1. Simplify complex conditions
2. Reduce number of actions
3. Add delays between actions
4. Check database queries
5. Monitor external service response times

---

## Getting Help

- API Documentation: `/api/docs`
- Execution Logs: Check database `workflow_executions` table
- Analytics Dashboard: `/api/v1/analytics/dashboard`
- Health Check: `/health`

For additional support, contact the development team.
