-- ==============================================================================
-- 20260826_company_license_management.sql
-- Manage Sold Company Licenses: Details, Expiry Dates, Suspension & Deletion
-- ==============================================================================

-- 1. Extend Organizations Table with Website, Expiry Date & Disabled Flag
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS website TEXT,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT false;

-- 2. Organizations DELETE Policy for Distributors & Owners
DROP POLICY IF EXISTS "Distributors can delete companies they sold licenses to" ON public.organizations;
CREATE POLICY "Distributors can delete companies they sold licenses to"
    ON public.organizations FOR DELETE
    USING (
        (distributor_user_id = auth.uid() AND public.is_distributor() AND id != '00000000-0000-0000-0000-000000000001')
        OR (public.is_owner() AND id != '00000000-0000-0000-0000-000000000001')
    );

-- 3. Atomic RPC: Toggle Organization Access (Suspension / Reactivation)
CREATE OR REPLACE FUNCTION public.toggle_organization_access(
    p_org_id UUID,
    p_is_disabled BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID;
    v_is_distributor BOOLEAN;
    v_is_owner BOOLEAN;
    v_org_distributor_id UUID;
BEGIN
    v_caller_id := auth.uid();
    
    -- Check permissions
    SELECT (role IN ('distributor', 'owner')), (role = 'owner')
    INTO v_is_distributor, v_is_owner
    FROM public.users WHERE id = v_caller_id;

    IF NOT (v_is_distributor OR v_is_owner) THEN
        RAISE EXCEPTION 'Access denied: Only distributors or platform owners can toggle company access.';
    END IF;

    -- Verify ownership of the organization
    SELECT distributor_user_id INTO v_org_distributor_id
    FROM public.organizations WHERE id = p_org_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization not found.';
    END IF;

    IF NOT v_is_owner AND v_org_distributor_id != v_caller_id THEN
        RAISE EXCEPTION 'Access denied: You can only manage organizations you provisioned.';
    END IF;

    -- Prevent disabling default system organization
    IF p_org_id = '00000000-0000-0000-0000-000000000001' THEN
        RAISE EXCEPTION 'Cannot modify access status of the primary system organization.';
    END IF;

    -- Update organization status
    UPDATE public.organizations
    SET is_disabled = p_is_disabled,
        updated_at = NOW()
    WHERE id = p_org_id;

    -- Synchronize disabled flag to all users in this organization
    UPDATE public.users
    SET is_disabled = p_is_disabled,
        updated_at = NOW()
    WHERE organization_id = p_org_id;

    RETURN jsonb_build_object(
        'success', true,
        'organization_id', p_org_id,
        'is_disabled', p_is_disabled
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Atomic RPC: Delete Sold Organization & Cascade Cleanup
CREATE OR REPLACE FUNCTION public.delete_sold_organization(
    p_org_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID;
    v_is_distributor BOOLEAN;
    v_is_owner BOOLEAN;
    v_org_distributor_id UUID;
    v_org_name TEXT;
BEGIN
    v_caller_id := auth.uid();

    -- Check caller permissions
    SELECT (role IN ('distributor', 'owner')), (role = 'owner')
    INTO v_is_distributor, v_is_owner
    FROM public.users WHERE id = v_caller_id;

    IF NOT (v_is_distributor OR v_is_owner) THEN
        RAISE EXCEPTION 'Access denied: Only distributors or platform owners can delete sold company licenses.';
    END IF;

    -- Get org details and verify caller owns it
    SELECT distributor_user_id, name INTO v_org_distributor_id, v_org_name
    FROM public.organizations WHERE id = p_org_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization not found.';
    END IF;

    IF NOT v_is_owner AND v_org_distributor_id != v_caller_id THEN
        RAISE EXCEPTION 'Access denied: You can only delete organizations you provisioned.';
    END IF;

    IF p_org_id = '00000000-0000-0000-0000-000000000001' THEN
        RAISE EXCEPTION 'Cannot delete the primary system organization.';
    END IF;

    -- Cascade delete related tenant records
    DELETE FROM public.invoices WHERE organization_id = p_org_id;
    DELETE FROM public.status_tracker WHERE organization_id = p_org_id;
    DELETE FROM public.documents WHERE organization_id = p_org_id;
    
    -- Delete users belonging to this organization
    DELETE FROM public.users WHERE organization_id = p_org_id;

    -- Delete organization
    DELETE FROM public.organizations WHERE id = p_org_id;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_org_id', p_org_id,
        'organization_name', v_org_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.toggle_organization_access(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_sold_organization(UUID) TO authenticated;
