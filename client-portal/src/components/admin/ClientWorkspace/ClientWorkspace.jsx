import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, FolderOpen, Clock, Receipt, User, ShieldAlert, ShieldCheck, Mail, Phone 
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

import ClientDocumentsTab from './ClientDocumentsTab';
import ClientWorkTrackerTab from './ClientWorkTrackerTab';
import ClientInvoicesTab from './ClientInvoicesTab';
import ClientProfileTab from './ClientProfileTab';

export default function ClientWorkspace({
  client,
  onBackToDirectory,
  documents = [],
  invoices = [],
  statusTracker = null,
  onUploadDocument,
  onDownloadFile,
  onDeleteFile,
  onUpdateStatus,
  onCreateInvoice,
  onToggleInvoiceStatus,
  onDeleteInvoice,
  onToggleClientAccess,
  onDeleteClient,
  onUpdateClient,
  togglingAccess = false,
  deletingClient = false,
  savingStatus = false,
  savingInvoice = false,
  organization,
  firmName = 'Tax Shield Advisor',
}) {
  const [workspaceTab, setWorkspaceTab] = useState('documents'); // 'documents' | 'status' | 'invoices' | 'profile'
  const [statusStep, setStatusStep] = useState(() => statusTracker?.current_step || 'Step 1 of 4: Initial Document Gathering');
  const [statusNotes, setStatusNotes] = useState(() => statusTracker?.notes || '');

  // Calculate client-specific outstanding balance
  const outstandingBalance = useMemo(() => {
    let unpaid = 0;
    for (const inv of invoices) {
      if (inv.status !== 'paid') {
        unpaid += inv.total_cents ? inv.total_cents / 100 : Number(inv.amount || 0);
      }
    }
    return unpaid;
  }, [invoices]);

  const initials = (client.full_name || client.email || 'CL')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Breadcrumb & Back Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <button
            type="button"
            onClick={onBackToDirectory}
            className="flex items-center gap-1 text-slate-700 hover:text-emerald-700 font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Client Directory
          </button>
          <span>/</span>
          <span className="text-slate-900 font-bold truncate max-w-xs">{client.full_name || client.email}</span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBackToDirectory}
          className="text-xs h-8 gap-1.5 self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Directory
        </Button>
      </div>

      {/* Client 360° Hero Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Client Identity Details */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-lg font-bold shadow-md shrink-0 ring-4 ring-slate-100">
              {initials}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {client.full_name || client.email}
                </h1>
                {client.is_disabled ? (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Access Disabled
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Active Client
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1.5">
                <span className="flex items-center gap-1 font-mono">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {client.email}
                </span>
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {client.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Client Quick Stats Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Documents</span>
              <span className="text-sm font-bold text-slate-900 font-mono">{documents.length} Files</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Due</span>
              <span className={`text-sm font-bold font-mono ${outstandingBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatCurrency(outstandingBalance)}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 max-w-[200px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Current Status</span>
              <span className="text-xs font-bold text-slate-800 truncate block">
                {statusTracker?.current_step || 'Initial Review'}
              </span>
            </div>
          </div>

        </div>

        {/* Client Workspace Navigation Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-100 mt-6 pt-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setWorkspaceTab('documents')}
            className={`text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 ${
              workspaceTab === 'documents'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FolderOpen className="w-4 h-4" /> Documents ({documents.length})
          </button>

          <button
            type="button"
            onClick={() => setWorkspaceTab('status')}
            className={`text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 ${
              workspaceTab === 'status'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" /> Work Tracker
          </button>

          <button
            type="button"
            onClick={() => setWorkspaceTab('invoices')}
            className={`text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 ${
              workspaceTab === 'invoices'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4" /> Billing &amp; Invoices ({invoices.length})
          </button>

          <button
            type="button"
            onClick={() => setWorkspaceTab('profile')}
            className={`text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 ${
              workspaceTab === 'profile'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" /> Account &amp; Access
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      {workspaceTab === 'documents' && (
        <ClientDocumentsTab
          client={client}
          documents={documents}
          onUploadDocument={onUploadDocument}
          onDownloadFile={onDownloadFile}
          onDeleteFile={onDeleteFile}
        />
      )}

      {workspaceTab === 'status' && (
        <ClientWorkTrackerTab
          client={client}
          statusStep={statusStep}
          setStatusStep={setStatusStep}
          statusNotes={statusNotes}
          setStatusNotes={setStatusNotes}
          onUpdateStatus={onUpdateStatus}
          savingStatus={savingStatus}
        />
      )}

      {workspaceTab === 'invoices' && (
        <ClientInvoicesTab
          client={client}
          invoices={invoices}
          organization={organization}
          onCreateInvoice={onCreateInvoice}
          onToggleInvoiceStatus={onToggleInvoiceStatus}
          onDeleteInvoice={onDeleteInvoice}
          savingInvoice={savingInvoice}
          firmName={firmName}
        />
      )}

      {workspaceTab === 'profile' && (
        <ClientProfileTab
          client={client}
          onUpdateClient={onUpdateClient}
          onToggleAccess={onToggleClientAccess}
          onDeleteClient={onDeleteClient}
          togglingAccess={togglingAccess}
          deletingClient={deletingClient}
          firmName={firmName}
        />
      )}
    </div>
  );
}
