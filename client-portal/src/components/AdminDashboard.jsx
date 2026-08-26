import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/toast';
import { getSecureDocumentUrl, generateSecureFilePath } from '@/lib/storage';

import AdminHeader from './admin/AdminHeader';
import OverviewDashboard from './admin/OverviewDashboard';
import ClientDirectory from './admin/ClientDirectory';
import ClientOnboardingPage from './admin/ClientOnboardingPage';
import ClientWorkspace from './admin/ClientWorkspace/ClientWorkspace';
import DocumentCenter from './admin/DocumentCenter';
import InvoiceBuilder from './admin/InvoiceBuilder/InvoiceBuilder';
import InvoiceList from './admin/InvoiceBuilder/InvoiceList';
import DistributorLicenseHub from './admin/DistributorLicenses/DistributorLicenseHub';
import CompanySettings from './admin/CompanySettings/CompanySettings';

import { Users, FolderOpen, Receipt, LayoutDashboard, KeyRound, Settings, Plus } from 'lucide-react';

export default function AdminDashboard({ session }) {
  const { organization, profile, isOwner, isDistributor, signOut } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return sessionStorage.getItem('admin_active_tab') || 'overview';
    } catch {
      return 'overview';
    }
  });

  const setActiveTab = (tab) => {
    try {
      sessionStorage.setItem('admin_active_tab', tab);
    } catch (e) {
      console.warn('Failed to save tab in sessionStorage', e);
    }
    setActiveTabState(tab);
  };
  const [invoiceSubTab, setInvoiceSubTab] = useState('list'); // 'list' | 'create'

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null); // null means viewing ClientDirectory CRM table
  const [isCreatingClient, setIsCreatingClient] = useState(false); // true means viewing full-page onboarding screen
  const [allDocuments, setAllDocuments] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [statusTrackerMap, setStatusTrackerMap] = useState({});
  const [soldCompanies, setSoldCompanies] = useState([]);

  const [firmOrg, setFirmOrg] = useState(organization || null);
  const [loading, setLoading] = useState(true);
  const [creatingClient, setCreatingClient] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [togglingAccess, setTogglingAccess] = useState(false);

  // Strictly resolve the active tenant organization ID from user profile / auth
  const orgId = organization?.id || profile?.organization_id || firmOrg?.id || null;

  // Load All Clients, All Documents, All Invoices, All Status Trackers
  // (Supports Downward Visibility for Distributors & Strict Scoping for Buyers)
  const refreshGlobalData = useCallback(async () => {
    if (!orgId) return;
    try {
      // 0. Fetch Live Organization Record
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .maybeSingle();

      if (orgData) {
        setFirmOrg(orgData);
      }

      // Determine organization scope:
      // If Distributor: Own Org + All Buyer Organizations under them
      // If Buyer: Strictly Own Org
      let orgScopeIds = [orgId];
      if (isDistributor && session?.user?.id) {
        const { data: buyerOrgs } = await supabase
          .from('organizations')
          .select('*')
          .eq('distributor_user_id', session.user.id);

        if (buyerOrgs && buyerOrgs.length > 0) {
          setSoldCompanies(buyerOrgs);
          orgScopeIds = [orgId, ...buyerOrgs.map(b => b.id)];
        } else {
          setSoldCompanies([]);
        }
      }

      // 1. Fetch Clients
      let usersQuery = supabase
        .from('users')
        .select('*')
        .eq('role', 'customer');

      if (orgScopeIds.length === 1) {
        usersQuery = usersQuery.eq('organization_id', orgScopeIds[0]);
      } else {
        usersQuery = usersQuery.in('organization_id', orgScopeIds);
      }

      const { data: usersData, error: usersError } = await usersQuery.order('created_at', { ascending: false });

      if (usersError) throw usersError;
      if (usersData) {
        setCustomers(usersData);
        // If an active customer is selected, sync their updated data
        setSelectedCustomer(prev => (prev ? usersData.find(c => c.id === prev.id) || null : null));
      }

      // 2. Fetch All Documents
      let docsQuery = supabase.from('documents').select('*');
      if (orgScopeIds.length === 1) {
        docsQuery = docsQuery.eq('organization_id', orgScopeIds[0]);
      } else {
        docsQuery = docsQuery.in('organization_id', orgScopeIds);
      }
      const { data: docsData, error: docsError } = await docsQuery.order('created_at', { ascending: false });

      if (docsError) throw docsError;
      if (docsData) {
        setAllDocuments(docsData);
      }

      // 3. Fetch All Invoices
      let invoicesQuery = supabase.from('invoices').select('*');
      if (orgScopeIds.length === 1) {
        invoicesQuery = invoicesQuery.eq('organization_id', orgScopeIds[0]);
      } else {
        invoicesQuery = invoicesQuery.in('organization_id', orgScopeIds);
      }
      const { data: invoicesData, error: invoicesError } = await invoicesQuery.order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;
      if (invoicesData) {
        setAllInvoices(invoicesData);
      }

      // 4. Fetch All Status Trackers
      let statusQuery = supabase.from('status_tracker').select('*');
      if (orgScopeIds.length === 1) {
        statusQuery = statusQuery.eq('organization_id', orgScopeIds[0]);
      } else {
        statusQuery = statusQuery.in('organization_id', orgScopeIds);
      }
      const { data: statuses, error: statusError } = await statusQuery;

      if (statusError) throw statusError;
      if (statuses) {
        const map = {};
        for (const s of statuses) {
          map[s.user_id] = s;
        }
        setStatusTrackerMap(map);
      }
    } catch (err) {
      console.error('Error loading firm data:', err);
    }
  }, [orgId, isDistributor, session]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      if (!orgId) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        // 0. Live Organization Data
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .maybeSingle();

        if (isMounted && orgData) {
          setFirmOrg(orgData);
        }

        // Determine org scope
        let orgScopeIds = [orgId];
        if (isDistributor && session?.user?.id) {
          const { data: buyerOrgs } = await supabase
            .from('organizations')
            .select('id')
            .eq('distributor_user_id', session.user.id);

          if (buyerOrgs && buyerOrgs.length > 0) {
            orgScopeIds = [orgId, ...buyerOrgs.map(b => b.id)];
          }
        }

        // 1. Clients
        let usersQuery = supabase
          .from('users')
          .select('*')
          .eq('role', 'customer');

        if (orgScopeIds.length === 1) {
          usersQuery = usersQuery.eq('organization_id', orgScopeIds[0]);
        } else {
          usersQuery = usersQuery.in('organization_id', orgScopeIds);
        }

        const { data: usersData } = await usersQuery.order('created_at', { ascending: false });

        if (isMounted && usersData) {
          setCustomers(usersData);
        }

        // 2. Documents
        let docsQuery = supabase.from('documents').select('*');
        if (orgScopeIds.length === 1) {
          docsQuery = docsQuery.eq('organization_id', orgScopeIds[0]);
        } else {
          docsQuery = docsQuery.in('organization_id', orgScopeIds);
        }
        const { data: docsData } = await docsQuery.order('created_at', { ascending: false });

        if (isMounted && docsData) {
          setAllDocuments(docsData);
        }

        // 3. Invoices
        let invoicesQuery = supabase.from('invoices').select('*');
        if (orgScopeIds.length === 1) {
          invoicesQuery = invoicesQuery.eq('organization_id', orgScopeIds[0]);
        } else {
          invoicesQuery = invoicesQuery.in('organization_id', orgScopeIds);
        }
        const { data: invoicesData } = await invoicesQuery.order('created_at', { ascending: false });

        if (isMounted && invoicesData) {
          setAllInvoices(invoicesData);
        }

        // 4. Status Trackers
        let statusQuery = supabase.from('status_tracker').select('*');
        if (orgScopeIds.length === 1) {
          statusQuery = statusQuery.eq('organization_id', orgScopeIds[0]);
        } else {
          statusQuery = statusQuery.in('organization_id', orgScopeIds);
        }
        const { data: statuses } = await statusQuery;

        if (isMounted && statuses) {
          const map = {};
          for (const s of statuses) {
            map[s.user_id] = s;
          }
          setStatusTrackerMap(map);
        }
      } catch (err) {
        console.error('Error in initial load:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitial();

    if (!orgId) return;

    // Listen to realtime updates strictly on current organization
    const orgSubscription = supabase
      .channel(`public:organizations:${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'organizations', filter: `id=eq.${orgId}` },
        (payload) => {
          if (payload.new) {
            setFirmOrg(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(orgSubscription);
    };
  }, [orgId, isDistributor, session?.user?.id]);

  // Comprehensive Client Onboarding Handler
  const handleCreateCustomer = async (clientPayload) => {
    setCreatingClient(true);
    try {
      const { 
        email, 
        password, 
        fullName, 
        phone, 
        fileNo, 
        clientType, 
        clientGroup, 
        pan, 
        gstin, 
        billingProfile, 
        contactPerson, 
        dob, 
        secondaryMobile, 
        contactEmail, 
        address, 
        city, 
        pincode, 
        state, 
        isActive, 
        hasOpeningBalance, 
        openingBalance, 
        openingBalanceType,
        photoUrl
      } = clientPayload;

      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );

      const { data, error } = await tempSupabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || undefined,
            role: 'customer',
            organization_id: orgId,
            file_no: fileNo,
            client_type: clientType,
            client_group: clientGroup,
            pan: pan,
            gstin: gstin,
            billing_profile: billingProfile,
            contact_person: contactPerson,
            date_of_birth: dob,
            secondary_mobile: secondaryMobile,
            contact_email: contactEmail,
            address: address,
            city: city,
            pincode: pincode,
            state: state,
            is_active: isActive !== false,
            opening_balance: hasOpeningBalance ? openingBalance : 0,
            opening_balance_type: openingBalanceType || 'Dr',
            avatar_url: photoUrl,
          },
        },
      });

      if (error) throw error;

      // Update public.users record with organization_id
      if (data?.user?.id) {
        await supabase
          .from('users')
          .update({
            full_name: fullName,
            phone: phone || undefined,
            organization_id: orgId,
            is_disabled: !isActive,
          })
          .eq('id', data.user.id);
      }

      // If opening balance exists, automatically issue an opening balance ledger invoice
      if (hasOpeningBalance && Number(openingBalance) > 0 && data?.user?.id) {
        const openingBalanceCents = Math.round(Number(openingBalance) * 100);
        await supabase.from('invoices').insert([{
          user_id: data.user.id,
          organization_id: orgId,
          invoice_no: `OPN-${Date.now().toString().slice(-6)}`,
          billing_entity: 'Opening Balance Ledger',
          issue_date: new Date().toISOString().split('T')[0],
          subtotal_cents: openingBalanceCents,
          total_cents: openingBalanceCents,
          amount: Number(openingBalance),
          status: 'unpaid',
          items: [{
            title: `Opening Balance (${openingBalanceType === 'Dr' ? 'Debit / Receivable' : 'Credit / Advance'})`,
            description: `Initial ledger opening balance configured during client registration`,
            quantity: 1,
            rate: Number(openingBalance),
            amount: Number(openingBalance),
          }],
        }]);
      }

      toast.success('Client Onboarded', `Profile created for ${email}. Client workspace initialized.`);
      await refreshGlobalData();

      if (data?.user) {
        const newClient = {
          id: data.user.id,
          email,
          full_name: fullName,
          phone: phone || null,
          is_disabled: !isActive,
        };
        setSelectedCustomer(newClient);
        setIsCreatingClient(false);
        setActiveTab('clients');
      }
      return true;
    } catch (err) {
      toast.error('Onboarding Failed', err.message || 'Could not create client account.');
      return false;
    } finally {
      setCreatingClient(false);
    }
  };

  // Update Client Profile Handler
  const handleUpdateClient = async (updatedData) => {
    try {
      const { id, full_name, phone, is_disabled } = updatedData;
      
      const { error } = await supabase
        .from('users')
        .update({
          full_name: full_name,
          phone: phone || null,
          is_disabled: Boolean(is_disabled),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      const merged = { ...selectedCustomer, ...updatedData };
      setSelectedCustomer(merged);
      setCustomers(prev => prev.map(c => c.id === id ? merged : c));

      toast.success('Profile Saved', `Updated details for ${full_name || selectedCustomer?.email}.`);
      return true;
    } catch (err) {
      toast.error('Update Failed', err.message || 'Could not update client profile.');
      return false;
    }
  };

  // Toggle Client Access (Enable / Disable)
  const handleToggleClientAccess = async () => {
    if (!selectedCustomer) return;
    const newStatus = !selectedCustomer.is_disabled;
    setTogglingAccess(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_disabled: newStatus })
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      const updatedCustomer = { ...selectedCustomer, is_disabled: newStatus };
      setSelectedCustomer(updatedCustomer);
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? updatedCustomer : c));

      toast.success(
        newStatus ? 'Access Suspended' : 'Access Restored',
        `Portal access for ${selectedCustomer.email} is now ${newStatus ? 'disabled' : 'active'}.`
      );
    } catch (err) {
      toast.error('Update Failed', err.message || 'Could not change client access status.');
    } finally {
      setTogglingAccess(false);
    }
  };

  // Delete Customer Handler (Safely purges child records first to prevent foreign key errors)
  const handleDeleteCustomer = async (customerId) => {
    if (!customerId) return;
    setDeletingClient(true);

    try {
      // 1. Delete child status tracker record
      await supabase
        .from('status_tracker')
        .delete()
        .eq('user_id', customerId);

      // 2. Delete child invoices
      await supabase
        .from('invoices')
        .delete()
        .eq('user_id', customerId);

      // 3. Delete child document metadata
      await supabase
        .from('documents')
        .delete()
        .eq('user_id', customerId);

      // 4. Delete storage files
      try {
        const { data: files } = await supabase.storage
          .from('customer-documents')
          .list(customerId);

        if (files && files.length > 0) {
          const filePaths = files.map(f => `${customerId}/${f.name}`);
          await supabase.storage.from('customer-documents').remove(filePaths);
        }
      } catch (storageErr) {
        console.warn('Storage cleanup non-fatal warning:', storageErr);
      }

      // 5. Delete parent user row from users table
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', customerId);

      if (dbError) throw dbError;

      // 6. Optimistic state updates
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      setAllDocuments(prev => prev.filter(d => d.user_id !== customerId));
      setAllInvoices(prev => prev.filter(i => i.user_id !== customerId));

      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(null);
      }

      toast.success('Client Deleted', 'Client account and all associated records permanently removed.');
    } catch (err) {
      toast.error('Deletion Failed', err.message || 'Could not delete client.');
    } finally {
      setDeletingClient(false);
    }
  };

  // Document Delivery Handler
  const handleAdminFileUpload = async (targetCustomerId, adminFile) => {
    if (!adminFile || !targetCustomerId) return false;

    try {
      const { filePath } = generateSecureFilePath(targetCustomerId, adminFile.name, 'admin');

      const { error: uploadError } = await supabase.storage
        .from('customer-documents')
        .upload(filePath, adminFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: adminFile.type || 'application/pdf',
        });

      if (uploadError) throw uploadError;

      const { data: newDoc, error: dbError } = await supabase
        .from('documents')
        .insert([{
          user_id: targetCustomerId,
          organization_id: orgId,
          file_name: adminFile.name,
          file_url: filePath,
          file_size_bytes: adminFile.size,
          mime_type: adminFile.type || 'application/octet-stream',
          upload_status: 'completed',
          uploaded_by_role: 'admin',
          uploaded_by_user_id: session?.user?.id,
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      const targetClient = customers.find(c => c.id === targetCustomerId);
      toast.success('Document Delivered', `Delivered ${adminFile.name} to ${targetClient?.email || 'client'}.`);
      
      if (newDoc) {
        setAllDocuments(prev => [newDoc, ...prev]);
      } else {
        await refreshGlobalData();
      }
      return true;
    } catch (err) {
      toast.error('Delivery Failed', err.message || 'Could not upload document.');
      return false;
    }
  };

  // Download & Delete File Handlers
  const handleDownloadFile = async (filePath) => {
    try {
      const signedUrl = await getSecureDocumentUrl(filePath, 180);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error('Download Failed', err.message);
    }
  };

  const handleDeleteFile = async (docId, filePath) => {
    try {
      const cleanPath = filePath.includes('customer-documents/') 
        ? filePath.split('customer-documents/').pop() 
        : filePath;

      await supabase.storage.from('customer-documents').remove([cleanPath]);
      const { error } = await supabase.from('documents').delete().eq('id', docId);
      if (error) throw error;

      toast.success('Document Deleted', 'File removed from secure storage.');
      setAllDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      toast.error('Delete Failed', err.message);
    }
  };

  // Update Status Milestone
  const handleUpdateStatus = async (targetCustomerId, step, notes) => {
    if (!targetCustomerId) return;
    setSavingStatus(true);

    try {
      const { error } = await supabase.from('status_tracker').upsert({
        user_id: targetCustomerId,
        organization_id: orgId,
        current_step: step,
        notes: notes,
        updated_by: session?.user?.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) throw error;

      const targetClient = customers.find(c => c.id === targetCustomerId);
      toast.success('Status Published', `Filing milestone published for ${targetClient?.email || 'client'}.`);
      
      setStatusTrackerMap(prev => ({
        ...prev,
        [targetCustomerId]: { user_id: targetCustomerId, organization_id: orgId, current_step: step, notes, updated_at: new Date().toISOString() }
      }));
    } catch (err) {
      toast.error('Status Error', err.message);
    } finally {
      setSavingStatus(false);
    }
  };

  // Create Invoice Handler
  const handleCreateInvoice = async (invoicePayload) => {
    setSavingInvoice(true);
    try {
      const { error } = await supabase.from('invoices').insert([{
        ...invoicePayload,
        organization_id: orgId,
      }]);
      if (error) throw error;

      toast.success(
        'Invoice Created & Dispatched',
        `Invoice ${invoicePayload.invoice_no} issued successfully.`
      );
      await refreshGlobalData();
      return true;
    } catch (err) {
      toast.error('Invoice Creation Failed', err.message);
      return false;
    } finally {
      setSavingInvoice(false);
    }
  };

  // Toggle Invoice Status (Paid / Unpaid)
  const handleToggleInvoiceStatus = async (invoiceId, newStatus) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);

      if (error) throw error;

      setAllInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: newStatus } : inv));
      toast.success('Status Updated', `Invoice status updated to ${newStatus.toUpperCase()}.`);
    } catch (err) {
      toast.error('Update Failed', err.message);
    }
  };

  // Delete Invoice Handler
  const handleDeleteInvoice = async (invoiceId) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;

      setAllInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      toast.success('Invoice Deleted', 'Invoice permanently removed.');
    } catch (err) {
      toast.error('Delete Failed', err.message);
    }
  };

  // Filter client-specific documents & invoices when in Client Workspace
  const selectedClientDocuments = selectedCustomer 
    ? allDocuments.filter(d => d.user_id === selectedCustomer.id) 
    : [];

  const selectedClientInvoices = selectedCustomer 
    ? allInvoices.filter(i => i.user_id === selectedCustomer.id) 
    : [];

  const selectedClientStatusTracker = selectedCustomer 
    ? statusTrackerMap[selectedCustomer.id] || null 
    : null;

  const activeMaxLicenses = Number(firmOrg?.max_licenses ?? organization?.max_licenses ?? 25);
  const activeFirmName = firmOrg?.name || organization?.name || 'Tax Shield Advisor';
  const soldLicensesCount = soldCompanies.length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-24 md:pb-12 flex flex-col font-sans selection:bg-sky-100 selection:text-sky-900">
      {/* Top Enterprise Header */}
      <AdminHeader
        firmName={activeFirmName}
        logoUrl={firmOrg?.logo_url || organization?.logo_url}
        userEmail={session?.user?.email}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'clients') {
            setSelectedCustomer(null);
            setIsCreatingClient(false);
          }
        }}
        documentCount={allDocuments.length}
        clientCount={customers.length}
        maxLicenses={activeMaxLicenses}
        soldLicensesCount={soldLicensesCount}
        isOwner={isOwner}
        isDistributor={isDistributor}
        onSignOut={signOut}
      />

      {/* Main Enterprise Workspace Canvas (Widescreen Fluid Layout) */}
      <main className="max-w-[1600px] w-full mx-auto px-4 sm:px-8 lg:px-10 py-8 flex-1 space-y-8">
        
        {/* ================= TAB 1: EXECUTIVE OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <OverviewDashboard
            customers={customers}
            documents={allDocuments}
            invoices={allInvoices}
            onSelectClient={(c) => {
              setSelectedCustomer(c);
              setIsCreatingClient(false);
              setActiveTab('clients');
            }}
            onOpenOnboardModal={() => {
              setSelectedCustomer(null);
              setIsCreatingClient(true);
              setActiveTab('clients');
            }}
            onNavigateToLicenses={() => {
              setSelectedCustomer(null);
              setIsCreatingClient(false);
              setActiveTab('licenses');
            }}
            isDistributor={isDistributor}
            maxLicenses={activeMaxLicenses}
            soldLicensesCount={soldLicensesCount}
            firmName={activeFirmName}
          />
        )}

        {/* ================= TAB 2: CLIENTS & 360° WORKSPACE ================= */}
        {activeTab === 'clients' && (
          isCreatingClient ? (
            <ClientOnboardingPage
              customers={customers}
              onBack={() => setIsCreatingClient(false)}
              onCreateCustomer={handleCreateCustomer}
              maxLicenses={activeMaxLicenses}
              creatingClient={creatingClient}
            />
          ) : selectedCustomer ? (
            <ClientWorkspace
              client={selectedCustomer}
              onBackToDirectory={() => setSelectedCustomer(null)}
              documents={selectedClientDocuments}
              invoices={selectedClientInvoices}
              statusTracker={selectedClientStatusTracker}
              onUploadDocument={handleAdminFileUpload}
              onDownloadFile={handleDownloadFile}
              onDeleteFile={handleDeleteFile}
              onUpdateStatus={handleUpdateStatus}
              onCreateInvoice={handleCreateInvoice}
              onToggleInvoiceStatus={handleToggleInvoiceStatus}
              onDeleteInvoice={handleDeleteInvoice}
              onToggleClientAccess={handleToggleClientAccess}
              onDeleteClient={handleDeleteCustomer}
              onUpdateClient={handleUpdateClient}
              togglingAccess={togglingAccess}
              deletingClient={deletingClient}
              savingStatus={savingStatus}
              savingInvoice={savingInvoice}
              firmName={activeFirmName}
            />
          ) : (
            <ClientDirectory
              customers={customers}
              documents={allDocuments}
              invoices={allInvoices}
              onSelectCustomer={(c) => {
                setSelectedCustomer(c);
                setIsCreatingClient(false);
              }}
              onOpenOnboardPage={() => setIsCreatingClient(true)}
              onDeleteCustomer={handleDeleteCustomer}
              deletingClient={deletingClient}
              loading={loading}
            />
          )
        )}

        {/* ================= TAB 3: ALL INVOICES (Firm-wide Ledger) ================= */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setInvoiceSubTab('list')}
                  className={`text-xs px-4 py-2 rounded-lg font-semibold transition-all ${
                    invoiceSubTab === 'list'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Invoices ({allInvoices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceSubTab('create')}
                  className={`text-xs px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                    invoiceSubTab === 'create'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" /> Create Invoice
                </button>
              </div>

              <span className="text-[11px] font-mono font-medium text-slate-500 hidden sm:inline pr-2">
                Currency: ₹ (INR)
              </span>
            </div>

            {invoiceSubTab === 'list' ? (
              <InvoiceList
                invoices={allInvoices}
                customers={customers}
                onToggleInvoiceStatus={handleToggleInvoiceStatus}
                onDeleteInvoice={handleDeleteInvoice}
                onSwitchToCreate={() => setInvoiceSubTab('create')}
                organization={firmOrg || organization}
                firmName={activeFirmName}
              />
            ) : (
              <InvoiceBuilder
                customers={customers}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                onCreateInvoice={handleCreateInvoice}
                onBackToList={() => setInvoiceSubTab('list')}
                organization={firmOrg || organization}
                savingInvoice={savingInvoice}
              />
            )}
          </div>
        )}

        {/* ================= TAB 4: GLOBAL DOCUMENTS (Master Audit Vault - Distributor Only) ================= */}
        {activeTab === 'documents' && isDistributor && (
          <DocumentCenter
            customers={customers}
            documents={allDocuments}
            onUploadAdminDocument={handleAdminFileUpload}
            onDownloadFile={handleDownloadFile}
            onDeleteFile={handleDeleteFile}
          />
        )}

        {/* ================= TAB 5: SELL & MANAGE LICENSES (Distributor Only) ================= */}
        {activeTab === 'licenses' && isDistributor && (
          <DistributorLicenseHub
            session={session}
            maxLicenses={activeMaxLicenses}
            distributorOrg={firmOrg}
            onLicenseIssued={refreshGlobalData}
          />
        )}

        {/* ================= TAB 6: COMPANY SETTINGS & SECURITY (All Roles) ================= */}
        {activeTab === 'settings' && (
          <CompanySettings
            key={firmOrg?.id || organization?.id || 'company-settings'}
            organization={firmOrg || organization}
            onUpdateOrganization={(updated) => {
              setFirmOrg(updated);
            }}
          />
        )}
      </main>

      {/* Mobile App Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white border-t border-slate-800 z-40 flex items-center justify-around h-16 px-2 shadow-2xl">
        <button
          onClick={() => {
            setActiveTab('overview');
            setSelectedCustomer(null);
            setIsCreatingClient(false);
          }}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${
            activeTab === 'overview' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" /> Overview
        </button>
        <button
          onClick={() => {
            setActiveTab('clients');
          }}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${
            activeTab === 'clients' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Users className="w-5 h-5" /> Clients
        </button>
        <button
          onClick={() => {
            setActiveTab('invoices');
            setSelectedCustomer(null);
            setIsCreatingClient(false);
          }}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${
            activeTab === 'invoices' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Receipt className="w-5 h-5" /> Invoices
        </button>
        {isDistributor && (
          <button
            onClick={() => {
              setActiveTab('documents');
              setSelectedCustomer(null);
              setIsCreatingClient(false);
            }}
            className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${
              activeTab === 'documents' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <FolderOpen className="w-5 h-5" /> Vault
          </button>
        )}
        {isDistributor && (
          <button
            onClick={() => {
              setActiveTab('licenses');
              setSelectedCustomer(null);
              setIsCreatingClient(false);
            }}
            className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${
              activeTab === 'licenses' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <KeyRound className="w-5 h-5" /> Licenses
          </button>
        )}
        <button
          onClick={() => {
            setActiveTab('settings');
            setSelectedCustomer(null);
            setIsCreatingClient(false);
          }}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${
            activeTab === 'settings' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Settings className="w-5 h-5" /> Settings
        </button>
      </nav>
    </div>
  );
}