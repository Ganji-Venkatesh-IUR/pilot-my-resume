# Upload Flow Fix Summary

## Root Cause Analysis

After thorough investigation of the upload flow, I identified and fixed several critical issues:

### Primary Issues Fixed

1. **Incomplete Error Handling**: The original code didn't properly distinguish between INSERT failures and SELECT failures after `.select("*").single()`. This could cause:
   - The INSERT to succeed but `.select("*")` to fail
   - The user to see an error even though the file was stored
   - Or the error to be hidden if the `.single()` threw an exception that wasn't caught

2. **Orphaned Storage Files**: If the database INSERT failed after a successful Storage upload, there was no cleanup logic. This could leave uploaded files in Storage without corresponding metadata.

3. **Poor Error Messages**: Generic errors didn't help users understand what went wrong (auth issue, RLS, constraint violation, etc.)

4. **Authentication Handling**: No explicit error handling if the user session expired between Storage upload and database INSERT.

## Changes Made

### 1. Enhanced Upload Service (`src/services/upload.service.ts`)

**Key Improvements:**

- **Separated INSERT and SELECT**: Now does INSERT first (select only ID), then does a separate SELECT for the full record. This isolates query issues.
  
- **Transaction-like Safety**: If Storage upload succeeds but database INSERT fails:
  - The orphaned Storage file is automatically deleted
  - A clear error message is shown to the user
  - User knows their upload was cleaned up

- **Better Error Handling**:
  - Auth errors: "Cannot upload: Session expired..."
  - RLS/Permission errors: "Cannot save upload metadata: Permission denied..."
  - Retrieval errors: "Upload stored but metadata retrieval failed..."
  - Foreign key errors: "Invalid user ID. Please sign out and sign back in..."
  - Generic database errors: Include the actual error message

- **Improved Text Extraction**: Now wrapped in try-catch. If extraction fails, it logs a warning but doesn't fail the entire upload.

- **Better Link Upload Error Handling**: Same improvements applied to `addLink()` method.

- **Improved Delete Operation**: Better error handling if either Storage or database delete fails.

### 2. Diagnostic Migration (`supabase/migrations/20260901000000_upload_diagnostics.sql`)

**Purpose**: Verify and repair the database schema to ensure:

- ✓ `public.uploads` table exists and has correct structure
- ✓ RLS is enabled on `public.uploads`
- ✓ All CHECK constraints are in place (`kind` and `status` values)
- ✓ Primary key and foreign key constraints exist
- ✓ `label` column is NOT NULL
- ✓ `updated_at` trigger is configured
- ✓ Required indexes exist for query performance
- ✓ Proper permissions granted to `authenticated` and `service_role` roles
- ✓ Storage RLS policies for `resumes` bucket are configured

**Note**: This migration is **idempotent** - it can be safely applied multiple times.

## Security Preserved

✓ `resumes` bucket remains private per user  
✓ RLS policies remain intact and enforce user isolation  
✓ No secrets exposed in error messages  
✓ Storage policies require authentication  
✓ Database access requires valid user session  
✓ No service-role key used in browser code  

## How It Fixes the Upload Flow

**Before**:
1. Storage upload succeeds → file in storage
2. Database INSERT fails (silently or with unclear error)
3. No cleanup → orphaned files in storage
4. User sees generic error or nothing
5. `public.uploads` table remains empty

**After**:
1. Storage upload succeeds → file in storage
2. Database INSERT fails → clear error message
3. Orphaned file is cleaned up automatically
4. User sees specific guidance (auth, permissions, session, etc.)
5. If everything works → `public.uploads` has complete metadata row

## Testing

- ✓ All 92 existing tests pass
- ✓ No TypeScript compilation errors
- ✓ No lint errors in modified code
- ✓ Build completes successfully

## Expected Behavior After Fix

**Successful Upload Flow**:
1. User selects PDF/DOCX/TXT/MD/JSON/CSV file
2. File uploads to: `resumes/<user-id>/<uuid>-<filename>`
3. Metadata inserted into `public.uploads` with:
   - ✓ `user_id` = authenticated user's UUID
   - ✓ `kind` = 'file'
   - ✓ `label` = original filename
   - ✓ `file_name` = original filename
   - ✓ `file_type` = MIME type or extension
   - ✓ `file_size` = bytes
   - ✓ `storage_path` = actual Storage path
   - ✓ `status` = 'ready' (for extractable) or 'pending'
   - ✓ `extracted_text` = extracted content (if applicable)
   - ✓ `metadata` = JSON with extension, extracted flag, character count
4. Row becomes visible in upload list
5. Signed URLs work for preview/download
6. Delete removes both Storage file and metadata

**Error Scenarios**:
1. Unsupported file type → "unsupported file type" message
2. File too large → "files must be under 10 MB" message
3. Auth expired → "Cannot upload: Session expired. Please sign in again."
4. Permission denied → "Cannot save upload metadata: Permission denied. Please check your authentication..."
5. User ID mismatch → "Invalid user ID. Please try signing out and signing back in..."
6. Database unreachable → "Resume upload failed: Metadata error: ..." (with actual error)

## Files Modified

1. `src/services/upload.service.ts` - Enhanced upload service with better error handling and cleanup
2. `supabase/migrations/20260901000000_upload_diagnostics.sql` - New diagnostic migration

## Next Steps for User

1. **Apply the diagnostic migration**:
   - Run: `supabase migration up`
   - This verifies and repairs the database schema

2. **Deploy the updated code**:
   - The changes to `upload.service.ts` are backward compatible
   - No UI changes needed

3. **Test the upload flow**:
   - Try uploading a file
   - If it fails, check the error message for specific guidance
   - If successful, verify the row appears in `public.uploads`

4. **Monitor error logs**:
   - Check browser console for "Text extraction failed" warnings (these are non-fatal)
   - Check browser console for cleanup error logs (these indicate orphaned files that couldn't be cleaned)

## Additional Notes

- The `resumes` bucket is correctly configured for private, per-user access
- All original functionality is preserved (resume builder, link uploads, delete, signed URLs)
- No unrelated code was modified
- No features were removed
- Application remains secure with proper RLS enforcement
