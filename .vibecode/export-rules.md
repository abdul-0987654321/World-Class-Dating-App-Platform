# Vibecode Export Rules for Flamoral

This document defines the rules and conventions for exporting code from Vibecode to the Flamoral project.

## What Vibecode Can Export

### Web Application (React)
- UI components to `apps/web-app/src/ui`
- Page layouts and views
- Reusable form components
- Modal and dialog components
- Navigation components

### Mobile Application (React Native)
- Screen components to `apps/mobile-app/src/screens`
- Shared components to `apps/mobile-app/src/components`
- Navigation flows
- Native UI elements

### Shared Packages
- API client functions to `packages/api-client/src`
- UI kit components to shared packages

## What Vibecode Cannot Export

The following are explicitly prohibited from export:

1. **Secrets and Credentials**
   - API keys
   - Authentication tokens
   - Environment variables containing sensitive data
   - Database connection strings

2. **Build Configurations**
   - webpack.config.js
   - vite.config.ts
   - babel.config.js
   - tsconfig.json
   - package.json modifications

3. **CI/CD Files**
   - GitHub Actions workflows (.github/workflows/*)
   - GitLab CI configurations
   - Jenkinsfiles
   - Deployment scripts

4. **Infrastructure Code**
   - Terraform files
   - Docker configurations
   - Kubernetes manifests

## File Naming Conventions

### Components
- Use PascalCase for component files: `FlamoralButton.tsx`
- Use the `Flamoral` prefix for all components
- Test files use `.test.tsx` suffix: `FlamoralButton.test.tsx`
- Story files use `.stories.tsx` suffix: `FlamoralButton.stories.tsx`

### Directories
- Use kebab-case for directories: `user-profile/`
- Group related components in feature directories

### Styles
- Styled-components files use `.styles.ts` suffix when separated
- Prefer co-located styles within component files

## Component Structure Requirements

### Standard Component Template

```tsx
import React from 'react';
import styled from 'styled-components';
import { ApiClient } from '@flamoral/api-client';
import { BaseComponent } from '@flamoral/ui-kit';

interface FlamoralComponentNameProps {
  // Props definition
}

const StyledContainer = styled.div`
  // Styles
`;

export const FlamoralComponentName: React.FC<FlamoralComponentNameProps> = (props) => {
  // Component logic
  return (
    <StyledContainer>
      {/* Component JSX */}
    </StyledContainer>
  );
};

export default FlamoralComponentName;
```

### Required Exports
- Named export for the component
- Default export for lazy loading support
- TypeScript interface for props

### Component Guidelines
1. All components must be TypeScript (.tsx)
2. Use functional components with hooks
3. Props interfaces must be explicitly defined
4. Include JSDoc comments for complex components

## API Integration Patterns

### Using the API Client

All API calls must go through the `@flamoral/api-client` package:

```tsx
import { useApi, endpoints } from '@flamoral/api-client';

const FlamoralUserProfile: React.FC = () => {
  const { data, loading, error } = useApi(endpoints.user.profile);

  // Component logic
};
```

### API Client Location
- All API client code resides in `packages/api-client/src`
- Do not create API calls directly in components
- Use the provided hooks and utilities

### Error Handling
- Use the standardized error handling from the API client
- Display user-friendly error messages
- Log errors appropriately for debugging

### Data Fetching Patterns
1. Use provided React hooks for data fetching
2. Implement loading states
3. Handle error states gracefully
4. Cache responses where appropriate

## Style System

### Styled Components
- Use `styled-components` for all styling
- Follow the theme structure from `@flamoral/ui-kit`
- Use theme tokens for colors, spacing, and typography

### Theme Integration

```tsx
import styled from 'styled-components';

const StyledButton = styled.button`
  background-color: ${({ theme }) => theme.colors.primary};
  padding: ${({ theme }) => theme.spacing.md};
  font-family: ${({ theme }) => theme.typography.fontFamily};
`;
```

## Import Aliases

Use the configured import aliases:

| Alias | Package |
|-------|---------|
| `@flamoral/api-client` | API client utilities |
| `@flamoral/ui-kit` | Shared UI components |
