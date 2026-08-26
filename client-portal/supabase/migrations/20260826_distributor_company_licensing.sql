-- ==============================================================================
-- 20260826_distributor_company_licensing.sql
-- Multi-Tenant Isolation & Distributor Company License Reselling
-- ==============================================================================

-- 1. Helper function to check if the current user is a distributor
CREATE OR REPLACE FUNCTION public.is_distributor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND role IN ('distributor', 'owner')
          AND is_disabled = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Organizations RLS Policies for Distributors
DROP POLICY IF EXISTS "Distributors can view companies they sold licenses to" ON public.organizations;
CREATE POLICY "Distributors can view companies they sold licenses to"
    ON public.organizations FOR SELECT
    USING (
        distributor_user_id = auth.uid()
        OR id = public.current_org_id()
        OR public.is_owner()
    );

DROP POLICY IF EXISTS "Distributors can insert new company organizations" ON public.organizations;
CREATE POLICY "Distributors can insert new company organizations"
    ON public.organizations FOR INSERT
    WITH CHECK (
        (distributor_user_id = auth.uid() AND public.is_distributor())
        OR public.is_owner()
    );

DROP POLICY IF EXISTS "Distributors can update companies they sold licenses to" ON public.organizations;
CREATE POLICY "Distributors can update companies they sold licenses to"
    ON public.organizations FOR UPDATE
    USING (
        (distributor_user_id = auth.uid() AND public.is_distributor())
        OR (id = public.current_org_id() AND public.is_admin())
        OR public.is_owner()
    );

-- 3. Users RLS: Allow Distributors to view the admin users of the companies they sold licenses to
DROP POLICY IF EXISTS "Distributors can view company admin users" ON public.users;
CREATE POLICY "Distributors can view company admin users"
    ON public.users FOR SELECT
    USING (
        id = auth.uid()
        OR (public.is_admin() AND organization_id = public.current_org_id())
        OR (
            public.is_distributor() AND organization_id IN (
                SELECT id FROM public.organizations WHERE distributor_user_id = auth.uid()
            )
        )
        OR public.is_owner()
    );
