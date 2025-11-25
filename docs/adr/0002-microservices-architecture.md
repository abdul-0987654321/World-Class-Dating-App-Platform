# ADR 0002: Microservices Architecture

## Status
Accepted

## Context
The dating application needs to:
- Scale different components independently
- Support rapid feature development
- Handle varying loads on different features (discovery vs messaging)
- Enable team autonomy and parallel development
- Maintain high availability

## Decision
We will use a microservices architecture with the following services:

### Core Services
| Service | Responsibility | Database |
|---------|---------------|----------|
| API Gateway | Request routing, authentication, rate limiting | - |
| User Service | User profiles, preferences, authentication | PostgreSQL |
| Matching Service | Match algorithm, swipe actions, compatibility | PostgreSQL + Redis |
| Messaging Service | Real-time chat, message history | PostgreSQL + Redis |
| Media Service | Photo/video upload, processing, CDN | Blob Storage |
| Notification Service | Push notifications, email, SMS | PostgreSQL |
| Payment Service | Subscriptions, in-app purchases | PostgreSQL |
| Moderation Service | Content moderation, safety | PostgreSQL |
| Analytics Service | User analytics, business metrics | ClickHouse |

### Communication Patterns
- **Synchronous**: REST/GraphQL for client requests
- **Asynchronous**: Azure Service Bus for inter-service events
- **Real-time**: WebSocket via Azure SignalR

### Service Mesh
- Use Istio for service-to-service communication
- mTLS for all internal traffic
- Circuit breakers and retries

## Consequences

### Positive
- Independent scaling per service
- Technology flexibility per service
- Fault isolation
- Team autonomy
- Easier deployment of individual services

### Negative
- Increased operational complexity
- Network latency between services
- Distributed transaction challenges
- More complex debugging
- Higher infrastructure costs

### Mitigations
- Implement comprehensive observability (traces, logs, metrics)
- Use saga pattern for distributed transactions
- Implement circuit breakers and fallbacks
- Use feature flags for gradual rollouts
