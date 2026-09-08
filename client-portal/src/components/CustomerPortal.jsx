import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/toast';
import { getSecureDocumentUrl } from '@/lib/storage';
import CustomerHeader from './customer/CustomerHeader';
import WorkTrackerCard from './customer/WorkTrackerCard';
import CustomerDocuments from './customer/CustomerDocuments';
import CustomerInvoices from './customer/CustomerInvoices';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, FolderOpen, Receipt, ShieldAlert, LayoutGrid } from 'lucide-react';

export default function CustomerPortal({ session }) {
  const navigate = useNavigate();
  const { user, organization, isDisabled, features, signOut } = useAuth();

  const showWorkTracker = features?.workTracker !== false;
  const showDocuments = features?.documents !== false;
  const showInvoices = features?.invoices !== false;

  // Determine initial active tab based on permitted features
  const defaultTab = showWorkTracker ? 'overview' 
    : showDocuments ? 'documents' 
    : 'invoices';

  const [selectedTab, setSelectedTab] = useState(null);
  
  // Compute effective tab based on current feature permissions
  let activeTab = selectedTab || defaultTab;
  if (activeTab === 'overview' && !showWorkTracker) {
    activeTab = showDocuments ? 'documents' : 'invoices';
  } else if (activeTab === 'documents' && !showDocuments) {
    activeTab = showWorkTracker ? 'overview' : 'invoices';
  }

  const setActiveTab = (tab) => setSelectedTab(tab);

  const [documents, setDocuments] = useState([]);
  const [statusTracker, setStatusTracker] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = session?.user?.id || user?.id;
  const toast = useToast();

  const fetchPortalData = useCallback(async () => {
    if (!userId) return;

    try {
      // 1. Fetch Client Documents
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      // 2. Fetch Live Status Milestone
      const { data: status, error: statusError } = await supabase
        .from('status_tracker')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (statusError) throw statusError;

      // 3. Fetch Invoices
      const { data: invs, error: invsError } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (invsError) throw invsError;

      setDocuments(docs || []);
      setStatusTracker(status);
      setInvoices(invs || []);
    } catch (err) {
      console.error('Error fetching portal data:', err);
      toast.error('Sync Error', 'Failed to load your recent files and invoices.');
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    async function loadInitial() {
      try {
        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (isMounted && docs) setDocuments(docs);

        const { data: status } = await supabase
          .from('status_tracker')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (isMounted && status) setStatusTracker(status);

        const { data: invs } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (isMounted && invs) setInvoices(invs);
      } catch (err) {
        console.error('Error in initial fetch:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitial();

    // Realtime subscription for work tracker status updates
    const statusSubscription = supabase
      .channel(`public:status_tracker:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'status_tracker',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            setStatusTracker(payload.new);
            toast.info('Status Updated', `Your filing status milestone has been updated.`);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(statusSubscription);
    };
  }, [userId, toast]);

  const handleDownloadFile = async (filePath) => {
    try {
      const signedUrl = await getSecureDocumentUrl(filePath, 180);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error('Download Interrupted', err.message || 'Could not generate secure document link.');
    }
  };

  if (isDisabled) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <Card className="max-w-md w-full border-red-200 bg-white shadow-xl">
          <CardHeader className="pb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2 text-red-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">Portal Access Suspended</CardTitle>
            <CardDescription className="text-slate-500">
              Your account has been deactivated by your firm administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
              Please contact {organization?.name || 'Tax Shield Advisor'} support to re-activate your portal access.
            </p>
            <Button variant="outline" className="w-full" onClick={signOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const adminSentDocuments = documents.filter(d => d.uploaded_by_role === 'admin');
  const customerUploadedDocuments = documents.filter(d => d.uploaded_by_role !== 'admin');

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-24 md:pb-12 flex flex-col font-sans selection:bg-sky-100 selection:text-sky-900">
      {/* Header Bar */}
      <CustomerHeader
        firmName={organization?.name || 'Tax Shield Advisor'}
        logoUrl={organization?.logo_url}
        userEmail={session?.user?.email}
        userId={userId}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documentCount={documents.length}
        invoiceCount={invoices.length}
        features={features}
        onSignOut={signOut}
      />

      {/* Main Enterprise Canvas (Widescreen Fluid Layout) */}
      <main className="max-w-[1600px] w-full mx-auto px-4 sm:px-8 lg:px-10 py-8 flex-1 space-y-8">
        
        {/* ================= TAB 1: WORK TRACKER (Only if enabled) ================= */}
        {activeTab === 'overview' && showWorkTracker && (
          <WorkTrackerCard statusTracker={statusTracker} />
        )}

        {/* ================= TAB 2: MY DOCUMENTS (Only if enabled) ================= */}
        {activeTab === 'documents' && showDocuments && (
          <CustomerDocuments
            userId={userId}
            adminSentDocuments={adminSentDocuments}
            customerUploadedDocuments={customerUploadedDocuments}
            loading={loading}
            onDownloadFile={handleDownloadFile}
            onUploadComplete={fetchPortalData}
          />
        )}

        {/* ================= TAB 3: INVOICES ================= */}
        {(activeTab === 'invoices' || (!showWorkTracker && !showDocuments)) && showInvoices && (
          <CustomerInvoices 
            invoices={invoices} 
            loading={loading} 
            organization={organization}
            firmName={organization?.name || 'Tax Shield Advisor'} 
          />
        )}

      </main>

      {/* Mobile App Bottom Navigation Bar (Dynamically Gated) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white border-t border-slate-800 z-40 flex items-center justify-around h-16 px-2">
        <button
          onClick={() => navigate('/m')}
          className="flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 text-slate-400 hover:text-white"
        >
          <LayoutGrid className="w-5 h-5 text-blue-400" /> Home
        </button>

        {showWorkTracker && (
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${
              activeTab === 'overview' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Clock className="w-5 h-5" /> Status
          </button>
        )}

        {showDocuments && (
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${
              activeTab === 'documents' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <FolderOpen className="w-5 h-5" /> Docs
          </button>
        )}

        {showInvoices && (
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${
              activeTab === 'invoices' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Receipt className="w-5 h-5" /> Invoices
          </button>
        )}
      </nav>
    </div>
  );
}