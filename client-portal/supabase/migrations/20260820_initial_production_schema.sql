-- ==============================================================================
-- 20260820_initial_production_schema.sql
-- Idempotent Migration: Safe for both Fresh & Existing Supabase Projects
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Organizations Table (Multi-Tenancy)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    brand_primary TEXT DEFAULT '#0f172a',
    brand_accent TEXT DEFAULT '#059669',
    billing_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Insert or Update Default Firm Tenant
INSERT INTO public.organizations (id, name, slug, brand_primary, brand_accent)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tax Shield Advisor', 'tax-shield-advisor', '#0f172a', '#059669')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    brand_primary = EXCLUDED.brand_primary,
    brand_accent = EXCLUDED.brand_accent,
    updated_at = timezone('utc'::text, now());

-- ==============================================================================
-- 3. Safely Create or Alter Tables (Adding organization_id and new columns)
-- ==============================================================================

-- 3a. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    is_disabled BOOLEAN NOT NULL DEFAULT false,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Safely add columns if table already existed
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Update any existing null organization_ids to default org
UPDATE public.users SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- 3b. Status Tracker Table
CREATE TABLE IF NOT EXISTS public.status_tracker (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    current_step TEXT NOT NULL DEFAULT 'Pending Initial Review',
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_status UNIQUE (user_id)
);

ALTER TABLE public.status_tracker ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.status_tracker ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
UPDATE public.status_tracker SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- 3c. Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    upload_status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS uploaded_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS uploaded_by_role TEXT NOT NULL DEFAULT 'customer';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
UPDATE public.documents SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- 3d. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invoice_no TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS billing_entity TEXT NOT NULL DEFAULT 'Non GST Billing';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_term TEXT NOT NULL DEFAULT 'NET 30';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS issue_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS subtotal_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS round_off_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_url TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
UPDATE public.invoices SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- 3e. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001',
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. Indexes (Safe Creation)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_org_role ON public.users(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_status_tracker_user ON public.status_tracker(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_org ON public.documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);

-- ==============================================================================
-- 5. Helper Functions
-- ==============================================================================

-- Helper function: Is current user an admin in their organization?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND role IN ('admin', 'staff')
          AND is_disabled = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get current user organization ID
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Clean existing policies to avoid "policy already exists" errors
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;

DROP POLICY IF EXISTS "Users can view their own profile or admins view tenant users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users in their organization" ON public.users;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.users;

DROP POLICY IF EXISTS "Clients can view their own status; Admins view all org statuses" ON public.status_tracker;
DROP POLICY IF EXISTS "Admins can insert/update status tracker" ON public.status_tracker;

DROP POLICY IF EXISTS "Clients can view their own documents; Admins view all org docs" ON public.documents;
DROP POLICY IF EXISTS "Clients can insert documents for themselves; Admins for any client" ON public.documents;
DROP POLICY IF EXISTS "Admins can delete documents in their org" ON public.documents;

DROP POLICY IF EXISTS "Clients view their own invoices; Admins view all org invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can create and manage invoices" ON public.invoices;

-- Re-create Clean Policies
-- ==================== Organizations ====================
CREATE POLICY "Users can view their own organization"
    ON public.organizations FOR SELECT
    USING (id = public.current_org_id());

CREATE POLICY "Admins can update their organization"
    ON public.organizations FOR UPDATE
    USING (id = public.current_org_id() AND public.is_admin());

-- ==================== Users ====================
CREATE POLICY "Users can view their own profile or admins view tenant users"
    ON public.users FOR SELECT
    USING (
        id = auth.uid()
        OR (public.is_admin() AND organization_id = public.current_org_id())
    );

CREATE POLICY "Admins can update users in their organization"
    ON public.users FOR UPDATE
    USING (public.is_admin() AND organization_id = public.current_org_id());

CREATE POLICY "Admins can insert users in their organization"
    ON public.users FOR INSERT
    WITH CHECK (
        id = auth.uid()
        OR (public.is_admin() AND organization_id = public.current_org_id())
    );

CREATE POLICY "Admins can delete users in their organization"
    ON public.users FOR DELETE
    USING (public.is_admin() AND organization_id = public.current_org_id());

-- ==================== Status Tracker ====================
CREATE POLICY "Clients can view their own status; Admins view all org statuses"
    ON public.status_tracker FOR SELECT
    USING (
        (user_id = auth.uid() AND organization_id = public.current_org_id())
        OR (public.is_admin() AND organization_id = public.current_org_id())
    );

CREATE POLICY "Admins can insert/update status tracker"
    ON public.status_tracker FOR ALL
    USING (public.is_admin() AND organization_id = public.current_org_id())
    WITH CHECK (public.is_admin() AND organization_id = public.current_org_id());

-- ==================== Documents ====================
CREATE POLICY "Clients can view their own documents; Admins view all org docs"
    ON public.documents FOR SELECT
    USING (
        (user_id = auth.uid() AND organization_id = public.current_org_id())
        OR (public.is_admin() AND organization_id = public.current_org_id())
    );

CREATE POLICY "Clients can insert documents for themselves; Admins for any client"
    ON public.documents FOR INSERT
    WITH CHECK (
        (user_id = auth.uid() AND organization_id = public.current_org_id())
        OR (public.is_admin() AND organization_id = public.current_org_id())
    );

CREATE POLICY "Admins can delete documents in their org"
    ON public.documents FOR DELETE
    USING (public.is_admin() AND organization_id = public.current_org_id());

-- ==================== Invoices ====================
CREATE POLICY "Clients view their own invoices; Admins view all org invoices"
    ON public.invoices FOR SELECT
    USING (
        (user_id = auth.uid() AND organization_id = public.current_org_id())
        OR (public.is_admin() AND organization_id = public.current_org_id())
    );

CREATE POLICY "Admins can create and manage invoices"
    ON public.invoices FOR ALL
    USING (public.is_admin() AND organization_id = public.current_org_id())
    WITH CHECK (public.is_admin() AND organization_id = public.current_org_id());

-- ==================== Storage Bucket & Policies ====================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('customer-documents', 'customer-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can access their permitted files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files to their folder or admins anywhere" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete objects in storage" ON storage.objects;

CREATE POLICY "Authenticated users can access their permitted files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'customer-documents'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_admin()
        )
    );

CREATE POLICY "Authenticated users can upload files to their folder or admins anywhere"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'customer-documents'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_admin()
        )
    );

CREATE POLICY "Admins can delete objects in storage"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'customer-documents'
        AND public.is_admin()
    );

-- ==============================================================================
-- 7. Automatic Profile Trigger on Auth Signup
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_org UUID;
BEGIN
    SELECT id INTO default_org FROM public.organizations ORDER BY created_at ASC LIMIT 1;

    INSERT INTO public.users (id, email, full_name, role, organization_id)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'customer'),
        COALESCE((new.raw_user_meta_data->>'organization_id')::uuid, default_org)
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
