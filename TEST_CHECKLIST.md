# Multi-User Auth & Global Exercises - Test Checklist

## Fixed Issues

### Issue A: Flash of Previous User Data
**Root Cause**: React Query cache was clearing on auth change but queries might refetch before token updated.
**Fix**: 
- Improved `AuthCacheBoundary` to track user UID changes and only clear cache when user actually changes
- Queries already properly gated with `enabled: !authLoading && !!user`
- `apiClient` interceptor already calls `getIdToken()` on every request for fresh token

### Issue B: New User Sees No Exercises  
**Root Cause**: Exercise seeding created trainer-owned exercises only (no global exercises with trainer_id = NULL)
**Fix**:
- Created `global_exercise_seed.py` service to seed exercises with `trainer_id = NULL`
- Added FastAPI lifespan hook to seed global exercises on app startup
- Backend exercises list endpoint already returns `(trainer_id == user) OR (trainer_id IS NULL)`
- Fixed exercise update/delete to prevent editing global exercises

## Files Changed

### Backend
1. **`backend/app/main.py`**
   - Added `lifespan` context manager to seed global exercises on startup
   - Imported `seed_global_exercises` service

2. **`backend/app/services/global_exercise_seed.py`** (NEW FILE)
   - Seeds exercises with `trainer_id = NULL` visible to all authenticated users
   - Idempotent (safe to run multiple times)

3. **`backend/app/api/v1/exercises.py`**
   - Split `_get_exercise_or_404` into two helpers:
     - `_get_exercise_or_404`: allows global OR owned (for GET)
     - `_get_trainer_exercise_or_404`: only owned (for PUT/DELETE)
   - Updated update/delete endpoints to use `_get_trainer_exercise_or_404`
   - Prevents users from editing/deleting global exercises

4. **`backend/app/api/v1/workouts.py`**
   - Updated exercise validation in create_workout to allow global exercises
   - Updated exercise validation in update_workout to allow global exercises
   - Updated AI workout generation to fetch global + owned exercises

### Frontend
5. **`frontend/components/Providers.tsx`**
   - Improved `AuthCacheBoundary` to track UID changes
   - Only clears cache when user actually changes (not on initial mount)
   - Prevents race condition with stale cache data

## Manual Test Checklist

### Pre-Test Setup
- [ ] Restart backend to trigger startup global exercise seeding
- [ ] Verify backend logs show: `[STARTUP] Global exercises seeded: created=~44, skipped=0`
- [ ] Have two Firebase users ready:
  - User A: test@trainer.ai
  - User B: test2@trainer.ai

### Test 1: User A Creates Data
- [ ] Login as User A (test@trainer.ai)
- [ ] Verify dashboard shows 0 workouts, ~44 exercises, 0 clients
- [ ] Go to Exercises page
- [ ] Verify "All" filter shows ~44 global exercises
- [ ] Verify "Mine" filter shows 0 exercises (empty state message)
- [ ] Verify "Global" filter shows ~44 exercises
- [ ] Verify global exercises have "Global" badge (not "Mine")
- [ ] Try to edit a global exercise → should NOT see Edit button
- [ ] Create 1 client: "Client A"
- [ ] Create 1 workout for Client A using global exercises
- [ ] Verify dashboard now shows 1 workout, ~44 exercises, 1 client
- [ ] Note User A's Firebase UID in console for verification

### Test 2: Logout
- [ ] Logout from User A
- [ ] Verify redirected to /login
- [ ] Backend terminal should NOT show errors

### Test 3: User B Login (Critical Test)
- [ ] Login as User B (test2@trainer.ai)
- [ ] **CRITICAL**: Verify NO flash of User A's data on dashboard
- [ ] Verify dashboard shows 0 workouts, ~44 exercises, 0 clients
- [ ] Open browser DevTools → Console
- [ ] Verify log shows: `[AuthCache] User changed, clearing cache`
- [ ] Verify NO API calls show User A's data in Network tab

### Test 4: User B Sees Global Exercises
- [ ] Go to Exercises page as User B
- [ ] Verify "All" filter shows ~44 global exercises
- [ ] Verify "Mine" filter shows 0 exercises
- [ ] Verify "Global" filter shows ~44 exercises
- [ ] Verify global exercises have "Global" badge
- [ ] Try to access global exercise detail page → should work (read-only)
- [ ] Verify NO Edit/Delete buttons on global exercises

