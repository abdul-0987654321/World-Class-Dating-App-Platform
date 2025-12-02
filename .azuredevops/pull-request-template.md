# Pull Request

## Work Item Link
<!-- Required: Link to Azure Boards work item using AB#123 format -->
**Work Item:** AB#

## Description
<!-- Provide a clear and concise description of your changes -->

### What changed?


### Why did it change?


### How does it work?


## Type of Change
<!-- Check all that apply -->
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Performance improvement
- [ ] Code refactoring
- [ ] Documentation update
- [ ] Configuration change
- [ ] Database migration

## Components Affected
<!-- Check all services/components affected by this change -->
- [ ] API Gateway
- [ ] User Service
- [ ] Matching Service
- [ ] Messaging Service
- [ ] Media Service
- [ ] Notification Service
- [ ] Payment Service
- [ ] Moderation Service
- [ ] Analytics Service
- [ ] Frontend Web App
- [ ] Mobile App (iOS)
- [ ] Mobile App (Android)
- [ ] Infrastructure
- [ ] Database
- [ ] Documentation

## Testing
<!-- Describe the testing you've performed -->

### Test Coverage
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

### Test Results
<!-- Provide test results or links to test runs -->
- **Unit Tests:** ✅ Passed | ❌ Failed | ⏭️ Skipped
- **Integration Tests:** ✅ Passed | ❌ Failed | ⏭️ Skipped
- **E2E Tests:** ✅ Passed | ❌ Failed | ⏭️ Skipped

### Test Evidence
<!-- Add screenshots, logs, or test outputs if applicable -->


## Security Considerations
<!-- Address any security implications -->
- [ ] No security impact
- [ ] Security review completed
- [ ] Secrets/credentials properly managed
- [ ] Authentication/authorization tested
- [ ] Input validation implemented
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection verified

### Security Checklist
- [ ] No sensitive data in logs
- [ ] No hardcoded credentials
- [ ] Dependencies security scan passed
- [ ] Code security scan (SonarQube/SAST) passed

## Database Changes
<!-- If applicable, describe database changes -->
- [ ] No database changes
- [ ] Schema changes (migrations included)
- [ ] Data migrations required
- [ ] Backward compatible
- [ ] Rollback script provided

### Migration Details
<!-- If database changes are included -->


## API Changes
<!-- If applicable, describe API changes -->
- [ ] No API changes
- [ ] New endpoints added
- [ ] Existing endpoints modified
- [ ] Endpoints deprecated
- [ ] Breaking API changes
- [ ] API documentation updated

### API Documentation
<!-- Link to updated API docs or describe changes -->


## Performance Impact
<!-- Describe any performance implications -->
- [ ] No performance impact
- [ ] Performance improved
- [ ] Performance regression (with justification)
- [ ] Load testing completed
- [ ] Performance benchmarks attached

### Performance Metrics
<!-- If applicable, provide before/after metrics -->


## Deployment Notes
<!-- Important information for deployment -->

### Pre-deployment Steps
<!-- Any steps required before deploying this change -->
1.

### Post-deployment Steps
<!-- Any steps required after deploying this change -->
1.

### Rollback Plan
<!-- How to rollback if issues occur -->


### Configuration Changes
<!-- Any environment variables, secrets, or config changes needed -->
- [ ] No configuration changes
- [ ] Environment variables updated
- [ ] Secrets added/modified
- [ ] Feature flags configured

## Dependencies
<!-- List any dependencies or related PRs -->
- Depends on:
- Blocks:
- Related PRs:

## Breaking Changes
<!-- If this is a breaking change, describe the impact and migration path -->
- [ ] No breaking changes
- [ ] Breaking changes documented below

### Migration Guide
<!-- Provide migration guide for breaking changes -->


## Documentation
<!-- Documentation updates -->
- [ ] Code comments added/updated
- [ ] README updated
- [ ] API documentation updated
- [ ] Architecture documentation updated
- [ ] User guide updated
- [ ] No documentation needed

## Checklist
<!-- Ensure all items are completed before requesting review -->

### Code Quality
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] No unnecessary console.log or debug code
- [ ] No commented-out code
- [ ] TypeScript types properly defined (no `any` unless necessary)
- [ ] Error handling implemented
- [ ] Logging added where appropriate

### Testing
- [ ] All tests pass locally
- [ ] New tests added for new functionality
- [ ] Edge cases covered
- [ ] Test coverage maintained/improved

### Documentation
- [ ] README updated if needed
- [ ] API documentation updated if needed
- [ ] Code comments added for complex logic
- [ ] CHANGELOG.md updated

### Security
- [ ] Security best practices followed
- [ ] No sensitive data exposed
- [ ] Input validation implemented
- [ ] Authorization checks in place

### Deployment
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Environment variables documented
- [ ] Deployment steps documented

## Screenshots/Videos
<!-- If applicable, add screenshots or videos demonstrating the changes -->


## Additional Context
<!-- Add any other context about the pull request here -->


## Reviewer Notes
<!-- Any specific areas you'd like reviewers to focus on -->


---

## Review Checklist (For Reviewers)
<!-- Reviewers should verify these items -->

### Code Review
- [ ] Code logic is correct and efficient
- [ ] Code follows project conventions
- [ ] No code smells or anti-patterns
- [ ] Error handling is appropriate
- [ ] No security vulnerabilities
- [ ] Performance implications considered

### Testing
- [ ] Tests are adequate and pass
- [ ] Edge cases are covered
- [ ] Test quality is good

### Documentation
- [ ] Documentation is clear and complete
- [ ] API changes are documented
- [ ] Breaking changes are documented

### Architecture
- [ ] Changes align with system architecture
- [ ] No unnecessary dependencies added
- [ ] Scalability considered
- [ ] Maintainability considered

---

**Note:** This PR will be automatically linked to the work item(s) referenced above. Commits should also reference work items using `AB#123` format for full traceability.
