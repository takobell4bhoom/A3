import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/dateUtils';
import { 
  Building2, KeyRound, Plus, Search, X, Check, Loader2, 
  ShieldCheck, Copy, CheckCircle2, Calendar, Phone, 
  Edit, Trash2, Power, ShieldAlert, AlertTriangle, 
  Clock, ExternalLink, MapPin
} from 'lucide-react';

function getExpiryStatus(expiresAt) {
  if (!expiresAt) {
    return { label: 'Perpetual / Lifetime', variant: 'perpetual', isExpired: false, isSoon: false };
  }
  const expiry = new Date(expiresAt).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { 
      label: `Expired (${formatDate(expiresAt)})`, 
      variant: 'expired', 
      isExpired: true, 
      isSoon: false,
      diffDays 
    };
  }
  if (diffDays <= 15) {
    return { 
      label: `Expiring in ${diffDays}d (${formatDate(expiresAt)})`, 
      variant: 'soon', 
      isExpired: false, 
      isSoon: true,
      diffDays 
    };
  }
  return { 
    label: `Valid until ${formatDate(expiresAt)}`, 
    variant: 'valid', 
    isExpired: false, 
    isSoon: false,
    diffDays 
  };
}

export default function DistributorLicenseHub({
  session,
  maxLicenses = 10,
  onLicenseIssued,
}) {
  const [companies, setCompanies] = useState([]);
  const [companyAdmins, setCompanyAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states: Issue License
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');

  // Created Success Modal
  const [createdCredential, setCreatedCredential] = useState(null);

  // Edit Details Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    website: '',
    gstin: '',
    pan: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    invoice_prefix: 'INV',
    invoice_notes: '',
    expires_at: '',
  });

  // Quick Expiry Modal
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);
  const [expiryOrg, setExpiryOrg] = useState(null);
  const [quickExpiryDate, setQuickExpiryDate] = useState('');
  const [savingExpiry, setSavingExpiry] = useState(false);

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Access Toggle Loading
  const [togglingAccessId, setTogglingAccessId] = useState(null);

  const toast = useToast();
  const distributorUserId = session?.user?.id;

  // Load companies sold by this distributor
  const loadSoldCompanies = useCallback(async () => {
    if (!distributorUserId) return;
    setLoading(true);

    try {
      // 1. Fetch organizations created/sold by this distributor
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .eq('distributor_user_id', distributorUserId)
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;
      setCompanies(orgsData || []);

      // 2. Fetch admin users for these organizations
      if (orgsData && orgsData.length > 0) {
        const orgIds = orgsData.map(o => o.id);
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .in('organization_id', orgIds)
          .eq('role', 'admin');

        if (usersError) throw usersError;
        setCompanyAdmins(usersData || []);
      } else {
        setCompanyAdmins([]);
      }
    } catch (err) {
      console.error('Error loading sold company licenses:', err);
    } finally {
      setLoading(false);
    }
  }, [distributorUserId]);

  useEffect(() => {
    let isMounted = true;

    async function fetchInitial() {
      if (!distributorUserId) {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .eq('distributor_user_id', distributorUserId)
          .order('created_at', { ascending: false });

        if (orgsError) throw orgsError;
        if (isMounted) setCompanies(orgsData || []);

        if (orgsData && orgsData.length > 0) {
          const orgIds = orgsData.map(o => o.id);
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('*')
            .in('organization_id', orgIds)
            .eq('role', 'admin');

          if (usersError) throw usersError;
          if (isMounted) setCompanyAdmins(usersData || []);
        } else {
          if (isMounted) setCompanyAdmins([]);
        }
      } catch (err) {
        console.error('Error loading sold company licenses:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchInitial();

    if (!distributorUserId) return;

    // Realtime listener for newly created organizations or status changes
    const orgsChannel = supabase
      .channel(`distributor-orgs-sync-${distributorUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organizations',
          filter: `distributor_user_id=eq.${distributorUserId}`,
        },
        () => {
          loadSoldCompanies();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(orgsChannel);
    };
  }, [distributorUserId, loadSoldCompanies]);

  // Admin map for fast lookup
  const adminMap = useMemo(() => {
    const map = new Map();
    for (const a of companyAdmins) {
      map.set(a.organization_id, a);
    }
    return map;
  }, [companyAdmins]);

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase().trim();
    return companies.filter((c) => {
      const admin = adminMap.get(c.id);
      return (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.slug && c.slug.toLowerCase().includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q)) ||
        (c.contact_email && c.contact_email.toLowerCase().includes(q)) ||
        (admin && admin.email && admin.email.toLowerCase().includes(q)) ||
        (admin && admin.full_name && admin.full_name.toLowerCase().includes(q))
      );
    });
  }, [companies, adminMap, searchQuery]);

  const soldCount = companies.length;
  const availableCount = Math.max(0, maxLicenses - soldCount);
  const isPoolExhausted = soldCount >= maxLicenses;
  const usagePercent = Math.min(100, Math.round((soldCount / maxLicenses) * 100));

  // ================= ACTION: OPEN EDIT MODAL =================
  const handleOpenEditModal = (company) => {
    setEditingOrg(company);
    let expiryFormatted = '';
    if (company.expires_at) {
      try {
        expiryFormatted = new Date(company.expires_at).toISOString().split('T')[0];
      } catch {
        expiryFormatted = '';
      }
    }
    setEditForm({
      name: company.name || '',
      website: company.website || '',
      gstin: company.gstin || '',
      pan: company.pan || '',
      contact_phone: company.contact_phone || '',
      contact_email: company.contact_email || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      pincode: company.pincode || '',
      invoice_prefix: company.invoice_prefix || 'INV',
      invoice_notes: company.invoice_notes || 'Thank you for your business. Please make payment before the due date.',
      expires_at: expiryFormatted,
    });
    setIsEditModalOpen(true);
  };

  // ================= ACTION: SAVE EDITED DETAILS =================
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingOrg) return;

    if (!editForm.name.trim()) {
      toast.error('Missing Name', 'Company legal name is required.');
      return;
    }

    setSavingEdit(true);
    try {
      let isoExpiresAt = null;
      if (editForm.expires_at) {
        isoExpiresAt = new Date(`${editForm.expires_at}T23:59:59Z`).toISOString();
      }

      const payload = {
        name: editForm.name.trim(),
        website: editForm.website.trim() || null,
        gstin: editForm.gstin.trim().toUpperCase() || null,
        pan: editForm.pan.trim().toUpperCase() || null,
        contact_phone: editForm.contact_phone.trim() || null,
        contact_email: editForm.contact_email.trim() || null,
        address: editForm.address.trim() || null,
        city: editForm.city.trim() || null,
        state: editForm.state.trim() || null,
        pincode: editForm.pincode.trim() || null,
        invoice_prefix: (editForm.invoice_prefix.trim().toUpperCase() || 'INV').replace(/[^A-Z0-9-]/g, ''),
        invoice_notes: editForm.invoice_notes.trim() || null,
        expires_at: isoExpiresAt,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('organizations')
        .update(payload)
        .eq('id', editingOrg.id);

      if (error) throw error;

      toast.success('Company License Updated', `${editForm.name} details have been saved.`);
      setIsEditModalOpen(false);
      setEditingOrg(null);
      loadSoldCompanies();
    } catch (err) {
      console.error('Failed to update company license details:', err);
      toast.error('Update Failed', err.message || 'Could not update company details.');
    } finally {
      setSavingEdit(false);
    }
  };

  // ================= ACTION: QUICK EXPIRY MODAL =================
  const handleOpenExpiryModal = (company) => {
    setExpiryOrg(company);
    let dateStr = '';
    if (company.expires_at) {
      try {
        dateStr = new Date(company.expires_at).toISOString().split('T')[0];
      } catch {
        dateStr = '';
      }
    }
    setQuickExpiryDate(dateStr);
    setIsExpiryModalOpen(true);
  };

  const handleSaveQuickExpiry = async (e) => {
    e.preventDefault();
    if (!expiryOrg) return;

    setSavingExpiry(true);
    try {
      let isoExpiresAt = null;
      if (quickExpiryDate) {
        isoExpiresAt = new Date(`${quickExpiryDate}T23:59:59Z`).toISOString();
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          expires_at: isoExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', expiryOrg.id);

      if (error) throw error;

      toast.success('Expiry Date Updated', `License validity for ${expiryOrg.name} has been updated.`);
      setIsExpiryModalOpen(false);
      setExpiryOrg(null);
      loadSoldCompanies();
    } catch (err) {
      console.error('Failed to update expiry date:', err);
      toast.error('Update Failed', err.message || 'Could not update expiry date.');
    } finally {
      setSavingExpiry(false);
    }
  };

  // ================= ACTION: TOGGLE ACCESS (DISABLE / REACTIVATE) =================
  const handleToggleAccess = async (company) => {
    const willDisable = !company.is_disabled;
    setTogglingAccessId(company.id);

    try {
      // 1. Try atomic RPC
      const { error: rpcError } = await supabase.rpc('toggle_organization_access', {
        p_org_id: company.id,
        p_is_disabled: willDisable,
      });

      if (rpcError) {
        // Fallback: direct update
        const { error: orgErr } = await supabase
          .from('organizations')
          .update({ is_disabled: willDisable, updated_at: new Date().toISOString() })
          .eq('id', company.id);

        if (orgErr) throw orgErr;

        await supabase
          .from('users')
          .update({ is_disabled: willDisable, updated_at: new Date().toISOString() })
          .eq('organization_id', company.id);
      }

      toast.success(
        willDisable ? 'Company Access Suspended' : 'Company Access Reactivated',
        `${company.name} is now ${willDisable ? 'disabled' : 'active'}.`
      );
      loadSoldCompanies();
    } catch (err) {
      console.error('Failed to toggle company access:', err);
      toast.error('Action Failed', err.message || 'Could not toggle company access.');
    } finally {
      setTogglingAccessId(null);
    }
  };

  // ================= ACTION: DELETE SOLD COMPANY LICENSE =================
  const handleOpenDeleteModal = (company) => {
    setDeletingOrg(company);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingOrg) return;
    setDeleting(true);

    try {
      // 1. Try RPC cascade delete
      const { error: rpcError } = await supabase.rpc('delete_sold_organization', {
        p_org_id: deletingOrg.id,
      });

      if (rpcError) {
        // Fallback: manual cascade
        await supabase.from('invoices').delete().eq('organization_id', deletingOrg.id);
        await supabase.from('status_tracker').delete().eq('organization_id', deletingOrg.id);
        await supabase.from('documents').delete().eq('organization_id', deletingOrg.id);
        await supabase.from('users').delete().eq('organization_id', deletingOrg.id);
        const { error: orgDelErr } = await supabase.from('organizations').delete().eq('id', deletingOrg.id);
        if (orgDelErr) throw orgDelErr;
      }

      toast.success('License Deleted', `${deletingOrg.name} has been deleted and 1 license returned to pool.`);
      setIsDeleteModalOpen(false);
      setDeletingOrg(null);
      loadSoldCompanies();
      onLicenseIssued?.();
    } catch (err) {
      console.error('Failed to delete sold company license:', err);
      toast.error('Deletion Failed', err.message || 'Could not delete company license.');
    } finally {
      setDeleting(false);
    }
  };

  // Issue / Sell New Company License Handler
  const handleIssueCompanyLicense = async (e) => {
    e.preventDefault();
    if (isPoolExhausted) {
      toast.error('License Pool Exhausted', 'You have sold all available licenses. Contact Platform Owner to increase your capacity.');
      return;
    }

    if (!newCompanyName.trim() || !newAdminEmail.trim() || !newAdminPassword) {
      toast.error('Validation Error', 'Please complete all required fields.');
      return;
    }

    setIssuing(true);

    try {
      const cleanSlug = newCompanyName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);
      let isoExpiresAt = null;
      if (newExpiryDate) {
        isoExpiresAt = new Date(`${newExpiryDate}T23:59:59Z`).toISOString();
      }

      // 1. Create New Tenant Organization in Supabase (Attempt RPC first, then direct insert)
      let newOrg = null;

      const { data: rpcOrg, error: rpcError } = await supabase.rpc('provision_company_license', {
        p_company_name: newCompanyName.trim(),
        p_slug: cleanSlug,
        p_contact_email: newAdminEmail.trim(),
        p_contact_phone: newContactPhone.trim() || null,
      });

      if (!rpcError && rpcOrg) {
        newOrg = typeof rpcOrg === 'string' ? JSON.parse(rpcOrg) : rpcOrg;
        if (isoExpiresAt) {
          await supabase.from('organizations').update({ expires_at: isoExpiresAt }).eq('id', newOrg.id);
        }
      } else {
        // Direct insert fallback
        const { data: insertedOrg, error: orgError } = await supabase
          .from('organizations')
          .insert([{
            name: newCompanyName.trim(),
            slug: cleanSlug,
            contact_email: newAdminEmail.trim(),
            contact_phone: newContactPhone.trim() || undefined,
            distributor_user_id: distributorUserId,
            max_licenses: 100,
            feature_invoices: true,
            feature_documents: false,
            feature_work_tracker: false,
            expires_at: isoExpiresAt,
          }])
          .select()
          .single();

        if (orgError) throw orgError;
        newOrg = insertedOrg;
      }

      // 2. Provision Company Admin in Supabase Auth
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: authUser, error: authError } = await tempAuthClient.auth.signUp({
        email: newAdminEmail.trim(),
        password: newAdminPassword,
        options: {
          data: {
            full_name: newAdminName.trim() || newCompanyName.trim(),
            role: 'admin',
            organization_id: newOrg.id,
          }
        }
      });

      if (authError) throw authError;

      // 3. Ensure user profile in public.users
      if (authUser?.user) {
        await supabase
          .from('users')
          .upsert([{
            id: authUser.user.id,
            email: newAdminEmail.trim(),
            full_name: newAdminName.trim() || newCompanyName.trim(),
            role: 'admin',
            organization_id: newOrg.id,
            phone: newContactPhone.trim() || null,
          }]);
      }

      toast.success('License Sold & Provisioned', `${newCompanyName} has been issued a company license.`);
      
      // Save credentials for the modal
      setCreatedCredential({
        companyName: newCompanyName.trim(),
        adminEmail: newAdminEmail.trim(),
        password: newAdminPassword,
        loginUrl: `${window.location.origin}/admin/login`,
      });

      // Reset form
      setNewCompanyName('');
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewContactPhone('');
      setNewExpiryDate('');
      setIsIssueModalOpen(false);

      loadSoldCompanies();
      onLicenseIssued?.();
    } catch (err) {
      console.error('Failed to issue company license:', err);
      toast.error('Provisioning Failed', err.message || 'Could not issue company license.');
    } finally {
      setIssuing(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied', `${label} copied to clipboard!`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header & Overview KPI Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-amber-500" /> License Sales &amp; Company Management Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sell, provision, and manage product licenses for client companies. Edit business profiles, track validity, manage access, or revoke licenses.
          </p>
        </div>

        <Button
          onClick={() => setIsIssueModalOpen(true)}
          disabled={isPoolExhausted}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs h-10 px-5 gap-2 shadow-md hover:shadow-lg self-start sm:self-auto disabled:opacity-50 transition-all rounded-xl"
        >
          <Plus className="w-4 h-4" /> Issue / Sell Company License
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Card 1: Total Allocated Pool */}
        <Card className="border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-white rounded-2xl hover:border-slate-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total License Capacity</span>
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700 border border-slate-200/60">
                <KeyRound className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">{maxLicenses}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Granted by Master Platform Owner</p>
          </CardContent>
        </Card>

        {/* Card 2: Licenses Sold */}
        <Card className="border-sky-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-gradient-to-br from-white to-sky-50/40 rounded-2xl hover:border-sky-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-900 uppercase tracking-wider">Company Licenses Sold</span>
              <div className="p-2.5 bg-sky-100 rounded-xl text-sky-700 border border-sky-200/60">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-sky-900 mt-2 font-mono">{soldCount}</p>
            <p className="text-[11px] text-sky-700 mt-1 font-semibold">{usagePercent}% of quota sold &amp; deployed</p>
          </CardContent>
        </Card>

        {/* Card 3: Available to Sell */}
        <Card className="border-emerald-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-gradient-to-br from-white to-emerald-50/40 rounded-2xl hover:border-emerald-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Available to Sell</span>
              <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700 border border-emerald-200/60">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-emerald-900 mt-2 font-mono">{availableCount}</p>
            <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
              {isPoolExhausted ? 'Quota reached — contact Owner' : 'Ready for immediate provisioning'}
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Quota Progress Banner */}
      <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md border border-slate-800">
        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-amber-400 font-bold">License Pool Usage: {soldCount} Sold / {maxLicenses} Max</span>
            <span className="text-slate-300">{availableCount} licenses available to sell</span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                usagePercent >= 90 ? 'bg-rose-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-sky-500'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Each company operates 100% privately with their own isolated ledger &amp; letterhead.</span>
        </div>
      </div>

      {/* Sold Companies Table */}
      <Card className="border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-white rounded-3xl overflow-hidden">
        
        {/* Search Bar & Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search companies by name, email, GSTIN, or admin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-white border-slate-200 rounded-xl shadow-xs focus:ring-2 focus:ring-sky-500/20"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs font-bold text-slate-500">
            Showing {filteredCompanies.length} of {soldCount} Sold Companies
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-12 text-center text-xs text-slate-400 font-medium">Loading sold company licenses...</p>
          ) : filteredCompanies.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <Building2 className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No company licenses sold yet</p>
              <p className="text-xs text-slate-400">
                {searchQuery ? 'Try clearing your search query.' : 'Click "Issue / Sell Company License" to sell your first product license.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead className="bg-slate-50/80 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4 pl-6">Company &amp; Legal Details</th>
                  <th className="p-4">Administrator Contact</th>
                  <th className="p-4">License Validity</th>
                  <th className="p-4">Access Status</th>
                  <th className="p-4 pr-6 text-right">Manage Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompanies.map((company) => {
                  const admin = adminMap.get(company.id);
                  const initial = (company.name || 'C')[0]?.toUpperCase();
                  const expiryStatus = getExpiryStatus(company.expires_at);
                  const isToggling = togglingAccessId === company.id;

                  return (
                    <tr key={company.id} className={`hover:bg-sky-50/30 transition-colors ${company.is_disabled ? 'bg-slate-50/60 opacity-85' : ''}`}>
                      
                      {/* Col 1: Company Name & Identifiers */}
                      <td className="p-4 pl-6">
                        <div className="flex items-start gap-3.5">
                          <div className={`w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-sm ${
                            company.is_disabled ? 'bg-slate-300 text-slate-700' : 'bg-gradient-to-tr from-slate-900 to-slate-800 text-amber-400'
                          }`}>
                            {initial}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 text-sm">{company.name}</p>
                              {company.website && (
                                <a
                                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sky-600 hover:text-sky-800 p-0.5"
                                  title={`Visit ${company.website}`}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                              {company.gstin && (
                                <span className="bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded border border-slate-200">
                                  GST: {company.gstin}
                                </span>
                              )}
                              {company.pan && (
                                <span className="bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded border border-slate-200">
                                  PAN: {company.pan}
                                </span>
                              )}
                              {company.city && company.state && (
                                <span className="text-slate-400 flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5" /> {company.city}, {company.state}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Col 2: Company Admin */}
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{admin?.full_name || 'Administrator'}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{admin?.email || company.contact_email || '—'}</p>
                        {company.contact_phone && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" /> {company.contact_phone}
                          </p>
                        )}
                      </td>

                      {/* Col 3: Expiry & Validity */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            expiryStatus.variant === 'expired'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : expiryStatus.variant === 'soon'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : expiryStatus.variant === 'perpetual'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            <Clock className="w-3 h-3" />
                            {expiryStatus.label}
                          </span>
                          <p className="text-[10px] text-slate-400">
                            Issued: {formatDate(company.created_at)}
                          </p>
                        </div>
                      </td>

                      {/* Col 4: Access Status */}
                      <td className="p-4">
                        {company.is_disabled ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            <ShieldAlert className="w-3 h-3 text-rose-600" /> Access Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" /> Active Workspace
                          </span>
                        )}
                      </td>

                      {/* Col 5: Actions */}
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Quick Edit Details Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditModal(company)}
                            className="h-8 px-2.5 text-xs text-slate-700 bg-white hover:bg-slate-100 border-slate-200 gap-1 rounded-lg shadow-xs"
                            title="Edit full company details, GSTIN, address, website..."
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-600" /> <span className="hidden xl:inline">Edit Details</span>
                          </Button>

                          {/* Quick Expiry Date Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenExpiryModal(company)}
                            className="h-8 px-2 text-xs text-slate-700 bg-white hover:bg-slate-100 border-slate-200 rounded-lg shadow-xs"
                            title="Adjust license expiry date"
                          >
                            <Calendar className="w-3.5 h-3.5 text-sky-600" />
                          </Button>

                          {/* Toggle Access (Disable/Reactivate) */}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isToggling}
                            onClick={() => handleToggleAccess(company)}
                            className={`h-8 px-2 text-xs rounded-lg shadow-xs transition-colors ${
                              company.is_disabled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                            title={company.is_disabled ? 'Reactivate Company Access' : 'Suspend Company Access'}
                          >
                            {isToggling ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Power className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          {/* Delete License Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDeleteModal(company)}
                            className="h-8 px-2 text-xs text-rose-600 hover:text-white hover:bg-rose-600 border-rose-200 rounded-lg shadow-xs transition-colors"
                            title="Delete License & release capacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </Card>

      {/* ================= MODAL 1: ISSUE / SELL COMPANY LICENSE ================= */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold shadow-sm">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Issue / Sell Company License</h3>
                  <p className="text-xs text-slate-300">Set up a new independent company workspace.</p>
                </div>
              </div>
              <button onClick={() => setIsIssueModalOpen(false)} disabled={issuing} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueCompanyLicense} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Company Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Company / Business Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Apex Retailers Ltd"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  required
                  className="h-9 text-xs rounded-xl"
                />
                <p className="text-[10px] text-slate-400">This company name will brand all client invoices they generate.</p>
              </div>

              {/* Owner / Contact Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Contact Person Name</Label>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Phone Number</Label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* License Expiry Date (Optional) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">License Expiry Date (Optional)</Label>
                <Input
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
                <p className="text-[10px] text-slate-400">Leave blank for a perpetual lifetime license.</p>
              </div>

              {/* Admin Login Credentials */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  Company Administrator Login Credentials
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Admin Email <span className="text-red-500">*</span></Label>
                    <Input
                      type="email"
                      placeholder="admin@company.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      required
                      className="h-8 text-xs font-mono rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Password <span className="text-red-500">*</span></Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Issuing this license uses <strong>1 license</strong> from your pool ({availableCount} remaining). The company can log in immediately at <span className="font-mono font-bold">/admin/login</span>.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsIssueModalOpen(false)}
                  disabled={issuing}
                  className="text-xs h-9 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  size="sm"
                  disabled={issuing}
                  className="text-xs h-9 px-5 font-bold gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md rounded-xl"
                >
                  {issuing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Provisioning...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Issue Company License
                    </>
                  )}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: EDIT FULL COMPANY DETAILS ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-500 text-white rounded-xl font-bold shadow-sm">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Edit Company License Details</h3>
                  <p className="text-xs text-slate-300">Update company profile, statutory tax IDs, and billing letterhead.</p>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} disabled={savingEdit} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Section 1: Business Identity */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block border-b pb-1">
                  1. Business Identity &amp; Web
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Company Legal Name *</Label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                      placeholder="e.g. Apex Retailers Ltd"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Website URL</Label>
                    <Input
                      value={editForm.website}
                      onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                      placeholder="e.g. https://apexretail.com"
                      className="h-9 text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Contact Phone</Label>
                    <Input
                      value={editForm.contact_phone}
                      onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Billing Email</Label>
                    <Input
                      type="email"
                      value={editForm.contact_email}
                      onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                      placeholder="billing@company.com"
                      className="h-9 text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Statutory Tax IDs & Validity */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block border-b pb-1">
                  2. Statutory Tax IDs &amp; License Expiry
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">GSTIN (15 Digits)</Label>
                    <Input
                      value={editForm.gstin}
                      onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value.toUpperCase() })}
                      maxLength={15}
                      placeholder="27ABCDE1234F1Z5"
                      className="h-9 text-xs font-mono uppercase rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">PAN (10 Digits)</Label>
                    <Input
                      value={editForm.pan}
                      onChange={(e) => setEditForm({ ...editForm, pan: e.target.value.toUpperCase() })}
                      maxLength={10}
                      placeholder="ABCDE1234F"
                      className="h-9 text-xs font-mono uppercase rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">License Expiry Date</Label>
                    <Input
                      type="date"
                      value={editForm.expires_at}
                      onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Registered Billing Address */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block border-b pb-1">
                  3. Registered Business Address
                </span>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Street Address</Label>
                  <Input
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    placeholder="Suite 400, Financial Tower, MG Road"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">City</Label>
                    <Input
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      placeholder="Mumbai"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">State</Label>
                    <Input
                      value={editForm.state}
                      onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                      placeholder="Maharashtra"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Pincode</Label>
                    <Input
                      value={editForm.pincode}
                      onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                      placeholder="400001"
                      className="h-9 text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Invoice Branding */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block border-b pb-1">
                  4. Invoice Letterhead Configuration
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Invoice Prefix</Label>
                    <Input
                      value={editForm.invoice_prefix}
                      onChange={(e) => setEditForm({ ...editForm, invoice_prefix: e.target.value.toUpperCase() })}
                      placeholder="INV"
                      className="h-9 text-xs font-mono uppercase rounded-xl"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-bold text-slate-700">Default Invoice Terms / Notes</Label>
                    <Input
                      value={editForm.invoice_notes}
                      onChange={(e) => setEditForm({ ...editForm, invoice_notes: e.target.value })}
                      placeholder="Thank you for your business."
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={savingEdit}
                  className="text-xs h-9 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  size="sm"
                  disabled={savingEdit}
                  className="text-xs h-9 px-6 font-bold gap-2 shadow-md rounded-xl"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Save License Details
                    </>
                  )}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: QUICK EDIT EXPIRY DATE ================= */}
      {isExpiryModalOpen && expiryOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center gap-3 border-b pb-3">
              <div className="p-2.5 bg-sky-100 text-sky-700 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Adjust License Expiry</h3>
                <p className="text-xs text-slate-500 font-medium">{expiryOrg.name}</p>
              </div>
            </div>

            <form onSubmit={handleSaveQuickExpiry} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">License Expiration Date</Label>
                <Input
                  type="date"
                  value={quickExpiryDate}
                  onChange={(e) => setQuickExpiryDate(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
                <p className="text-[11px] text-slate-400">
                  Leave clear to grant a perpetual license with no expiration.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuickExpiryDate('')}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Clear (Perpetual)
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsExpiryModalOpen(false)}
                    disabled={savingExpiry}
                    className="text-xs h-9 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="accent"
                    size="sm"
                    disabled={savingExpiry}
                    className="text-xs h-9 px-5 font-bold gap-1.5 rounded-xl"
                  >
                    {savingExpiry ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Validity'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: DELETE LICENSE CONFIRMATION ================= */}
      {isDeleteModalOpen && deletingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl border border-rose-200 shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
            
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Revoke &amp; Delete License?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete the company license for <strong>{deletingOrg.name}</strong>?
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                This action is permanent:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800 pl-1">
                <li>Deletes company workspace and letters.</li>
                <li>Deactivates all company client accounts.</li>
                <li>Returns <strong>1 license</strong> back to your available pool.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleting}
                className="text-xs h-9 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="text-xs h-9 px-5 font-bold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
                  </>
                )}
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL 5: CREDENTIALS SUCCESS DISPLAY ================= */}
      {createdCredential && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
            
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">License Issued Successfully!</h3>
              <p className="text-xs text-slate-500">
                Share these access credentials with <strong>{createdCredential.companyName}</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Login Portal:</span>
                <button 
                  onClick={() => copyToClipboard(createdCredential.loginUrl, 'Login URL')}
                  className="font-mono font-bold text-sky-700 hover:underline flex items-center gap-1"
                >
                  {createdCredential.loginUrl} <Copy className="w-3 h-3" />
                </button>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Admin Email:</span>
                <button 
                  onClick={() => copyToClipboard(createdCredential.adminEmail, 'Email')}
                  className="font-mono font-bold text-slate-900 hover:underline flex items-center gap-1"
                >
                  {createdCredential.adminEmail} <Copy className="w-3 h-3" />
                </button>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Password:</span>
                <button 
                  onClick={() => copyToClipboard(createdCredential.password, 'Password')}
                  className="font-mono font-bold text-slate-900 hover:underline flex items-center gap-1"
                >
                  {createdCredential.password} <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            <Button
              onClick={() => setCreatedCredential(null)}
              className="w-full h-10 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md"
            >
              Done
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
