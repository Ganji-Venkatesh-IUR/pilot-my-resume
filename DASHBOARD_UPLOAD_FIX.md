# Dashboard Upload Display Fix — Root Cause Analysis & Resolution

## Executive Summary

**Issue**: Dashboard displayed "No resumes yet" and "No sources imported yet" despite 4 uploaded files existing in `public.uploads` table.

**Root Cause**: Dashboard "Recent uploads" section was querying the wrong table. It was filtering the `resumes` table for resumes with source material (`source_text`, `github_url`, `linkedin_url`), instead of directly querying the `uploads` table where the actual uploaded files are stored.

**Fix**: Added a separate `uploadService.list()` query to fetch data from the `uploads` table and display actual user uploads in the "Recent uploads" section.

**Result**: Uploaded files now appear on the Dashboard immediately after upload.

---

## Technical Architecture

### Two-Table Design

The application uses two separate tables for different purposes:

| Table | Purpose | Contains |
|-------|---------|----------|
| `resumes` | User-created/edited resumes | Title, template, target_role, content (JSONB), optional source_text/github_url/linkedin_url |
| `uploads` | Source files and profile links | Uploaded files (kind='file') and external links (kind='github'/'linkedin'/'portfolio') |

### Data Flow

1. **User uploads a file** → stored in `resumes` Storage bucket → metadata row created in `public.uploads` table
2. **User creates a resume** → row created in `public.resumes` table with optional source_text/links
3. **Dashboard "Recent activity"** → fetches from `resumes` table
4. **Dashboard "Recent uploads"** → fetches from `uploads` table (**FIXED**)

---

## Root Cause Details

### Before Fix (Incorrect)

```typescript
// Line 144 (OLD CODE)
const uploads = list.filter((r) => r.source_text || r.github_url || r.linkedin_url).slice(0, 4);
```

**Problem**: 
- `list` comes from `resumeService.list()` (fetches `resumes` table only)
- Filters for resumes that have source material references
- Doesn't actually fetch the `uploads` table
- When `resumes` table is empty → "No sources imported yet" (even though `uploads` has files)

### After Fix (Correct)

```typescript
// Line 121 (NEW CODE)
const { data: uploads, isLoading: loadingUploads } = useQuery({
  queryKey: ["uploads"],
  queryFn: () => uploadService.list(),
});

// Line 149 (NEW CODE)
const recentUploads = (uploads ?? []).slice(0, 4);
```

**Benefits**:
- Directly fetches actual uploads from `uploads` table
- Shows files immediately after upload
- Displays correct file type icons and labels

---

## Files Changed

### Only One File Modified

**`src/routes/_authenticated/dashboard.tsx`** (33 insertions, 17 deletions)

#### Change Summary

1. **Added import** (line 27):
   ```typescript
   import { uploadService, type UploadRecord } from "@/services/upload.service";
   ```

2. **Added uploads query** (lines 121-124):
   ```typescript
   const { data: uploads, isLoading: loadingUploads } = useQuery({
     queryKey: ["uploads"],
     queryFn: () => uploadService.list(),
   });
   ```

3. **Updated uploads variable** (line 149):
   ```typescript
   // OLD: const uploads = list.filter((r) => r.source_text || r.github_url || r.linkedin_url).slice(0, 4);
   // NEW:
   const recentUploads = (uploads ?? []).slice(0, 4);
   ```

4. **Updated "Recent uploads" section** (lines 286-318):
   - Changed loading state to use `loadingUploads` instead of `loadingResumes`
   - Changed length check from `uploads.length` to `recentUploads.length`
   - Updated icon logic to use `item.kind` enum instead of checking `item.github_url` / `item.linkedin_url`
   - Updated display label to use `item.label` instead of `item.title`
   - Enhanced source type descriptions (added "Portfolio" for `kind='portfolio'`, "Uploaded file" for `kind='file'`)

---

## Security & User Ownership

### Security Preserved

**Row-Level Security (RLS) Active**:

1. **`uploadService.list()`** query:
   ```sql
   SELECT ... FROM public.uploads
   WHERE user_id = auth.uid()
   ORDER BY created_at DESC LIMIT 50
   ```
   - RLS policy enforces: `(auth.uid() = user_id)` for all operations
   - Only authenticated user's own uploads are visible

2. **`resumeService.list()`** query (unchanged):
   ```sql
   SELECT ... FROM public.resumes
   WHERE auth.uid() = user_id (enforced by RLS)
   ```
   - RLS policy enforces user ownership

### No Changes to RLS Policies

- Storage bucket policies unchanged
- Database RLS policies unchanged
- Table schemas unchanged
- Authorization model unchanged

---

## Validation Results

### ✅ Linting
```
✖ 9 problems (0 errors, 9 warnings)
```
- 0 errors (all fixed)
- 9 warnings are unrelated react-refresh notices (pre-existing)

### ✅ Testing
```
Test Files  11 passed (11)
Tests  92 passed (92)
```
- All 92 tests passing
- No test failures introduced

### ✅ Build
```
✓ built in 1.29s
[nitro] ✔ You can preview this build using npx vite preview
```
- Build succeeds without errors
- Compilation successful

### ✅ Runtime Behavior
- Dashboard now displays uploaded files in "Recent uploads" section
- "Recent activity" section continues to show resumes
- Icons correctly display for file uploads, GitHub links, LinkedIn links, portfolio links
- Status badges show correctly
- Upload deletion still works
- New uploads appear immediately

---

## Expected Behavior After Fix

### Before Upload
- Dashboard shows "No resumes yet" (resumes table empty)
- Dashboard shows "No sources imported yet" (uploads query was wrong)

### After User Uploads File
- File stored in `resumes` bucket
- Row created in `public.uploads` table
- **Dashboard immediately shows file in "Recent uploads" section** ✨

### File Display
- **File Name**: Uses `item.label` (original filename)
- **Icon**: Uses `item.kind` to determine icon (file icon for uploads, GitHub/LinkedIn/portfolio icons for links)
- **Source Type**: "Uploaded file" for file uploads, "GitHub import", "LinkedIn import", "Portfolio" for links
- **Date**: Uses `item.created_at` formatted relatively

### Creating Resumes
- User can create resumes from uploaded files
- "Recent activity" section shows created resumes
- Both sections now work independently and correctly

---

## Deployment Checklist

- ✅ Code changes complete
- ✅ Linting passes (0 errors)
- ✅ All tests pass (92/92)
- ✅ Build succeeds
- ✅ No schema changes
- ✅ No RLS policy changes
- ✅ No database migration needed
- ✅ Security maintained (user ownership via RLS)
- ✅ Backward compatible (resumes table unchanged)

---

## Conclusion

This focused fix resolves the Dashboard upload visibility issue by correctly querying the `uploads` table for the "Recent uploads" section. The fix:

1. Maintains security through existing RLS policies
2. Doesn't modify database schema or policies
3. Passes all tests and linting
4. Makes only necessary changes to one file
5. Immediately displays uploaded files on the Dashboard

The application now correctly shows:
- **Recent Activity** ← Resumes created/edited by user
- **Recent Uploads** ← Files uploaded and links added by user

Both sections now work as intended.
