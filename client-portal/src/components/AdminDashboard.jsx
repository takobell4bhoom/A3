import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/toast';
import { getSecureDocumentUrl, generateSecureFilePath } from '@/lib/storage';

import AdminHeader from './admin/AdminHeader';
import OverviewDashboard from './admin/OverviewDashboard';
import ClientDirectory from './admin/ClientDirectory';
import ClientWorkspace from './admin/ClientWorkspace/ClientWorkspace';
import DocumentCenter from './admin/DocumentCenter';
import InvoiceBuilder from './admin/InvoiceBuilder/InvoiceBuilder';
import InvoiceList from './admin/InvoiceBuilder/InvoiceList';

import { Users, FolderOpen, Receipt, LayoutDashboard, Plus } from 'lucide-react';

export default function AdminDashboard({ session }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'clients' | 'invoices' | 'documents'
  const [invoiceSubTab, setInvoiceSubTab] = useState('list'); // 'list' | 'create'

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null); // null means viewing ClientDirectory CRM table
  const [allDocuments, setAllDocuments] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [statusTrackerMap, setStatusTrackerMap] = useState({});

  // Loading and action states
  const [loading, setLoading] = useState(true);
  const [creatingClient, setCreatingClient] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [togglingAccess, setTogglingAccess] = useState(false);

  const { organization, signOut } = useAuth();
  const toast = useToast();

  // Load All Clients, All Documents, All Invoices, All Status Trackers
  const refreshGlobalData = useCallback(async () => {
    try {
      // 1. Fetch Clients
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      if (usersData) {
        setCustomers(usersData);
        // If an active customer is selected, sync their updated data
        setSelectedCustomer(prev => (prev ? usersData.find(c => c.id === prev.id) || null : null));
      }

      // 2. Fetch All Documents
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      if (docsData) {
        setAllDocuments(docsData);
      }

      // 3. Fetch All Invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;
      if (invoicesData) {
        setAllInvoices(invoicesData);
      }

      // 4. Fetch All Status Trackers
      const { data: statuses, error: statusError } = await supabase
        .from('status_tracker')
        .select('*');

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
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'customer')
          .order('created_at', { ascending: false });

        if (isMounted && usersData) {
          setCustomers(usersData);
        }

        const { data: docsData } = await supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false });

        if (isMounted && docsData) {
          setAllDocuments(docsData);
        }

        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false });

        if (isMounted && invoicesData) {
          setAllInvoices(invoicesData);
        }

        const { data: statuses } = await supabase
          .from('status_tracker')
          .select('*');

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

    return () => {
      isMounted = false;
    };
  }, []);

  // Client Onboarding Handler
  const handleCreateCustomer = async ({ email, password, fullName }) => {
    setCreatingClient(true);
    try {
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
            role: 'customer',
          },
        },
      });

      if (error) throw error;

      toast.success('Client Onboarded', `Account created for ${email}. Client may now log in.`);
      await refreshGlobalData();
      if (data?.user) {
        const newClient = { id: data.user.id, email, full_name: fullName, is_disabled: false };
        setSelectedCustomer(newClient);
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

  // Delete Customer Handler
  const handleDeleteCustomer = async (customerId) => {
    if (!customerId) return;
    setDeletingClient(true);

    try {
      // 1. Delete records from database (cascades to documents, status_tracker, invoices)
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', customerId);

      if (dbError) throw dbError;

      // 2. Storage files cleanup
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

      // 3. Optimistic state updates
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      setAllDocuments(prev => prev.filter(d => d.user_id !== customerId));
      setAllInvoices(prev => prev.filter(i => i.user_id !== customerId));

      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(null);
      }

      toast.success('Client Deleted', 'Client account and associated records permanently removed.');
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
          file_name: adminFile.name,
          file_url: filePath,
          file_size_bytes: adminFile.size,
          mime_type: adminFile.type || 'application/octet-stream',
          upload_status: 'completed',
          uploaded_by_role: 'admin',
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
        current_step: step,
        notes: notes,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) throw error;

      const targetClient = customers.find(c => c.id === targetCustomerId);
      toast.success('Status Published', `Filing milestone published for ${targetClient?.email || 'client'}.`);
      
      setStatusTrackerMap(prev => ({
        ...prev,
        [targetCustomerId]: { user_id: targetCustomerId, current_step: step, notes, updated_at: new Date().toISOString() }
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
      const { error } = await supabase.from('invoices').insert([invoicePayload]);
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 md:pb-8 flex flex-col font-sans">
      {/* Top Enterprise Header */}
      <AdminHeader
        firmName={organization?.name || 'Tax Shield Advisor'}
        userEmail={session?.user?.email}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'clients') {
            setSelectedCustomer(null);
          }
        }}
        documentCount={allDocuments.length}
        onSignOut={signOut}
      />

      {/* Main Workspace Canvas */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        
        {/* ================= TAB 1: EXECUTIVE OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <OverviewDashboard
            customers={customers}
            documents={allDocuments}
            invoices={allInvoices}
            onSelectClient={(c) => {
              setSelectedCustomer(c);
              setActiveTab('clients');
            }}
            onOpenOnboardModal={() => {
              setSelectedCustomer(null);
              setActiveTab('clients');
            }}
            firmName={organization?.name || 'Tax Shield Advisor'}
          />
        )}

        {/* ================= TAB 2: CLIENTS & 360° WORKSPACE ================= */}
        {activeTab === 'clients' && (
          selectedCustomer ? (
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
              togglingAccess={togglingAccess}
              deletingClient={deletingClient}
              savingStatus={savingStatus}
              savingInvoice={savingInvoice}
              firmName={organization?.name || 'Tax Shield Advisor'}
            />
          ) : (
            <ClientDirectory
              customers={customers}
              documents={allDocuments}
              invoices={allInvoices}
              onSelectCustomer={(c) => setSelectedCustomer(c)}
              onCreateCustomer={handleCreateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              creatingClient={creatingClient}
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
                firmName={organization?.name || 'Tax Shield Advisor'}
              />
            ) : (
              <InvoiceBuilder
                customers={customers}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                onCreateInvoice={handleCreateInvoice}
                onBackToList={() => setInvoiceSubTab('list')}
                savingInvoice={savingInvoice}
              />
            )}
          </div>
        )}

        {/* ================= TAB 4: GLOBAL DOCUMENTS (Master Audit Vault) ================= */}
        {activeTab === 'documents' && (
          <DocumentCenter
            customers={customers}
            documents={allDocuments}
            onUploadAdminDocument={handleAdminFileUpload}
            onDownloadFile={handleDownloadFile}
            onDeleteFile={handleDeleteFile}
          />
        )}
      </main>

      {/* Mobile App Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white border-t border-slate-800 z-40 flex items-center justify-around h-16 px-2 shadow-2xl">
        <button
          onClick={() => {
            setActiveTab('overview');
            setSelectedCustomer(null);
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
          }}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${
            activeTab === 'invoices' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Receipt className="w-5 h-5" /> Invoices
        </button>
        <button
          onClick={() => {
            setActiveTab('documents');
            setSelectedCustomer(null);
          }}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${
            activeTab === 'documents' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <FolderOpen className="w-5 h-5" /> Vault
        </button>
      </nav>
    </div>
  );
}