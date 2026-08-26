-- ==============================================================================
-- 20260826_hierarchy_and_downward_visibility.sql
-- Multi-Tier Hierarchy, Downward Visibility for Distributors & Buyer Company Settings
-- ==============================================================================

-- 1. Extend Organizations table with Company Billing & Tax Identifiers
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS gstin TEXT,
    ADD COLUMN IF NOT EXISTS pan TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS state TEXT,
    ADD COLUMN IF NOT EXISTS pincode TEXT,
    ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'INV',
    ADD COLUMN IF NOT EXISTS invoice_notes TEXT DEFAULT 'Thank you for your business. Please make payment before the due date.';

-- 2. Helper function: check if caller is distributor or owner
CREATE OR REPLACE FUNCTION public.is_distributor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND role = 'distributor'
          AND is_disabled = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update handle_new_user Trigger to strictly preserve role and organization_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id UUID;
    v_role TEXT;
    v_full_name TEXT;
BEGIN
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'customer');
    v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
    
    -- Extract organization_id from user metadata
    IF (new.raw_user_meta_data->>'organization_id') IS NOT NULL AND (new.raw_user_meta_data->>'organization_id') != '' THEN
        v_org_id := (new.raw_user_meta_data->>'organization_id')::uuid;
    ELSE
        SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
    END IF;

    INSERT INTO public.users (id, email, full_name, role, organization_id)
    VALUES (
        new.id,
        new.email,
        v_full_name,
        v_role,
        v_org_id
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        organization_id = EXCLUDED.organization_id,
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-align any existing company admin accounts to their corresponding organization
UPDATE public.users u
SET organization_id = o.id
FROM public.organizations o
WHERE u.role = 'admin'
  AND o.contact_email = u.email
  AND u.organization_id != o.id;

-- 5. Row-Level Security Policies with Downward Visibility

-- ==================== ORGANIZATIONS ====================
DROP POLICY IF EXISTS "Public read for organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins and distributors can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owner can manage all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Distributors can insert new company organizations" ON public.organizations;

-- SELECT:
-- 1. User can view their own organization
-- 2. Distributor can view their own org + all buyer organizations they sold to
-- 3. Owner can view all organizations
CREATE POLICY "Public read for organizations"
    ON public.organizations FOR SELECT
    TO authenticated
    USING (
        id = public.current_org_id()
        OR distributor_user_id = auth.uid()
        OR public.is_owner()
    );

-- INSERT:
-- Distributors and Owners can provision new company organizations
CREATE POLICY "Distributors can insert new company organizations"
    ON public.organizations FOR INSERT
    TO authenticated
    WITH CHECK (
        distributor_user_id = auth.uid()
        OR public.is_owner()
        OR public.is_distributor()
    );

-- UPDATE:
-- Company Admins update their own org; Distributors update buyer orgs; Owners update all
CREATE POLICY "Admins and distributors can update organizations"
    ON public.organizations FOR UPDATE
    TO authenticated
    USING (
        (id = public.current_org_id() AND public.is_admin())
        OR distributor_user_id = auth.uid()
        OR public.is_owner()
    );

-- OWNER FULL ACCESS:
CREATE POLICY "Owner can manage all organizations"
    ON public.organizations FOR ALL
    TO authenticated
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

-- ==================== USERS ====================
DROP POLICY IF EXISTS "Users can view their own profile or admins view tenant users" ON public.users;
DROP POLICY IF EXISTS "Distributors can view company admin users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users in their organization" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users in their organization" ON public.users;

-- SELECT:
-- 1. User sees own profile
-- 2. Buyer Admin sees users in their own company
-- 3. Distributor sees own clients + all clients & admins in buyer companies under them
-- 4. Owner sees all users
CREATE POLICY "Users view profile and admins/distributors view users"
    ON public.users FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR organization_id = public.current_org_id()
        OR organization_id IN (
            SELECT id FROM public.organizations WHERE distributor_user_id = auth.uid()
        )
        OR public.is_owner()
    );

