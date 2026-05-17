# Deferred Items

## Pre-existing Build Failure (out of scope for plan 01-07)

**File:** `src/hooks/use-chat-v2.ts`
**Issue:** Imports `@ai-sdk/react` which is not installed as a package dependency.
**Impact:** `npm run build:dev` fails at the rollup resolution step.
**Discovery:** Found during plan 01-07 build verification step.
**Action needed:** Install `@ai-sdk/react` package or update the import to use the correct available SDK.
