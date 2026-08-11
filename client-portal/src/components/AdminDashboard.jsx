import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building2, LogOut, Download, RefreshCw, Users, FileText, CreditCard, 
  Clock, UserPlus, Send, UploadCloud, Loader2, CheckCircle2, UserX, 
  UserCheck, ShieldAlert, Trash2, Plus, Receipt, LayoutDashboard, FolderOpen
} from 'lucide-react';

export default function AdminDashboard({ session }) {
  const [activeTab, setActiveTab] = useState('clients'); // 'clients' | 'documents' | 'status' | 'invoices'
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [statusStep, setStatusStep] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  
  // Onboard Client State
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  // Admin File Send State
  const [adminFile, setAdminFile] = useState(null);
  const [uploadingAdminFile, setUploadingAdminFile] = useState(false);
  const [adminUploadSuccess, setAdminUploadSuccess] = useState(false);

  // Invoice Module State
  const [billingEntity, setBillingEntity] = useState('Non GST Billing');
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerm, setPaymentTerm] = useState('NET 30');
  const [dueDate, setDueDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [stripeUrl, setStripeUrl] = useState('');
  const [roundOff, setRoundOff] = useState(0);

  // Invoice Line Items
  const [items, setItems] = useState([
    { id: 1, particulars: 'Tax Return Preparation & Filing', type: 'Task', amount: 350, discount: 0 }
  ]);

  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [togglingClient, setTogglingClient] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerDetails(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  // Auto-calculate Due Date based on Payment Term & Issue Date
  useEffect(() => {
    if (!issueDate) return;
    const dateObj = new Date(issueDate);
    let daysToAdd = 30;
    if (paymentTerm === 'NET 15') daysToAdd = 15;
    if (paymentTerm === 'NET 60') daysToAdd = 60;
    if (paymentTerm === 'Due on Receipt') daysToAdd = 0;

    dateObj.setDate(dateObj.getDate() + daysToAdd);
    setDueDate(dateObj.toISOString().split('T')[0]);
  }, [issueDate, paymentTerm]);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCustomers(data);
      if (data.length > 0 && !selectedCustomer) {
        setSelectedCustomer(data[0]);
      }
    }
    setLoading(false);
  };

  const fetchCustomerDetails = async (customerId) => {
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false });

    setDocuments(docs || []);

    const { data: status } = await supabase
      .from('status_tracker')
      .select('*')
      .eq('user_id', customerId)
      .maybeSingle();

    if (status) {
      setStatusStep(status.current_step);
      setStatusNotes(status.notes || '');
    } else {
      setStatusStep('');
      setStatusNotes('');
    }
  };

  // Invoice Calculations
  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), particulars: '', type: 'Task', amount: 0, discount: 0 }]);
  };

  const handleRemoveItem = (id) => {
    if (items.length === 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const calculateSubtotal = () => items.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const calculateDiscountTotal = () => items.reduce((acc, curr) => acc + (parseFloat(curr.discount) || 0), 0);
  const calculateTotalAmount = () => calculateSubtotal() - calculateDiscountTotal() + (parseFloat(roundOff) || 0);

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setSavingInvoice(true);

    try {
      const { error } = await supabase
        .from('invoices')
        .insert([{
          user_id: selectedCustomer.id,
          invoice_no: invoiceNo,
          billing_entity: billingEntity,
          payment_term: paymentTerm,
          issue_date: issueDate,
          due_date: dueDate,
          remarks: remarks,
          subtotal: calculateSubtotal(),
          discount_total: calculateDiscountTotal(),
          round_off: parseFloat(roundOff) || 0,
          amount: calculateTotalAmount(),
          stripe_url: stripeUrl,
          items: items,
          status: 'unpaid'
        }]);

      if (error) throw error;

      alert(`Invoice ${invoiceNo} issued successfully to ${selectedCustomer.email}!`);
      setInvoiceNo(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
      setRemarks('');
      setStripeUrl('');
      setItems([{ id: Date.now(), particulars: 'Tax Advisory Services', type: 'Task', amount: 0, discount: 0 }]);
    } catch (err) {
      alert('Error creating invoice: ' + err.message);
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleToggleClientAccess = async () => {
    if (!selectedCustomer) return;
    const newStatus = !selectedCustomer.is_disabled;
    if (!window.confirm(newStatus ? `Disable access for ${selectedCustomer.email}?` : `Re-enable access for ${selectedCustomer.email}?`)) return;

    setTogglingClient(true);
    try {
      const { error } = await supabase.from('users').update({ is_disabled: newStatus }).eq('id', selectedCustomer.id);
      if (error) throw error;
      setSelectedCustomer({ ...selectedCustomer, is_disabled: newStatus });
      await fetchCustomers();
    } catch (err) {
      alert('Error updating client status: ' + err.message);
    } finally {
      setTogglingClient(false);
    }
  };

  const handleDownloadFile = async (filePath) => {
    try {
      let cleanPath = filePath.includes('customer-documents/') ? filePath.split('customer-documents/').pop() : filePath;
      const { data, error } = await supabase.storage.from('customer-documents').createSignedUrl(cleanPath, 60);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      alert('Error downloading file: ' + err.message);
    }
  };

  const handleDeleteFile = async (docId, filePath) => {
    if (!window.confirm('Delete this document permanently?')) return;
    try {
      let cleanPath = filePath.includes('customer-documents/') ? filePath.split('customer-documents/').pop() : filePath;
      await supabase.storage.from('customer-documents').remove([cleanPath]);
      const { error } = await supabase.from('documents').delete().eq('id', docId);
      if (error) throw error;
      fetchCustomerDetails(selectedCustomer.id);
    } catch (err) {
      alert('Error deleting document: ' + err.message);
    }
  };

  const handleAdminFileUpload = async (e) => {
    e.preventDefault();
    if (!adminFile || !selectedCustomer) return;
    setUploadingAdminFile(true);
    setAdminUploadSuccess(false);

    try {
      const fileExt = adminFile.name.split('.').pop();
      const fileName = `admin_${Math.random()}.${fileExt}`;
      const filePath = `${selectedCustomer.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('customer-documents').upload(filePath, adminFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: adminFile.type || 'application/pdf',
      });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('documents').insert([{
        user_id: selectedCustomer.id,
        file_name: adminFile.name,
        file_url: filePath,
        upload_status: 'completed',
        uploaded_by_role: 'admin'
      }]);
      if (dbError) throw dbError;

      setAdminUploadSuccess(true);
      setAdminFile(null);
      fetchCustomerDetails(selectedCustomer.id);
    } catch (err) {
      alert('Error sending file: ' + err.message);
    } finally {
      setUploadingAdminFile(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setCreatingClient(true);
    try {
      const tempSupabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
      const { error } = await tempSupabase.auth.signUp({ email: newClientEmail, password: newClientPassword });
      if (error) throw error;
      alert(`Client created for ${newClientEmail}`);
      setNewClientEmail('');
      setNewClientPassword('');
      await fetchCustomers();
    } catch (err) {
      alert('Error creating client: ' + err.message);
    } finally {
      setCreatingClient(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setSavingStatus(true);
    const { error } = await supabase.from('status_tracker').upsert({
      user_id: selectedCustomer.id,
      current_step: statusStep,
      notes: statusNotes,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    if (error) alert('Error: ' + error.message);
    else alert('Status updated in real-time!');
    setSavingStatus(false);
  };

  const handleSignOut = () => supabase.auth.signOut();

  const clientDocs = documents.filter(d => d.uploaded_by_role !== 'admin');
  const adminDocs = documents.filter(d => d.uploaded_by_role === 'admin');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 md:pb-8 flex flex-col">
      
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-none">Apex Tax & Advisory</h1>
              <span className="text-[11px] font-semibold text-emerald-400 tracking-wider uppercase">Enterprise Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">{session?.user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5 text-xs bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700">
              <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Desktop Navigation Tabs Bar */}
        <div className="hidden md:block bg-slate-950 border-t border-slate-800/80">
          <div className="max-w-7xl mx-auto px-6 flex items-center gap-2">
            <button
              onClick={() => setActiveTab('clients')}
              className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'clients' ? 'border-emerald-400 text-emerald-400 bg-white/5' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" /> Clients & Onboarding
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'documents' ? 'border-emerald-400 text-emerald-400 bg-white/5' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-4 h-4" /> Document Center ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'status' ? 'border-emerald-400 text-emerald-400 bg-white/5' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" /> Work Tracker
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'invoices' ? 'border-emerald-400 text-emerald-400 bg-white/5' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Receipt className="w-4 h-4" /> Invoice Builder
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">

        {/* Selected Workspace Header Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold shrink-0">
              {selectedCustomer ? selectedCustomer.email[0].toUpperCase() : '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Active Client Workspace
                </span>
                {selectedCustomer?.is_disabled && (
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Access Disabled
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5 truncate">{selectedCustomer?.email || 'No Client Selected'}</h2>
            </div>
          </div>

          {selectedCustomer && (
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                variant={selectedCustomer.is_disabled ? "accent" : "outline"} 
                size="sm" 
                onClick={handleToggleClientAccess} 
                disabled={togglingClient} 
                className={`text-xs h-8 ${!selectedCustomer.is_disabled ? "text-red-600 border-red-200 hover:bg-red-50" : ""}`}
              >
                {selectedCustomer.is_disabled ? <><UserCheck className="w-3.5 h-3.5 mr-1" /> Enable Access</> : <><UserX className="w-3.5 h-3.5 mr-1" /> Disable Access</>}
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetchCustomerDetails(selectedCustomer.id)} className="text-xs h-8">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
              </Button>
            </div>
          )}
        </div>

        {/* ================= CATEGORY TAB 1: CLIENTS & ONBOARDING ================= */}
        {activeTab === 'clients' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Onboard Form */}
            <Card className="border-slate-200 lg:col-span-1 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                  <UserPlus className="w-5 h-5 text-emerald-600" /> Onboard New Client
                </CardTitle>
                <CardDescription className="text-xs">Create client credentials to share with them.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCustomer} className="space-y-3">
                  <div>
                    <Label className="text-xs">Client Email</Label>
                    <Input type="email" placeholder="client@company.com" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} required className="h-9 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Temporary Password</Label>
                    <Input type="password" placeholder="••••••••" value={newClientPassword} onChange={(e) => setNewClientPassword(e.target.value)} required minLength={6} className="h-9 text-xs mt-1" />
                  </div>
                  <Button type="submit" variant="accent" size="sm" className="w-full text-xs font-semibold" disabled={creatingClient}>
                    {creatingClient ? "Registering..." : "Create Client Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Client Directory */}
            <Card className="border-slate-200 lg:col-span-2 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                  <Users className="w-5 h-5 text-emerald-600" /> Client Directory ({customers.length})
                </CardTitle>
                <CardDescription className="text-xs">Select a client workspace to manage documents and invoicing.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-xs text-slate-400">Loading directory...</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto pr-1">
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => { setSelectedCustomer(customer); setAdminUploadSuccess(false); }}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          selectedCustomer?.id === customer.id 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-xs truncate max-w-[180px]">{customer.email}</p>
                          {customer.is_disabled && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-100 text-red-700">DISABLED</span>}
                        </div>
                        <p className={`text-[10px] mt-1 ${selectedCustomer?.id === customer.id ? 'text-slate-300' : 'text-slate-400'}`}>
                          Joined: {new Date(customer.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        )}

        {/* ================= CATEGORY TAB 2: DOCUMENT CENTER ================= */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Send Document Card */}
            <Card className="border-slate-200 border-l-4 border-l-emerald-600 lg:col-span-1 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-600" /> Deliver Document
                </CardTitle>
                <CardDescription className="text-xs">Upload filed returns or audit reports directly to client portal.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdminFileUpload} className="space-y-4">
                  <div>
                    <Label className="text-xs">Select File</Label>
                    <Input type="file" onChange={(e) => { setAdminFile(e.target.files[0] || null); setAdminUploadSuccess(false); }} required className="mt-1 text-xs" />
                  </div>
                  <Button type="submit" variant="accent" size="sm" disabled={uploadingAdminFile || !adminFile} className="w-full text-xs">
                    {uploadingAdminFile ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Sending...</> : <><UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Deliver File</>}
                  </Button>
                  {adminUploadSuccess && (
                    <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded border border-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Document delivered!
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Document Directory */}
            <Card className="border-slate-200 lg:col-span-2 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-700" /> Document Directory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Received from client */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Received From Client ({clientDocs.length})</h4>
                  {clientDocs.length === 0 ? <p className="text-xs text-slate-400 italic">No files submitted by client yet.</p> : (
                    <div className="divide-y divide-slate-100 bg-slate-50/50 rounded-lg border border-slate-200 px-3">
                      {clientDocs.map((doc) => (
                        <div key={doc.id} className="py-2.5 flex items-center justify-between gap-2">
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-800 truncate">{doc.file_name}</p>
                            <p className="text-[10px] text-slate-400">{new Date(doc.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="outline" size="sm" onClick={() => handleDownloadFile(doc.file_url)} className="text-xs h-7 px-2"><Download className="w-3 h-3 mr-1" /> View</Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteFile(doc.id, doc.file_url)} className="text-xs h-7 px-2 text-red-600 border-red-200"><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sent to client */}
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Delivered to Client by Firm ({adminDocs.length})</h4>
                  {adminDocs.length === 0 ? <p className="text-xs text-slate-400 italic">No official documents delivered yet.</p> : (
                    <div className="divide-y divide-slate-100 bg-emerald-50/30 rounded-lg border border-emerald-100 px-3">
                      {adminDocs.map((doc) => (
                        <div key={doc.id} className="py-2.5 flex items-center justify-between gap-2">
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-800 truncate">{doc.file_name}</p>
                            <p className="text-[10px] text-emerald-600">Delivered {new Date(doc.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="outline" size="sm" onClick={() => handleDownloadFile(doc.file_url)} className="text-xs h-7 px-2"><Download className="w-3 h-3 mr-1" /> View</Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteFile(doc.id, doc.file_url)} className="text-xs h-7 px-2 text-red-600 border-red-200"><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>

          </div>
        )}

        {/* ================= CATEGORY TAB 3: WORK TRACKER ================= */}
        {activeTab === 'status' && (
          <Card className="border-slate-200 max-w-2xl mx-auto shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" /> Update Live Work Status
              </CardTitle>
              <CardDescription className="text-xs">Updates display in real-time on the client's dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold">Current Step / Milestone Title</Label>
                  <Input placeholder="e.g. Step 2 of 4: Tax Audit Review in Progress" value={statusStep} onChange={(e) => setStatusStep(e.target.value)} required className="mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Notes for Client (Optional)</Label>
                  <textarea 
                    rows={3} 
                    placeholder="e.g. Missing W-2 uploaded. Reviewing deduction forms." 
                    value={statusNotes} 
                    onChange={(e) => setStatusNotes(e.target.value)} 
                    className="w-full mt-1 p-2.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                  />
                </div>
                <Button type="submit" variant="accent" size="sm" disabled={savingStatus} className="w-full sm:w-auto px-6">
                  {savingStatus ? "Publishing..." : "Update Live Status"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ================= CATEGORY TAB 4: INVOICE BUILDER ================= */}
        {activeTab === 'invoices' && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
                <Receipt className="w-5 h-5 text-emerald-600" /> Invoices &gt; New Invoice
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Billing Entity <span className="text-red-500">*</span></Label>
                    <select 
                      value={billingEntity} 
                      onChange={(e) => setBillingEntity(e.target.value)}
                      className="w-full h-9 mt-1 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Non GST Billing">Non GST Billing</option>
                      <option value="GST Billing (18%)">GST Billing (18%)</option>
                      <option value="Corporate Tax Billing">Corporate Tax Billing</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Target Client <span className="text-red-500">*</span></Label>
                    <Input value={selectedCustomer?.email || ''} disabled className="h-9 text-xs bg-slate-50 mt-1 font-semibold text-slate-700" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Date <span className="text-red-500">*</span></Label>
                      <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="h-9 text-xs mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Invoice No. <span className="text-red-500">*</span></Label>
                      <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} required className="h-9 text-xs mt-1 font-mono bg-slate-50" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Payment Term <span className="text-red-500">*</span></Label>
                      <select 
                        value={paymentTerm} 
                        onChange={(e) => setPaymentTerm(e.target.value)}
                        className="w-full h-9 mt-1 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="NET 30">NET 30</option>
                        <option value="NET 15">NET 15</option>
                        <option value="NET 60">NET 60</option>
                        <option value="Due on Receipt">Due on Receipt</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Due Date <span className="text-red-500">*</span></Label>
                      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 text-xs mt-1 bg-slate-50" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-slate-900">Invoice Items</h4>
                  <div className="flex items-center gap-3 text-[11px] font-medium">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Task</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Expense</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Retainer</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[550px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-2.5">Particulars</th>
                        <th className="p-2.5 w-28">Type</th>
                        <th className="p-2.5 w-28">Amount ($)</th>
                        <th className="p-2.5 w-24">Discount ($)</th>
                        <th className="p-2.5 w-28 text-right">Total ($)</th>
                        <th className="p-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {items.map((item) => {
                        const itemTotal = (parseFloat(item.amount) || 0) - (parseFloat(item.discount) || 0);
                        return (
                          <tr key={item.id}>
                            <td className="p-2">
                              <Input placeholder="Particulars" value={item.particulars} onChange={(e) => handleItemChange(item.id, 'particulars', e.target.value)} className="h-8 text-xs" required />
                            </td>
                            <td className="p-2">
                              <select value={item.type} onChange={(e) => handleItemChange(item.id, 'type', e.target.value)} className="w-full h-8 rounded border border-slate-200 text-xs">
                                <option value="Task">Task</option>
                                <option value="Expense">Expense</option>
                                <option value="Retainer">Retainer</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <Input type="number" step="0.01" value={item.amount} onChange={(e) => handleItemChange(item.id, 'amount', e.target.value)} className="h-8 text-xs" />
                            </td>
                            <td className="p-2">
                              <Input type="number" step="0.01" value={item.discount} onChange={(e) => handleItemChange(item.id, 'discount', e.target.value)} className="h-8 text-xs" />
                            </td>
                            <td className="p-2 text-right font-bold text-slate-800">${itemTotal.toFixed(2)}</td>
                            <td className="p-2 text-center">
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)} className="h-7 w-7 p-0 text-slate-400 hover:text-red-600">✕</Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex justify-center">
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </Button>
                </div>
              </div>

              {/* Bottom calculations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 items-start">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Remarks / Terms Notes</Label>
                    <textarea 
                      rows={3} 
                      placeholder="Thank you for your business." 
                      value={remarks} 
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full mt-1 p-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Stripe Payment Link URL <span className="text-red-500">*</span></Label>
                    <Input type="url" placeholder="https://buy.stripe.com/..." value={stripeUrl} onChange={(e) => setStripeUrl(e.target.value)} required className="h-9 text-xs mt-1" />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-700">
                  <div className="flex justify-between items-center">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-900">${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Discount</span>
                    <span>-${calculateDiscountTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Round Off</span>
                    <input type="number" step="0.01" value={roundOff} onChange={(e) => setRoundOff(e.target.value)} className="w-20 h-7 text-right text-xs border border-slate-200 rounded px-1.5 bg-white" />
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-bold text-slate-900">
                    <span>Total Amount</span>
                    <span className="text-base text-emerald-700">${calculateTotalAmount().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button type="button" onClick={handleCreateInvoice} variant="accent" disabled={savingInvoice} className="w-full sm:w-auto px-8">
                  {savingInvoice ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</> : "Save & Send Invoice to Client"}
                </Button>
              </div>

            </CardContent>
          </Card>
        )}

      </main>

      {/* Mobile App Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white border-t border-slate-800 z-40 flex items-center justify-around h-16 px-2">
        <button
          onClick={() => setActiveTab('clients')}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${activeTab === 'clients' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          <Users className="w-5 h-5" /> Clients
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${activeTab === 'documents' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          <FolderOpen className="w-5 h-5" /> Docs
        </button>
        <button
          onClick={() => setActiveTab('status')}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${activeTab === 'status' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          <Clock className="w-5 h-5" /> Status
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex flex-col items-center justify-center w-full h-full text-[10px] gap-1 ${activeTab === 'invoices' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          <Receipt className="w-5 h-5" /> Invoice
        </button>
      </nav>

    </div>
  );
}