CREATE POLICY "Admins and distributors can update users"
    ON public.users FOR UPDATE
    TO authenticated
    USING (
        id = auth.uid()
        OR organization_id = public.current_org_id()
        OR organization_id IN (
            SELECT id FROM public.organizations WHERE distributor_user_id = auth.uid()
        )
        OR public.is_owner()
    );

CREATE POLICY "Admins and distributors can insert users"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (
        id = auth.uid()
        OR organization_id = public.current_org_id()
        OR organization_id IN (
            SELECT id FROM public.organizations WHERE distributor_user_id = auth.uid()
        )
        OR public.is_owner()
    );

CREATE POLICY "Admins and distributors can delete users"
    ON public.users FOR DELETE
    TO authenticated
    USING (
        organization_id = public.current_org_id()
        OR organization_id IN (
            SELECT id FROM public.organizations WHERE distributor_user_id = auth.uid()
        )
        OR public.is_owner()
    );

-- ==================== INVOICES ====================
DROP POLICY IF EXISTS "Clients view their own invoices; Admins view all org invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can create and manage invoices" ON public.invoices;

-- SELECT:
-- 1. Client views their own invoices
-- 2. Buyer Admin views their company's invoices
-- 3. Distributor views their own invoices + all invoices generated by buyer companies under them
-- 4. Owner views all invoices
CREATE POLICY "Clients view own invoices; Admins/Distributors view tenant invoices"
    ON public.invoices FOR SELECT
    TO authenticated
    USING (
        (user_id = auth.uid() AND organization_id = public.current_org_id())
        OR organization_id = public.current_org_id()
        OR organization_id IN (
            SELECT id FROM public.organizations WHERE distributor_user_id = auth.uid()
        )
        OR public.is_owner()
    );

CREATE POLICY "Admins can create and manage invoices"
    ON public.invoices FOR ALL
    TO authenticated
    USING (
        organization_id = public.current_org_id()
        OR organization_id IN (
            SELECT id FROM public.organizations WHERE distributor_user_id = auth.uid()
        )
        OR public.is_owner()
    )
    WITH CHECK (
        organization_id = public.current_org_id()
        OR organization_id IN (
            SELECT id FROM public.organizations WHERE distributor_user_id = auth.uid()
        )
        OR public.is_owner()
    );

-- ==================== DOCUMENTS ====================
DROP POLICY IF EXISTS "Clients can view their own documents; Admins view all org docs" ON public.documents;
DROP POLICY IF EXISTS "Clients can insert documents for themselves; Admins for any client" ON public.documents;
DROP POLICY IF EXISTS "Admins can delete documents in their org" ON public.documents;

CREATE POLICY "Clients/Admins/Distributors view documents"
    ON public.documents FOR SELECT
    TO authenticated
    USING (
        (user_id = auth.uid() AND organization_id = public.current_org_id())
        OR organization_id = public.current_org_id()
        OR organization_id IN (
            SELECT id FROM public.organizations WHERE distributor_user_id = auth.uid()
        )
        OR public.is_owner()
    );

CREATE POLICY "Clients and Admins insert documents"
    ON public.documents FOR INSERT
    TO authenticated
    WITH CHECK (
        (user_id = auth.uid() AND organization_id = public.current_org_id())
        OR organization_id = public.current_org_id()
        OR organization_id IN (
            SELECT id FROM public.organizations WHERE distributor_user_id = auth.uid()
        )
        OR public.is_owner()
    );

CREATE POLICY "Admins and distributors delete documents"
    ON public.documents FOR DELETE
    TO authenticated
    USING (
        organization_id = public.current_org_id()
        OR organization_id IN (
            SELECT id FROM public.organizations WHERE distributor_user_id = auth.uid()
        )
        OR public.is_owner()
    );
