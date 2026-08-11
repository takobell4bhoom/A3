import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import FileUpload from './FileUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building2, LogOut, CheckCircle, Clock, CreditCard, ExternalLink, 
  FileCheck, Download, FileDown, ShieldAlert, Receipt, LayoutDashboard, FolderOpen
} from 'lucide-react';

export default function CustomerPortal({ session }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'documents' | 'invoices'
  const [documents, setDocuments] = useState([]);
  const [statusTracker, setStatusTracker] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [isDisabled, setIsDisabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    fetchPortalData();

    const statusSubscription = supabase
      .channel('public:status_tracker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status_tracker', filter: `user_id=eq.${userId}` }, 
        payload => setStatusTracker(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusSubscription);
    };
  }, [userId]);

  const fetchPortalData = async () => {
    setLoading(true);

    const { data: userData } = await supabase
      .from('users')
      .select('is_disabled')
      .eq('id', userId)
      .maybeSingle();

    if (userData?.is_disabled) {
      setIsDisabled(true);
      setLoading(false);
      return;
    }

    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const { data: status } = await supabase
      .from('status_tracker')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: invs } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setDocuments(docs || []);
    setStatusTracker(status);
    setInvoices(invs || []);
    setLoading(false);
  };

  const handleDownloadFile = async (filePath) => {
    try {
      let cleanPath = filePath.includes('customer-documents/') ? filePath.split('customer-documents/').pop() : filePath;
      const { data, error } = await supabase.storage
        .from('customer-documents')
        .createSignedUrl(cleanPath, 60);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      alert('Error accessing document: ' + err.message);
    }
  };

  const handleSignOut = () => supabase.auth.signOut();

  if (isDisabled) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <Card className="max-w-md w-full border-red-200 bg-white shadow-xl">
          <CardHeader className="pb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2 text-red-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">Portal Access Suspended</CardTitle>
            <CardDescription className="text-slate-500">Your account has been deactivated by your firm administrator.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
              Please contact Apex Tax & Advisory support to re-activate your portal access.
            </p>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>Sign Out</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const adminSentDocuments = documents.filter(d => d.uploaded_by_role === 'admin');
  const customerUploadedDocuments = documents.filter(d => d.uploaded_by_role !== 'admin');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 md:pb-8 flex flex-col">
      
      {/* Header Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-none">Apex Tax & Advisory</h1>
              <span className="text-xs text-slate-400">Client Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">{session?.user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5 text-xs bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700">
              <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Desktop Header Nav Tabs */}
        <div className="hidden md:block bg-slate-950 border-t border-slate-800/80">
          <div className="max-w-7xl mx-auto px-6 flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'overview' ? 'border-emerald-400 text-emerald-400 bg-white/5' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Work Tracker
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'documents' ? 'border-emerald-400 text-emerald-400 bg-white/5' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-4 h-4" /> My Documents ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'invoices' ? 'border-emerald-400 text-emerald-400 bg-white/5' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Receipt className="w-4 h-4" /> Invoices ({invoices.length})
            </button>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">

        {/* ================= TAB 1: WORK TRACKER ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <Card className="border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-emerald-400" /> Work Status Tracker
                </CardTitle>
                <CardDescription className="text-slate-300">Live updates on your ongoing tax filing and financial review.</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {statusTracker ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Current Phase</span>
                      <span className="text-[10px] text-slate-400">Updated: {new Date(statusTracker.updated_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-white">{statusTracker.current_step}</div>
                    {statusTracker.notes && <p className="text-xs sm:text-sm text-slate-300 bg-white/10 p-3 rounded-lg border border-white/10">{statusTracker.notes}</p>}
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm">No active filing process initiated yet.</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ================= TAB 2: MY DOCUMENTS ================= */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            
            {/* Deliveries from advisor */}
            <Card className="border-emerald-200 bg-emerald-50/20 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
                  <FileDown className="w-5 h-5 text-emerald-600" /> Documents From Your Tax Advisor ({adminSentDocuments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <p className="text-sm text-slate-400">Loading...</p> : adminSentDocuments.length === 0 ? (
                  <div className="p-4 bg-white/60 border border-emerald-100 rounded-xl text-center text-xs text-slate-500">No documents delivered yet.</div>
                ) : (
                  <div className="divide-y divide-emerald-100 bg-white rounded-xl border border-emerald-100 px-4">
                    {adminSentDocuments.map((doc) => (
                      <div key={doc.id} className="py-3.5 flex items-center justify-between gap-2">
                        <div className="truncate">
                          <p className="text-sm font-bold text-slate-900 truncate">{doc.file_name}</p>
                          <span className="text-xs text-slate-400">• {new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                        <Button variant="accent" size="sm" onClick={() => handleDownloadFile(doc.file_url)} className="text-xs h-9 px-3 gap-1.5 shrink-0">
                          <Download className="w-4 h-4" /> Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submissions & uploader */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FileUpload userId={userId} onUploadComplete={fetchPortalData} />

              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><FileCheck className="w-5 h-5 text-slate-700" /> Your Submitted Documents ({customerUploadedDocuments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? <p className="text-sm text-slate-400">Loading...</p> : customerUploadedDocuments.length === 0 ? (
                    <p className="text-sm text-slate-400">No documents uploaded yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {customerUploadedDocuments.map((doc) => (
                        <li key={doc.id} className="py-3 flex items-center justify-between gap-2">
                          <div className="truncate">
                            <p className="text-sm font-medium text-slate-800 truncate">{doc.file_name}</p>
                            <p className="text-xs text-slate-400">{new Date(doc.created_at).toLocaleDateString()}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadFile(doc.file_url)} className="text-xs h-8 px-2.5 shrink-0">
                            <Download className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        )}

        {/* ================= TAB 3: INVOICES ================= */}
        {activeTab === 'invoices' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-slate-700" /> Invoices &amp; Statements
                </CardTitle>
                <CardDescription className="text-xs">Review itemized billing requests from your tax advisor.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-slate-400">Loading invoices...</p>
                ) : invoices.length === 0 ? (
                  <p className="text-sm text-slate-400">No invoices generated for your account.</p>
                ) : (
                  <div className="space-y-4">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">
                              {inv.billing_entity || 'Tax Services'}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm mt-1">{inv.invoice_no || 'Invoice'}</h4>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Due Date</p>
                            <p className="text-xs font-semibold text-slate-700">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'Upon Receipt'}</p>
                          </div>
                        </div>

                        {inv.items && Array.isArray(inv.items) && inv.items.length > 0 && (
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                            {inv.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-slate-600">
                                <span>{it.particulars || 'Service Item'}</span>
                                <span className="font-medium text-slate-800">${(parseFloat(it.amount) - parseFloat(it.discount || 0)).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {inv.remarks && (
                          <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                            &quot;{inv.remarks}&quot;
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <p className="text-xs text-slate-400">Total Payable</p>
                            <p className="text-xl font-bold text-slate-900">${Number(inv.amount).toFixed(2)}</p>
                          </div>

                          {inv.status === 'paid' ? (
                            <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" /> Paid
                            </span>
                          ) : (
                            <a href={inv.stripe_url} target="_blank" rel="noreferrer">
                              <Button variant="accent" size="sm" className="gap-1 px-4">
                                Pay Now <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </main>

      {/* Mobile App Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white border-t border-slate-800 z-40 flex items-center justify-around h-16 px-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${activeTab === 'overview' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          <Clock className="w-5 h-5" /> Status
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${activeTab === 'documents' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          <FolderOpen className="w-5 h-5" /> Docs
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${activeTab === 'invoices' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          <Receipt className="w-5 h-5" /> Invoices
        </button>
      </nav>

    </div>
  );
}