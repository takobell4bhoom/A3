-- ==============================================================================
-- Migration: Add Account Deletion Request Support
-- Description: Adds deletion_requested_at and deletion_reason columns to public.users
--              Enables clients to request deletion and admins to review/purge.
-- ==============================================================================

-- 1. Add columns to public.users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- 2. Add performance index for admins querying pending deletion requests
CREATE INDEX IF NOT EXISTS idx_users_deletion_requested 
ON public.users(organization_id, deletion_requested_at) 
WHERE deletion_requested_at IS NOT NULL;

-- 3. Ensure authenticated clients can update their own account deletion fields
DROP POLICY IF EXISTS "Users can update their own profile and deletion request" ON public.users;
CREATE POLICY "Users can update their own profile and deletion request"
ON public.users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
