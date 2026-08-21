import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationModal } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/dateUtils';
import InvoiceBuilder from '../InvoiceBuilder/InvoiceBuilder';
import InvoicePreviewModal from '../InvoiceBuilder/InvoicePreviewModal';
import { 
  Receipt, Plus, CheckCircle, Clock, Copy, Printer, Trash2, ArrowLeft 
} from 'lucide-react';

export default function ClientInvoicesTab({
  client,
  invoices = [],
  onCreateInvoice,
  onToggleInvoiceStatus,
  onDeleteInvoice,
  savingInvoice = false,
  firmName = 'Tax Shield Advisor',
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  // Aggregate metrics for this client
  const metrics = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    for (const inv of invoices) {
      const amt = inv.total_cents ? inv.total_cents / 100 : Number(inv.amount || 0);
      totalInvoiced += amt;
      if (inv.status === 'paid') {
        totalPaid += amt;
      } else {
        totalUnpaid += amt;
      }
    }

    return {
      totalInvoiced,
      totalPaid,
      totalUnpaid,
      count: invoices.length,
    };
  }, [invoices]);

  const handleCopyLink = (url) => {
    if (!url) {
      toast.info('No Payment Link', 'This invoice does not have a payment link attached.');
      return;
    }
    navigator.clipboard.writeText(url);
    toast.success('Link Copied', 'Payment link copied to clipboard!');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDeleteInvoice(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // If in create mode, render InvoiceBuilder pre-selected for this client
  if (isCreating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(false)}
            className="text-xs h-8 gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
          </Button>
          <span className="text-xs font-semibold text-slate-500">
            Issuing Invoice to: <strong className="text-slate-800">{client.full_name || client.email}</strong>
          </span>
        </div>

        <InvoiceBuilder
          customers={[client]}
          selectedCustomer={client}
          onSelectCustomer={() => {}}
          onCreateInvoice={async (payload) => {
            const success = await onCreateInvoice(payload);
            if (success) {
              setIsCreating(false);
            }
            return success;
          }}
          onBackToList={() => setIsCreating(false)}
          savingInvoice={savingInvoice}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Financial Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</span>
            <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{formatCurrency(metrics.totalInvoiced)}</p>
            <p className="text-[11px] text-slate-400 mt-1">{metrics.count} invoices issued</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 shadow-sm bg-emerald-50/30">
          <CardContent className="p-5">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Settled / Paid</span>
            <p className="text-2xl font-bold text-emerald-900 mt-2 font-mono">{formatCurrency(metrics.totalPaid)}</p>
            <p className="text-[11px] text-emerald-700/80 mt-1">Paid receipts</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 shadow-sm bg-amber-50/30">
          <CardContent className="p-5">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Outstanding Balance</span>
            <p className="text-2xl font-bold text-amber-900 mt-2 font-mono">{formatCurrency(metrics.totalUnpaid)}</p>
            <p className="text-[11px] text-amber-700/80 mt-1">Due from client</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-slate-900 text-white flex flex-col justify-between">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Billing Action</span>
              <p className="text-sm font-bold text-white mt-1">Issue New Invoice</p>
            </div>
            <Button
              variant="accent"
              size="sm"
              onClick={() => setIsCreating(true)}
              className="mt-3 w-full gap-1.5 text-xs font-semibold"
            >
              <Plus className="w-4 h-4" /> Issue Invoice
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-sm text-slate-900">
              Billing Ledger for {client.full_name || client.email} ({invoices.length})
            </h3>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(true)}
            className="text-xs gap-1.5 bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
          >
            <Plus className="w-3.5 h-3.5" /> New Invoice
          </Button>
        </div>

        {invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No invoices issued to this client yet</p>
            <p className="text-xs text-slate-400">Generate an itemized tax advisory invoice in Rupee (₹).</p>
            <Button
              variant="accent"
              size="sm"
              onClick={() => setIsCreating(true)}
              className="mt-3 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Issue First Invoice
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-5">Invoice #</th>
                  <th className="p-3.5">Issue / Due Date</th>
                  <th className="p-3.5">Billing Entity</th>
                  <th className="p-3.5 text-right">Total (₹)</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const total = inv.total_cents ? inv.total_cents / 100 : Number(inv.amount || 0);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">
                        {inv.invoice_no || 'INV'}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        <p className="font-medium text-slate-700">{formatDate(inv.issue_date)}</p>
                        <p className="text-[10px] text-slate-400">Due: {inv.due_date ? formatDate(inv.due_date) : 'On Receipt'}</p>
                      </td>
                      <td className="p-3.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {inv.billing_entity || 'Standard Tax'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(total)}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleInvoiceStatus(inv.id, inv.status === 'paid' ? 'unpaid' : 'paid')}
                          title="Click to toggle Paid/Unpaid"
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                            inv.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {inv.status === 'paid' ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Paid
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" /> Unpaid
                            </>
                          )}
                        </button>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewInvoice(inv)}
                            className="h-7 px-2 text-xs"
                            title="View / Print Tax Invoice"
                          >
                            <Printer className="w-3 h-3 mr-1" /> View
                          </Button>
                          {inv.stripe_url && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyLink(inv.stripe_url)}
                              className="h-7 px-2 text-xs text-slate-700"
                              title="Copy Payment Link"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteTarget(inv)}
                            className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          isOpen={Boolean(previewInvoice)}
          onClose={() => setPreviewInvoice(null)}
          invoice={previewInvoice}
          client={client}
          firmName={firmName}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Invoice"
        description={`Are you sure you want to delete invoice "${deleteTarget?.invoice_no}"?`}
        confirmText="Delete Invoice"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
