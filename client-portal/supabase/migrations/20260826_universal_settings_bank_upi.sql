-- ==============================================================================
-- 20260826_universal_settings_bank_upi.sql
-- Bank Accounts, UPI Payment Details & Invoice Auto-Print Integration
-- ==============================================================================

-- 1. Extend Organizations table with Banking & UPI identifiers
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS bank_name TEXT,
    ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
    ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
    ADD COLUMN IF NOT EXISTS bank_ifsc TEXT,
    ADD COLUMN IF NOT EXISTS bank_branch TEXT,
    ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- 2. Organizations UPDATE Policy for Owners, Distributors, and Admins
DROP POLICY IF EXISTS "Users can update their organization settings" ON public.organizations;
CREATE POLICY "Users can update their organization settings"
    ON public.organizations FOR UPDATE
    USING (
        id = public.current_org_id()
        OR distributor_user_id = auth.uid()
        OR public.is_owner()
    )
    WITH CHECK (
        id = public.current_org_id()
        OR distributor_user_id = auth.uid()
        OR public.is_owner()
    );
