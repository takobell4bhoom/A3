import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ConfirmationModal } from '@/components/ui/dialog';
import { 
  Users, UserPlus, ShieldAlert, CheckCircle, Search, X, ArrowRight, Trash2, 
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/currency';

export default function ClientDirectory({
  customers = [],
  documents = [],
  invoices = [],
  onSelectCustomer,
  onOpenOnboardPage,
  onDeleteCustomer,
  deletingClient = false,
  loading = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'disabled'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deleteTargetClient, setDeleteTargetClient] = useState(null);

  // Fast stats lookup per client
  const clientStatsMap = useMemo(() => {
    const map = new Map();
    for (const c of customers) {
      map.set(c.id, { docCount: 0, unpaidAmount: 0 });
    }
    for (const d of documents) {
      if (map.has(d.user_id)) {
        map.get(d.user_id).docCount++;
      }
    }
    for (const inv of invoices) {
      if (map.has(inv.user_id) && inv.status !== 'paid') {
        const amt = inv.total_cents ? inv.total_cents / 100 : Number(inv.amount || 0);
        map.get(inv.user_id).unpaidAmount += amt;
      }
    }
    return map;
  }, [customers, documents, invoices]);

  // Filtered clients list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (c.email && c.email.toLowerCase().includes(q)) || (c.full_name && c.full_name.toLowerCase().includes(q));
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && !c.is_disabled) ||
        (statusFilter === 'disabled' && c.is_disabled);

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, statusFilter]);

  // Paginated Slice for high-performance rendering (Prevents DOM overload at 1000s of clients)
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  
  const paginatedCustomers = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, effectivePage, pageSize]);

  const activeCount = customers.filter(c => !c.is_disabled).length;
  const disabledCount = customers.filter(c => c.is_disabled).length;

  return (
    <div className="space-y-6">
      
      {/* Top Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" /> Client Accounts Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage client profiles, open their 360° workspace, and track portal access.
          </p>
        </div>

        <Button
          variant="accent"
          size="sm"
          onClick={onOpenOnboardPage}
          className="h-9 px-4 font-semibold text-xs gap-1.5 self-start sm:self-auto shadow-sm"
        >
          <UserPlus className="w-4 h-4" /> Onboard New Client
        </Button>
      </div>

      {/* Directory Table Card */}
      <Card className="border-slate-200 shadow-sm bg-white">
        
        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle className="w-3 h-3" /> Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('disabled')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === 'disabled'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-red-50 text-red-800 hover:bg-red-100'
              }`}
            >
              <ShieldAlert className="w-3 h-3" /> Suspended ({disabledCount})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by client name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-xs pl-8 pr-8 bg-slate-50 border-slate-200 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Clients Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-8 text-center text-xs text-slate-400">Loading client directory...</p>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No client accounts found</p>
              <p className="text-xs text-slate-400">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search criteria.'
                  : 'Get started by onboarding your first client.'}
              </p>
              {!(searchQuery || statusFilter !== 'all') && (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={onOpenOnboardPage}
                  className="mt-3 text-xs"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Onboard First Client
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-5">Client Name &amp; Account</th>
                  <th className="p-3.5">Portal Status</th>
                  <th className="p-3.5">Documents</th>
                  <th className="p-3.5">Outstanding Due (₹)</th>
                  <th className="p-3.5">Joined</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.map((customer) => {
                  const stats = clientStatsMap.get(customer.id) || { docCount: 0, unpaidAmount: 0 };
                  const initial = (customer.full_name || customer.email)[0].toUpperCase();

                  return (
                    <tr 
                      key={customer.id} 
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => onSelectCustomer(customer)}
                    >
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                            {initial}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs group-hover:text-emerald-700 transition-colors truncate max-w-[220px]">
                              {customer.full_name || customer.email}
                            </p>
                            {customer.full_name && (
                              <p className="text-[10px] text-slate-400 font-mono">{customer.email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        {customer.is_disabled ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
                            <ShieldAlert className="w-3 h-3" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-700 font-semibold">
                        {stats.docCount} files
                      </td>

                      <td className="p-3.5 font-mono font-bold text-xs">
                        <span className={stats.unpaidAmount > 0 ? 'text-amber-700' : 'text-slate-400'}>
                          {formatCurrency(stats.unpaidAmount)}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {formatDate(customer.created_at)}
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="accent"
                            size="sm"
                            onClick={() => onSelectCustomer(customer)}
                            className="h-8 px-3 text-xs gap-1 font-semibold"
                          >
                            Workspace <ArrowRight className="w-3.5 h-3.5" />
                          </Button>

                          {onDeleteCustomer && (
                            <button
                              type="button"
                              onClick={() => setDeleteTargetClient(customer)}
                              title="Delete Client Account"
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
        {filteredCustomers.length > 0 && (
          <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong className="text-slate-900 font-mono">{(effectivePage - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-slate-900 font-mono">{Math.min(effectivePage * pageSize, filteredCustomers.length)}</strong> of{' '}
                <strong className="text-slate-900 font-mono">{filteredCustomers.length}</strong> clients
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

      {/* Delete Client Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteTargetClient}
        onClose={() => setDeleteTargetClient(null)}
        onConfirm={async () => {
          if (!deleteTargetClient) return;
          const targetId = deleteTargetClient.id;
          setDeleteTargetClient(null);
          await onDeleteCustomer(targetId);
        }}
        title="Permanently Delete Client"
        description={
          deleteTargetClient
            ? `Are you sure you want to delete "${deleteTargetClient.full_name || deleteTargetClient.email}"? All documents, status milestones, and billing records will be permanently erased.`
            : ''
        }
        confirmText="Delete Client Permanently"
        variant="danger"
        loading={deletingClient}
      />

    </div>
  );
}
