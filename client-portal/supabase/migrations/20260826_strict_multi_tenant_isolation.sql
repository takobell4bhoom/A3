-- ==============================================================================
-- 20260826_strict_multi_tenant_isolation.sql
-- Strict Multi-Tenant Data Isolation & Trigger Fixes
-- ==============================================================================

-- 1. Update handle_new_user trigger to strictly respect user metadata organization_id & role
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
        -- Fallback only if metadata has no organization_id
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

-- 2. Fix any existing company admin users mistakenly attached to default org instead of their company org
UPDATE public.users u
SET organization_id = o.id
FROM public.organizations o
WHERE u.role = 'admin'
  AND o.contact_email = u.email
  AND u.organization_id != o.id;

-- 3. Strict Row Level Security Policies for Multi-Tenant Isolation

-- ==================== USERS ====================
DROP POLICY IF EXISTS "Users can view their own profile or admins view tenant users" ON public.users;
DROP POLICY IF EXISTS "Distributors can view company admin users" ON public.users;

CREATE POLICY "Users can view their own profile or admins view tenant users"
    ON public.users FOR SELECT
    TO authenticated
    USING (
        -- User can view own profile
        id = auth.uid()
        -- Admin/Distributor can view users strictly in their OWN organization
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'distributor', 'staff')
            AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        )
        -- Distributor can view company admins of companies they sold licenses to (for ledger table)
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'distributor'
            AND role = 'admin'
            AND organization_id IN (
                SELECT id FROM public.organizations WHERE distributor_user_id = auth.uid()
            )
        )
        -- Owner can view all
        OR public.is_owner()
    );

DROP POLICY IF EXISTS "Admins can update users in their organization" ON public.users;
CREATE POLICY "Admins can update users in their organization"
    ON public.users FOR UPDATE
    TO authenticated
    USING (
        id = auth.uid()
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'distributor', 'staff')
            AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        )
        OR public.is_owner()
    );

DROP POLICY IF EXISTS "Admins can insert users in their organization" ON public.users;
CREATE POLICY "Admins can insert users in their organization"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (
        id = auth.uid()
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'distributor', 'staff')
            AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        )
        OR public.is_owner()
    );

DROP POLICY IF EXISTS "Admins can delete users in their organization" ON public.users;
CREATE POLICY "Admins can delete users in their organization"
    ON public.users FOR DELETE
    TO authenticated
    USING (
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'distributor', 'staff')
            AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        )
        OR public.is_owner()
    );

-- ==================== INVOICES ====================
DROP POLICY IF EXISTS "Clients view their own invoices; Admins view all org invoices" ON public.invoices;
CREATE POLICY "Clients view their own invoices; Admins view all org invoices"
    ON public.invoices FOR SELECT
    TO authenticated
    USING (
        (user_id = auth.uid() AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'distributor', 'staff')
            AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        )
        OR public.is_owner()
    );

DROP POLICY IF EXISTS "Admins can create and manage invoices" ON public.invoices;
CREATE POLICY "Admins can create and manage invoices"
    ON public.invoices FOR ALL
    TO authenticated
    USING (
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'distributor', 'staff')
            AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        )
        OR public.is_owner()
    )
    WITH CHECK (
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'distributor', 'staff')
            AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        )
        OR public.is_owner()
    );

-- ==================== DOCUMENTS ====================
DROP POLICY IF EXISTS "Clients can view their own documents; Admins view all org docs" ON public.documents;
CREATE POLICY "Clients can view their own documents; Admins view all org docs"
    ON public.documents FOR SELECT
    TO authenticated
    USING (
        (user_id = auth.uid() AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'distributor', 'staff')
            AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        )
        OR public.is_owner()
    );

DROP POLICY IF EXISTS "Clients can insert documents for themselves; Admins for any client" ON public.documents;
CREATE POLICY "Clients can insert documents for themselves; Admins for any client"
    ON public.documents FOR INSERT
    TO authenticated
    WITH CHECK (
        (user_id = auth.uid() AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'distributor', 'staff')
            AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        )
        OR public.is_owner()
    );

DROP POLICY IF EXISTS "Admins can delete documents in their org" ON public.documents;
CREATE POLICY "Admins can delete documents in their org"
    ON public.documents FOR DELETE
    TO authenticated
    USING (
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'distributor', 'staff')
            AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        )
        OR public.is_owner()
    );

-- ==================== STATUS TRACKER ====================
DROP POLICY IF EXISTS "Clients can view their own status; Admins view all org statuses" ON public.status_tracker;
CREATE POLICY "Clients can view their own status; Admins view all org statuses"
    ON public.status_tracker FOR SELECT
    TO authenticated
    USING (
        (user_id = auth.uid() AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'distributor', 'staff')
            AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        )
        OR public.is_owner()
    );

DROP POLICY IF EXISTS "Admins can insert/update status tracker" ON public.status_tracker;
CREATE POLICY "Admins can insert/update status tracker"
    ON public.status_tracker FOR ALL
    TO authenticated
    USING (
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'distributor', 'staff')
            AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        )
        OR public.is_owner()
    )
    WITH CHECK (
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'distributor', 'staff')
            AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        )
        OR public.is_owner()
    );
