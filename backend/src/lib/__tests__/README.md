# Database Service Tests

This directory contains unit tests for the singleton PrismaClient database service.

## Test Coverage

### Database Singleton Tests (`database.test.ts`)

- ✅ **Singleton Pattern**: Ensures only one PrismaClient instance is created
- ✅ **Global Instance Management**: Tests development vs production behavior
- ✅ **Configuration**: Verifies correct PrismaClient configuration
- ✅ **Graceful Shutdown**: Tests process signal handlers
- ✅ **Service Methods**: Tests DatabaseService utility methods

### Health Endpoint Tests (`../routes/__tests__/health.test.ts`)

- ✅ **Basic Health Check**: Tests `/health` endpoint
- ✅ **Detailed Health Check**: Tests `/health/detailed` with database connectivity
- ✅ **Database Health**: Tests `/health/database` endpoint
- ✅ **Readiness Check**: Tests `/health/ready` for container health checks
- ✅ **Liveness Check**: Tests `/health/live` for container health checks
- ✅ **Error Handling**: Tests database failure scenarios
- ✅ **Response Times**: Tests performance monitoring

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run only database service tests
npm test -- database

# Run only health endpoint tests
npm test -- health
```

## Test Structure

```
src/
├── lib/
│   ├── __tests__/
│   │   ├── database.test.ts      # Unit tests for database service
│   │   └── README.md             # This file
│   └── database.ts               # Database service implementation
└── routes/
    ├── __tests__/
    │   └── health.test.ts        # Integration tests for health endpoints
    └── health.ts                 # Health endpoint implementation
```

## Mock Strategy

### Database Service Tests
- Mock `@prisma/client` PrismaClient constructor
- Test singleton behavior without actual database connection
- Verify configuration and lifecycle management

### Health Endpoint Tests  
- Mock the database service module
- Test HTTP endpoints with Express supertest
- Verify error handling and response formats

## Key Test Scenarios

1. **Singleton Enforcement**: Multiple imports return same instance
2. **Development Hot Reload**: Global instance reuse in development
3. **Production Isolation**: No global instance in production
4. **Database Connectivity**: Health checks verify database status
5. **Error Handling**: Graceful degradation when database is unavailable
6. **Performance Monitoring**: Response time measurement
7. **Container Health Checks**: Kubernetes-compatible ready/live endpoints

## Adding New Tests

When adding new database-dependent code:

1. **Mock the database service**: Use `vi.mock('../../lib/database.js')`
2. **Test both success and failure cases**: Mock resolved and rejected promises
3. **Verify singleton usage**: Ensure code uses `prisma` import, not `new PrismaClient()`
4. **Test cleanup**: Include proper teardown in `afterEach`

Example:
```typescript
import { vi } from 'vitest'

const mockPrisma = {
  user: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}

vi.mock('../../lib/database.js', () => ({
  prisma: mockPrisma,
}))
```