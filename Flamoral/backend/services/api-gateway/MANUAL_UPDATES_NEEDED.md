# Manual Updates Required for API Gateway

Three new controllers have been created successfully:
1. `src/controllers/policy.controller.ts`
2. `src/controllers/automation.controller.ts`
3. `src/controllers/workflow.controller.ts`

Due to file modification conflicts (likely IDE auto-save), please manually apply the following changes:

## 1. Update `src/controllers/controllers.module.ts`

Add the following imports at the top (after line 17):
```typescript
import { PolicyController } from './policy.controller';
import { AutomationController } from './automation.controller';
import { WorkflowController } from './workflow.controller';
```

Add the following controllers to the controllers array (before the closing bracket at line 62):
```typescript
    // Policy Management
    PolicyController,

    // Automation
    AutomationController,

    // Workflow Engine
    WorkflowController,
```

## 2. Update `src/config/configuration.ts`

Add the following service URLs to the services object (after line 46, before the closing brace):
```typescript
    policyService: process.env.POLICY_SERVICE_URL || 'http://localhost:3012',
    automationService: process.env.AUTOMATION_SERVICE_URL || 'http://localhost:3013',
    workflowService: process.env.WORKFLOW_SERVICE_URL || 'http://localhost:3014',
```

## 3. Optional: Update `src/services/proxy.service.ts`

Add timeout configurations for the new services (around line 64):
```typescript
    policyService: 10000,      // Policy service, 10s
    automationService: 15000,   // Automation service, 15s
    workflowService: 15000,     // Workflow engine, 15s
```

## Verification

After making these changes, restart the API Gateway service and verify:
- The controllers are registered correctly
- The service URLs are configured
- The routes are accessible at:
  - `http://localhost:4000/policy/*`
  - `http://localhost:4000/automation/*`
  - `http://localhost:4000/workflow/*`