### Test 5: User B Creates Own Data
- [ ] As User B, create 1 custom exercise: "User B Exercise"
- [ ] Verify it appears with "Mine" badge
- [ ] Verify "Mine" filter now shows 1 exercise
- [ ] Verify "All" filter shows ~45 exercises (44 global + 1 custom)
- [ ] Create 1 client: "Client B"
- [ ] Create 1 workout for Client B using mix of global + custom exercise
- [ ] Verify dashboard shows 1 workout, ~45 exercises, 1 client

### Test 6: Cross-User Isolation
- [ ] Logout User B
- [ ] Login as User A
- [ ] Verify dashboard shows 1 workout, ~44 exercises, 1 client (User A's data)
- [ ] Verify NO "User B Exercise" in exercises list
- [ ] Verify NO "Client B" in clients list
- [ ] Go to Clients page → should only see "Client A"
- [ ] Go to Workouts page → should only see User A's workout

### Test 7: Global Exercise Immutability
- [ ] As User A, go to Exercises page
- [ ] Find a global exercise (e.g., "Barbell Bench Press")
- [ ] Verify NO Edit button appears
- [ ] Try to access `/exercises/{global_exercise_id}` directly
- [ ] Should see exercise details but NO edit form
- [ ] Verify cannot delete global exercise

### Test 8: Backend API Direct Tests (Optional)
Using curl or Postman with Firebase auth tokens:

```bash
# Get exercises as User A
curl -H "Authorization: Bearer {USER_A_TOKEN}" http://localhost:8000/api/v1/exercises/

# Response should include:
# - All global exercises (trainer_id: null, is_mine: false)
# - User A's custom exercises (trainer_id: USER_A_UID, is_mine: true)
# - Total count: ~44+ (depending on custom exercises)

# Get exercises as User B
curl -H "Authorization: Bearer {USER_B_TOKEN}" http://localhost:8000/api/v1/exercises/

# Response should include:
# - Same global exercises
# - User B's custom exercises ONLY
# - Should NOT include User A's custom exercises

# Try to update global exercise as User A (should fail)
curl -X PUT \
  -H "Authorization: Bearer {USER_A_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Hacked Name"}' \
  http://localhost:8000/api/v1/exercises/{GLOBAL_EXERCISE_ID}

# Expected: 404 "Exercise not found or not owned by trainer"

# Try to create workout with global exercise (should succeed)
curl -X POST \
  -H "Authorization: Bearer {USER_A_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Workout",
    "date": "2026-01-07",
    "status": "planned",
    "blocks": [{
      "block_type": "straight",
      "sequence_index": 0,
      "sets": [{
        "exercise_id": "{GLOBAL_EXERCISE_ID}",
        "set_index": 0,
        "target_reps_min": 8,
        "target_reps_max": 12
      }]
    }]
  }' \
  http://localhost:8000/api/v1/workouts/

# Expected: 201 Created
```

### Test 9: Edge Cases
- [ ] Rapidly switch between User A and User B (logout/login 3x)
- [ ] Verify NO cross-contamination of data
- [ ] Verify NO stale cache issues
- [ ] Verify console shows cache clearing on each user change

## Success Criteria

✅ **Issue A Fixed**: No flash of previous user data when switching users  
✅ **Issue B Fixed**: All users see ~44 global exercises immediately  
✅ **Auth Isolation**: Users never see each other's clients/workouts/custom exercises  
✅ **Global Exercises**: Visible to all, editable by none  
✅ **Cache Management**: React Query cache clears on user change  
✅ **Token Refresh**: API calls always use current user's token

## Rollback Plan

If issues persist:
1. Revert `backend/app/main.py` (remove lifespan hook)
2. Revert `frontend/components/Providers.tsx` (restore simple cache clearing)
3. Revert exercise endpoint changes
4. Delete `backend/app/services/global_exercise_seed.py`
5. Restart backend and frontend

## Notes
- Global exercises are seeded once at startup; to re-seed, restart backend
- Frontend cache clearing is conservative (only on UID change)
- Backend validation allows global exercises in workouts (as intended)
- Exercise edit/delete is restricted to trainer-owned only
