# Backend Service Docker Compose Files - Migration TODO

## Remaining Docker Compose Files

The following backend service directories still contain docker-compose files that should be evaluated:

### Files Detected

1. `backend/services/ai-services/dating-coach-service/docker-compose.dating-coach.yml`
2. `backend/services/api-gateway/docker-compose.dev.yml`
3. `backend/services/automation-service/docker-compose.yml`
4. `backend/services/realtime-service/docker-compose.yml`
5. `backend/services/workflow-engine/docker-compose.yml`

## Recommended Actions

### Option 1: Consolidate into Main Compose Files (Recommended)
- Review each service's docker-compose configuration
- Integrate service configurations into:
  - `infrastructure/local-dev/docker-compose.yml` (main development)
  - `infrastructure/local-dev/docker-compose.services.yml` (service-specific)
- Remove individual service docker-compose files
- This provides a unified development experience

### Option 2: Move to Local Dev Directory
- If services require standalone compose files for development
- Move them to `infrastructure/local-dev/services/`
- Update any local development documentation
- Add references in `infrastructure/local-dev/README.md`

### Option 3: Document and Keep (Less Recommended)
- If services absolutely need standalone compose files
- Add clear warnings in each file about local dev only usage
- Update `.github/scripts/check-docker-compose.sh` to exclude these paths
- Document in `infrastructure/local-dev/README.md`

## Why This Matters

1. **Consistency**: All docker-compose files in one location
2. **Clarity**: Developers know where to find local dev configs
3. **Azure-Only Production**: Reinforces that production uses AKS
4. **Maintainability**: Easier to update and maintain

## Next Steps

1. Review each service's docker-compose file
2. Decide which option fits best for each service
3. Implement the migration
4. Update documentation
5. Test that local development still works
6. Update CI checks if needed

## Related Files

- Main compose files: `infrastructure/local-dev/docker-compose*.yml`
- README: `infrastructure/local-dev/README.md`
- CI check: `.github/scripts/check-docker-compose.sh`
- Workflow: `.github/workflows/validate-docker-compose.yml`
