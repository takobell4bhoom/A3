-- ==============================================================================
-- 20260825_multi_tier_hierarchy_and_licenses.sql
-- Multi-Tier Hierarchy Architecture: Platform Owner -> Distributor -> End Client (cx)
-- ==============================================================================

-- 1. Update Users Table Role Constraint to Support 'owner' and 'distributor'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('owner', 'distributor', 'admin', 'staff', 'customer'));

-- 2. Extend Organizations Table with License & Feature Flag Columns
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS max_licenses INTEGER NOT NULL DEFAULT 25,
ADD COLUMN IF NOT EXISTS feature_invoices BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS feature_documents BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_work_tracker BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS distributor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Ensure default organization has generous license capacity
UPDATE public.organizations 
SET max_licenses = 100,
    feature_invoices = true,
    feature_documents = false,
    feature_work_tracker = false
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 3. Helper Functions for Role Authorization
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND role = 'owner'
          AND is_disabled = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Row-Level Security (RLS) Updates for Owner Multi-Tenant Administration
DROP POLICY IF EXISTS "Owner can manage all organizations" ON public.organizations;
CREATE POLICY "Owner can manage all organizations"
    ON public.organizations FOR ALL
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "Owner can manage all users" ON public.users;
CREATE POLICY "Owner can manage all users"
    ON public.users FOR ALL
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "Owner can manage all invoices" ON public.invoices;
CREATE POLICY "Owner can manage all invoices"
    ON public.invoices FOR ALL
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "Owner can manage all documents" ON public.documents;
CREATE POLICY "Owner can manage all documents"
    ON public.documents FOR ALL
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "Owner can manage all status trackers" ON public.status_tracker;
CREATE POLICY "Owner can manage all status trackers"
    ON public.status_tracker FOR ALL
    USING (public.is_owner())
    WITH CHECK (public.is_owner());
