# Admin Service

Comprehensive admin dashboard and management service for the Flamoral Dating Platform.

## Features

### Role-Based Access Control (RBAC)
- **Super Admin**: Full system access
- **Admin**: User management, moderation, analytics, settings
- **Moderator**: Content moderation, reports
- **Support**: Ticket management, user support
- **Analyst**: Analytics and reporting

### Dashboard
- Real-time statistics
- User metrics
- Revenue overview
- Recent activity feed

### User Management
- Search and filter users
- View user details and activity
- Ban/unban users
- Verify users
- Delete users (with GDPR compliance)
- Reset passwords

### Content Moderation
- Review flagged content
- Approve/reject content
- Ban users for violations
- AI-powered auto-moderation

### Reports Handling
- View user reports
- Investigate reports
- Take action (warn, suspend, ban)
- Track resolution status

### Analytics Dashboard
- User metrics (DAU, MAU, retention)
- Engagement metrics
- Revenue metrics (MRR, ARR, ARPU, LTV)
- Conversion and churn rates

### System Health Monitoring
- Service status checks
- Database connection monitoring
- Redis status
- System metrics (CPU, memory)
- Service logs viewer

### A/B Testing Management
- Create and manage A/B tests
- Define variants and allocations
- Track test metrics
- Analyze results

### Support Ticket Management
- View and manage support tickets
- Assign tickets to admins
- Respond to user inquiries
- Track ticket status and priority
- Ticket statistics

### Audit Logging
- All admin actions logged
- IP address and user agent tracking
- Comprehensive audit trail
- Exportable logs

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `REDIS_HOST`, `REDIS_PORT`
- `JWT_ADMIN_SECRET`
- Service URLs for health checks

## Running

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

Docker:
```bash
docker build -t flamoral-admin-service .
docker run -p 3010:3010 flamoral-admin-service
```

## API Endpoints

### Dashboard
- `GET /api/admin/dashboard` - Get dashboard stats

### Users
- `GET /api/admin/users` - List users
- `GET /api/admin/users/:userId` - Get user details
- `POST /api/admin/users/:userId/ban` - Ban user
- `POST /api/admin/users/:userId/unban` - Unban user
- `POST /api/admin/users/:userId/verify` - Verify user
- `DELETE /api/admin/users/:userId` - Delete user
- `POST /api/admin/users/:userId/reset-password` - Reset password

### System Health
- `GET /api/admin/health` - Get system health
- `GET /api/admin/health/services/:serviceName/logs` - Get service logs
- `POST /api/admin/health/services/:serviceName/restart` - Restart service

### A/B Tests
- `GET /api/admin/ab-tests` - List A/B tests
- `GET /api/admin/ab-tests/:testId` - Get test details
- `POST /api/admin/ab-tests` - Create test
- `PUT /api/admin/ab-tests/:testId` - Update test
- `POST /api/admin/ab-tests/:testId/start` - Start test
- `POST /api/admin/ab-tests/:testId/pause` - Pause test
- `POST /api/admin/ab-tests/:testId/complete` - Complete test
- `DELETE /api/admin/ab-tests/:testId` - Delete test
- `GET /api/admin/ab-tests/:testId/metrics` - Get test metrics

### Support Tickets
- `GET /api/admin/tickets` - List tickets
- `GET /api/admin/tickets/stats` - Get ticket statistics
- `GET /api/admin/tickets/:ticketId` - Get ticket details
- `POST /api/admin/tickets/:ticketId/assign` - Assign ticket
- `POST /api/admin/tickets/:ticketId/messages` - Add message
- `PUT /api/admin/tickets/:ticketId/status` - Update status
- `PUT /api/admin/tickets/:ticketId/priority` - Update priority

### Audit Logs
- `GET /api/admin/audit-logs` - Query audit logs

## Security

- JWT authentication required for all endpoints
- Role-based access control (RBAC)
- Permission-based authorization
- All admin actions audited
- IP address logging
- Secure password handling
- Rate limiting (recommended to add)

## Testing

```bash
npm test
```

## License

Proprietary - Flamoral Dating Platform
