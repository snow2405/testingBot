# Test Coverage Summary

This document outlines the test coverage for the GitHub PR Bot project.

## Test Files

### Core Tests
- **api.test.js** - Tests for the API client module (token management, auth, repos, jobs, PR creation)
- **components.test.jsx** - Tests for React components (Login, Connect, Dashboard pages)
- **app.test.jsx** - Tests for the main App component and routing logic

### API Handlers Tests
- **handlers.test.js** - Original tests for GitHub OAuth and helper functions
- **auth-handlers.test.js** - Tests for authentication API handlers
  - `POST /api/auth/github` - OAuth URL generation
  - `GET /api/auth/me` - Current user retrieval
- **repos-jobs-handlers.test.js** - Tests for repos and jobs API handlers
  - `GET /api/repos` - Repository listing
  - `GET /api/jobs` - Job listing
  - `GET /api/jobs/[id]` - Job status retrieval
- **create-pr-handler.test.js** - Tests for PR creation handler
  - `POST /api/create-pr` - Create PR with AI-generated content

### Database & External Services Tests
- **database.test.js** - Tests for database schema and Supabase query patterns
- **github.test.js** - Tests for GitHub integration (Octokit operations)

## Coverage Areas

### API Endpoints
✅ POST /api/auth/github - OAuth URL generation
✅ GET /api/auth/me - User info retrieval
✅ GET /api/auth/callback - OAuth callback (integration tested)
✅ GET /api/repos - Repository listing
✅ POST /api/create-pr - PR creation
✅ GET /api/jobs - Job listing
✅ GET /api/jobs/[id] - Job status

### Components
✅ App - Main app component with routing and auth
✅ Login - GitHub login page
✅ Connect - GitHub App installation page
✅ Dashboard - Main dashboard with repos and jobs

### Utilities
✅ API client (src/api.js)
✅ GitHub integration (lib/github.js)
✅ Database operations (lib/supabase.js - mocked)

### Error Handling
✅ Missing authorization
✅ Invalid/expired tokens
✅ Unsupported HTTP methods (405)
✅ Missing required fields (400)
✅ Resource not found (404)
✅ Server errors (500)

### Authentication Flows
✅ Token management (set/get)
✅ Session validation
✅ User authorization checks
✅ Installation verification

## Test Configuration

Tests are configured in `vite.config.js`:
```javascript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './tests/setup.js',
  include: ['tests/**/*.test.{js,jsx}'],
}
```

Test setup (`tests/setup.js`):
- Mocks localStorage
- Mocks fetch API
- Resets mocks before each test

## Running Tests

```bash
# Run all tests in watch mode
npm run test

# Run tests once
npm run test:run

# Generate coverage report
npm run test:coverage
```

## Test Best Practices

1. **Mocking** - External dependencies (Supabase, Octokit, API) are mocked
2. **Isolation** - Each test is independent with beforeEach cleanup
3. **Async/await** - Proper handling of promises and async operations
4. **Error cases** - Tests cover both success and failure scenarios
5. **Auth validation** - All protected endpoints are tested for auth

## Areas Covered by Tests

- ✅ Authentication flows
- ✅ API request/response handling
- ✅ User data management
- ✅ Job creation and status tracking
- ✅ Repository listing and selection
- ✅ Component rendering
- ✅ Routing logic
- ✅ Error handling
- ✅ Database operations (via mocks)
- ✅ GitHub API interactions (via mocks)

## Notes

- Mock objects ensure tests don't depend on external services
- Database tests validate schema structure and query patterns
- Component tests use React Testing Library for proper component behavior verification
- All handlers validate HTTP methods and authentication before processing requests
