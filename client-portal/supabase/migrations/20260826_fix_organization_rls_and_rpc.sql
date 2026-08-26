-- ==============================================================================
-- 20260826_fix_organization_rls_and_rpc.sql
-- Fix Organization RLS Policy & Add Secure RPC Provisioning Function
-- ==============================================================================

-- 1. Helper function for distributor authorization
CREATE OR REPLACE FUNCTION public.is_distributor_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND role IN ('distributor', 'admin', 'owner')
          AND is_disabled = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Organizations RLS Policies - Drop old/restrictive policies
DROP POLICY IF EXISTS "Public read for organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Distributors can view companies they sold licenses to" ON public.organizations;
DROP POLICY IF EXISTS "Distributors can insert new company organizations" ON public.organizations;
DROP POLICY IF EXISTS "Distributors can update companies they sold licenses to" ON public.organizations;
DROP POLICY IF EXISTS "Allow authenticated to insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owner can manage all organizations" ON public.organizations;

-- Allow SELECT: Users see their own org, distributors see orgs they sold, owners see all
CREATE POLICY "Public read for organizations"
    ON public.organizations FOR SELECT
    TO authenticated
    USING (
        id = public.current_org_id()
        OR distributor_user_id = auth.uid()
        OR public.is_owner()
    );

-- Allow INSERT: Distributors, Admins, and Owners can insert new company organizations
CREATE POLICY "Distributors can insert new company organizations"
    ON public.organizations FOR INSERT
    TO authenticated
    WITH CHECK (
        distributor_user_id = auth.uid()
        OR public.is_owner()
        OR public.is_distributor_or_admin()
    );

-- Allow UPDATE: Admins can update their own org, distributors can update orgs they sold, owners all
CREATE POLICY "Admins and distributors can update organizations"
    ON public.organizations FOR UPDATE
    TO authenticated
    USING (
        (id = public.current_org_id() AND public.is_admin())
        OR distributor_user_id = auth.uid()
        OR public.is_owner()
    );

-- Allow ALL for Master Owner
CREATE POLICY "Owner can manage all organizations"
    ON public.organizations FOR ALL
    TO authenticated
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

-- 3. Users RLS: Allow Distributors to view the admin users of the companies they sold licenses to
DROP POLICY IF EXISTS "Distributors can view company admin users" ON public.users;
CREATE POLICY "Distributors can view company admin users"
    ON public.users FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR (public.is_admin() AND organization_id = public.current_org_id())
        OR (
            organization_id IN (
                SELECT id FROM public.organizations WHERE distributor_user_id = auth.uid()
            )
        )
        OR public.is_owner()
    );

-- 4. Secure RPC Function: provision_company_license
-- Bypasses RLS issues and guarantees atomic provisioning of tenant organizations
CREATE OR REPLACE FUNCTION public.provision_company_license(
    p_company_name TEXT,
    p_slug TEXT,
    p_contact_email TEXT,
    p_contact_phone TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_org_id UUID;
    v_distributor_id UUID;
    v_sold_count INT;
    v_max_licenses INT;
    v_distributor_org_id UUID;
BEGIN
    v_distributor_id := auth.uid();
    
    IF v_distributor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Get distributor's organization and quota
    SELECT organization_id INTO v_distributor_org_id
    FROM public.users
    WHERE id = v_distributor_id;

    SELECT max_licenses INTO v_max_licenses
    FROM public.organizations
    WHERE id = v_distributor_org_id;

    IF v_max_licenses IS NULL THEN
        v_max_licenses := 25;
    END IF;

    -- Count existing sold companies
    SELECT COUNT(*) INTO v_sold_count
    FROM public.organizations
    WHERE distributor_user_id = v_distributor_id;

    IF v_sold_count >= v_max_licenses THEN
        RAISE EXCEPTION 'License quota reached (% of % sold). Please contact Platform Owner to increase capacity.', v_sold_count, v_max_licenses;
    END IF;

    -- Insert new company organization
    INSERT INTO public.organizations (
        name,
        slug,
        contact_email,
        contact_phone,
        distributor_user_id,
        max_licenses,
        feature_invoices,
        feature_documents,
        feature_work_tracker
    ) VALUES (
        p_company_name,
        p_slug,
        p_contact_email,
        p_contact_phone,
        v_distributor_id,
        100,
        true,
        false,
        false
    )
    RETURNING id INTO v_org_id;

    RETURN jsonb_build_object(
        'id', v_org_id,
        'name', p_company_name,
        'slug', p_slug,
        'contact_email', p_contact_email,
        'distributor_user_id', v_distributor_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
