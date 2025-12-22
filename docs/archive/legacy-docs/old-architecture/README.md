# Architecture Documentation

System architecture and design documentation for the Flamoral dating platform.

## Contents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [Architectural-Diagram.md](./Architectural-Diagram.md) - Visual diagrams
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database design
- [PRODUCT_SPECIFICATION.md](./PRODUCT_SPECIFICATION.md) - Technical specs

## Overview

Flamoral uses a microservices architecture on Azure infrastructure:
- **16+ microservices** (Node.js/Express + Go)
- **Azure Kubernetes Service** for orchestration
- **PostgreSQL + Cosmos DB** for data storage
- **Azure Service Bus** for async messaging

## Key Principles

1. Microservices Architecture
2. API-First Design (OpenAPI)
3. Event-Driven Communication
4. Cloud-Native (Azure)
5. Security by Design
