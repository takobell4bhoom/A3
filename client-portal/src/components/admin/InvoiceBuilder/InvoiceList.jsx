import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationModal } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/dateUtils';
import InvoicePreviewModal from './InvoicePreviewModal';
import { 
  Receipt, Search, X, CheckCircle, Clock, Copy, Printer, 
  Trash2, Plus, ChevronLeft, ChevronRight 
} from 'lucide-react';

export default function InvoiceList({
  invoices = [],
  customers = [],
  onToggleInvoiceStatus,
  onDeleteInvoice,
  onSwitchToCreate,
  organization,
  firmName = 'Tax Shield Advisor',
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unpaid' | 'paid'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  // Create a fast customer lookup map
  const customerMap = useMemo(() => {
    const map = new Map();
    for (const c of customers) {
      map.set(c.id, c);
    }
    return map;
  }, [customers]);

  // Aggregate Revenue Metrics
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

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const client = customerMap.get(inv.user_id);
      const clientEmail = (client?.email || inv.client_email || '').toLowerCase();
      const clientName = (client?.full_name || '').toLowerCase();
      const invNo = (inv.invoice_no || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || invNo.includes(q) || clientEmail.includes(q) || clientName.includes(q);
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, customerMap, searchQuery, statusFilter]);

  // Paginated Slice for high-performance rendering (Prevents DOM overload at 1000s of invoices)
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  
  const paginatedInvoices = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, effectivePage, pageSize]);

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

  return (
    <div className="space-y-6">
      {/* Top Revenue Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</span>
              <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 font-mono">
              {formatCurrency(metrics.totalInvoiced)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{metrics.count} total invoices</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 shadow-sm bg-emerald-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Collected / Paid</span>
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-900 mt-2 font-mono">
              {formatCurrency(metrics.totalPaid)}
            </p>
            <p className="text-[11px] text-emerald-700/80 mt-1">Settled payments</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 shadow-sm bg-amber-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Pending / Due</span>
              <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-amber-900 mt-2 font-mono">
              {formatCurrency(metrics.totalUnpaid)}
            </p>
            <p className="text-[11px] text-amber-700/80 mt-1">Outstanding balance</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-slate-900 text-white flex flex-col justify-between">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Quick Action</span>
              <p className="text-sm font-bold text-white mt-1">Issue New Invoice</p>
            </div>
            <Button
              variant="accent"
              size="sm"
              onClick={onSwitchToCreate}
              className="mt-3 w-full gap-1.5 text-xs font-semibold"
            >
              <Plus className="w-4 h-4" /> Create Invoice
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Directory Card */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 mr-2">Filter Status:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({invoices.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('unpaid')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === 'unpaid'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3 h-3" /> Unpaid
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('paid')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === 'paid'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle className="w-3 h-3" /> Paid
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search invoice no. or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-xs pl-8 pr-8 bg-slate-50 border-slate-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto">
          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Receipt className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No invoices found</p>
              <p className="text-xs text-slate-400">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try resetting your search filters.'
                  : 'Get started by creating your first client invoice.'}
              </p>
              {!(searchQuery || statusFilter !== 'all') && (
                <Button variant="accent" size="sm" onClick={onSwitchToCreate} className="mt-3 text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create First Invoice
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-5">Invoice #</th>
                  <th className="p-3.5">Client</th>
                  <th className="p-3.5">Issue / Due Date</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5 text-right">Amount (₹)</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedInvoices.map((inv) => {
                  const client = customerMap.get(inv.user_id);
                  const total = inv.total_cents ? inv.total_cents / 100 : Number(inv.amount || 0);
                  const clientEmail = client?.email || inv.client_email || 'Client';
                  const clientName = client?.full_name || '';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">
                        {inv.invoice_no || 'INV'}
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-800 truncate max-w-[180px]">
                          {clientName || clientEmail}
                        </p>
                        {clientName && (
                          <p className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">{clientEmail}</p>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        <p className="font-medium text-slate-700">{formatDate(inv.issue_date)}</p>
                        <p className="text-[10px] text-slate-400">Due: {inv.due_date ? formatDate(inv.due_date) : 'On Receipt'}</p>
                      </td>
                      <td className="p-3.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {inv.billing_entity || 'Standard'}
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
                          {/* Print / View Preview */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewInvoice({ invoice: inv, client })}
                            className="h-7 px-2 text-xs"
                            title="View / Print Tax Invoice"
                          >
                            <Printer className="w-3 h-3 mr-1" /> View
                          </Button>

                          {/* Copy Payment Link */}
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

                          {/* Delete Invoice */}
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
          )}
        </div>

        {/* Pagination Toolbar */}
        {filteredInvoices.length > 0 && (
          <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong className="text-slate-900 font-mono">{(effectivePage - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-slate-900 font-mono">{Math.min(effectivePage * pageSize, filteredInvoices.length)}</strong> of{' '}
                <strong className="text-slate-900 font-mono">{filteredInvoices.length}</strong> invoices
              </span>

              <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                <span className="text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 rounded border border-slate-200 bg-white px-1.5 text-xs text-slate-900 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px] font-mono font-medium">
                Page {effectivePage} of {totalPages}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={effectivePage <= 1}
                  className="h-7 w-7 p-0"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={effectivePage >= totalPages}
                  className="h-7 w-7 p-0"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Invoice Preview / Print Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          isOpen={Boolean(previewInvoice)}
          onClose={() => setPreviewInvoice(null)}
          invoice={previewInvoice.invoice}
          client={previewInvoice.client}
          organization={organization}
          firmName={firmName}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Invoice"
        description={`Are you sure you want to permanently delete invoice "${deleteTarget?.invoice_no}"? This action cannot be undone.`}
        confirmText="Delete Invoice"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
