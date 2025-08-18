# Hamptown Control Panel - GitHub Copilot Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Project Overview

Hamptown Control Panel is a React TypeScript web application for employee task and mood management with real-time multi-device synchronization. It features Firebase backend, offline capabilities via IndexedDB, WebSocket-based sync with vector clocks for conflict resolution, and comprehensive inventory management.

## Working Effectively

### Bootstrap and Build
- Install dependencies: `npm install` -- takes ~87 seconds. NEVER CANCEL. Set timeout to 120+ seconds.
- Build the project: `npm run build` -- takes ~35 seconds. Set timeout to 60+ seconds.
- Start development server: `npm start` -- starts in ~15 seconds, runs on http://localhost:3000/hamptownControlPanel
- The build succeeds and produces a production-ready bundle in the `build/` directory

### Testing
- Run core sync tests (recommended): `npx jest src/employee-app/VectorClock.test.ts src/employee-app/OperationManager.test.ts --verbose` -- takes ~1 second
- Run full test suite: `npm test -- --watchAll=false` -- takes ~7 seconds but has many failing tests unrelated to core functionality
- ONLY run core tests when validating changes to sync logic
- Many integration tests fail due to Firebase service mocking issues - this is expected and not related to application functionality

### Linting and Code Quality
- Run linting: `npx eslint src/ --max-warnings 0` -- shows warnings but allows build to succeed
- Most linting issues are in test files and unused variables - not critical for functionality
- Always run linting before committing changes

## Validation Scenarios

After making changes, ALWAYS validate using these specific scenarios:

### Manual Testing Steps
1. Run `npm start` to start the development server
2. Open http://localhost:3000/hamptownControlPanel in browser
3. **Test Multi-Device Sync:**
   - Open the application in multiple browser tabs
   - Go to "Cleaning Tasks" tab
   - Try rapid clicking on task completion buttons
   - Verify in browser console that sync debouncing is working (should see reduced console spam)
   - Look for the floating sync indicator in bottom right corner
   - Verify device count shows multiple connected devices
4. **Test Core Functionality:**
   - Create, edit, and complete tasks
   - Test employee mood tracking
   - Test inventory management features
   - Verify offline behavior by temporarily disconnecting network

### Test Files for Understanding Sync Behavior
- Review `/public/sync-test.html` for detailed sync testing scenarios
- Check `/build/sync-test.html` for expected behavior documentation

## Key Technical Information

### Architecture
- **Frontend:** React 18 with TypeScript, deployed to GitHub Pages
- **Backend:** Firebase Realtime Database for live sync
- **Sync System:** WebSocket-based with vector clocks for conflict resolution
- **Offline:** IndexedDB-based queue with automatic retry
- **Build:** Create React App with custom configuration for GitHub Pages deployment

### Important Files and Directories
- `src/employee-app/` - Main application logic
- `src/employee-app/OperationManager.ts` - Core sync operation handling
- `src/employee-app/VectorClock.ts` - Conflict resolution logic
- `src/employee-app/firebaseService.ts` - Firebase integration
- `src/employee-app/types.ts` - TypeScript type definitions
- `src/employee-app/constants.ts` - Firebase configuration and constants
- `src/employee-app/inventory/` - Inventory management features

### Common Development Tasks

**Adding New Data Types to Sync:**
1. Create operation functions in new file (e.g., `XOperations.ts`)
2. Add operation types to `types.ts`
3. Update `OperationManager.ts` to handle new operation types
4. Always use operation functions instead of direct state updates

**Debugging Sync Issues:**
- Enable browser console and watch for sync operation logs
- Check the sync indicator in bottom right of the application
- Use `/public/sync-test.html` page for dedicated sync testing
- Vector clock conflicts are resolved automatically using timestamp fallback

**Firebase Configuration:**
- Firebase config is in `src/employee-app/constants.ts`
- Uses Firebase Realtime Database for real-time sync
- Authentication is handled automatically
- Database URL: https://hamptown-panel-default-rtdb.firebaseio.com

### Known Build/Test Issues

**Build Requirements:**
- Node.js 18+ required (matches GitHub Actions)
- TypeScript compilation requires `downlevelIteration: true` (already configured)
- Build warnings about deprecations are expected and don't affect functionality

**Test Limitations:**
- Many integration tests fail due to Firebase service constructor mocking issues
- Component tests fail due to React testing library DOM node access issues
- Core sync logic tests (VectorClock, OperationManager) work correctly
- Focus validation on core tests and manual testing rather than full test suite

**Expected Build Warnings:**
- Webpack dev server deprecation warnings (onAfterSetupMiddleware)
- ESLint warnings about unused variables in test files
- Firebase SDK compatibility warnings
- These warnings don't affect application functionality

### Performance and Timing Expectations

- **npm install:** ~87 seconds - NEVER CANCEL. Set timeout to 120+ seconds.
- **npm run build:** ~35 seconds - Set timeout to 60+ seconds.
- **npm start:** ~15 seconds to compile and start
- **Core tests:** ~1 second
- **Full test suite:** ~7 seconds (though many tests fail as expected)
- **ESLint:** ~10 seconds

### GitHub Actions CI/CD

The project deploys automatically to GitHub Pages via `.github/workflows/deploy.yml`:
- Triggers on push to main branch
- Uses Node.js 18
- Installs from npm mirror registry to avoid 503 errors
- Builds with `CI=false` to allow warnings
- Deploys to https://koml56.github.io/hamptownControlPanel/

### Offline and Sync Behavior

**Debouncing and Rate Limiting:**
- Task operations debounced to 1000ms to prevent rapid clicking
- Critical saves limited to once per 2 seconds
- Sync loops prevented via operation tracking
- Device presence tracking for multi-device coordination

**Offline Queue:**
- Operations stored in IndexedDB when offline
- Automatic retry when connection restored
- Vector clock conflict resolution for concurrent edits
- TTL-based cleanup of old operations

Always validate changes by running the manual testing scenarios above, especially the multi-device sync testing with multiple browser tabs.