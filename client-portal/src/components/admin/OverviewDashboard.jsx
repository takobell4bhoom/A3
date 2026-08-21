import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/dateUtils';
import { 
  Users, Receipt, Clock, CheckCircle, Search, ArrowRight, 
  UserPlus, Building2, ShieldAlert 
} from 'lucide-react';

export default function OverviewDashboard({
  customers = [],
  documents = [],
  invoices = [],
  onSelectClient,
  onOpenOnboardModal,
  firmName = 'Tax Shield Advisor',
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate High-Level Executive Financial & Operational KPIs
  const kpis = useMemo(() => {
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

    const activeClientsCount = customers.filter(c => !c.is_disabled).length;

    return {
      activeClientsCount,
      totalClients: customers.length,
      totalInvoiced,
      totalPaid,
      totalUnpaid,
      totalDocuments: documents.length,
    };
  }, [customers, invoices, documents]);

  // Fast customer docs & invoices count lookup
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

  // Filtered clients for quick jump
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return customers.slice(0, 8);
    const q = searchQuery.toLowerCase().trim();
    return customers.filter(
      c => (c.email && c.email.toLowerCase().includes(q)) || (c.full_name && c.full_name.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4" /> Enterprise Advisory Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">{firmName} Workspace</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Client relationship management, real-time filing status broadcasting, and itemized billing ledger in Indian Rupee (₹).
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="accent"
            size="sm"
            onClick={onOpenOnboardModal}
            className="h-10 px-5 font-semibold text-xs gap-1.5 shadow-lg shadow-emerald-950/40"
          >
            <UserPlus className="w-4 h-4" /> Onboard New Client
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Active Clients */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Client Accounts</span>
              <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{kpis.activeClientsCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">{kpis.totalClients} total accounts registered</p>
          </CardContent>
        </Card>

        {/* Total Invoiced */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced (₹)</span>
              <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{formatCurrency(kpis.totalInvoiced)}</p>
            <p className="text-[11px] text-slate-400 mt-1">{invoices.length} invoices generated</p>
          </CardContent>
        </Card>

        {/* Collected Revenue */}
        <Card className="border-emerald-200 shadow-sm bg-emerald-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Collected Revenue (₹)</span>
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-900 mt-2 font-mono">{formatCurrency(kpis.totalPaid)}</p>
            <p className="text-[11px] text-emerald-700/80 mt-1">Settled payments</p>
          </CardContent>
        </Card>

        {/* Outstanding Receivables */}
        <Card className="border-amber-200 shadow-sm bg-amber-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Outstanding Due (₹)</span>
              <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-900 mt-2 font-mono">{formatCurrency(kpis.totalUnpaid)}</p>
            <p className="text-[11px] text-amber-700/80 mt-1">Pending collection</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Client Directory Launcher */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" /> Client Workspaces Launcher
            </CardTitle>
            <CardDescription className="text-xs">
              Select any client to manage their documents, update live filing status, and view invoices.
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search client to open workspace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-xs pl-8 pr-3 bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredClients.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <p className="text-xs">No client accounts match &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-5">Client Account</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Documents</th>
                  <th className="p-3.5">Outstanding Due</th>
                  <th className="p-3.5">Joined</th>
                  <th className="p-3.5 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((client) => {
                  const stats = clientStatsMap.get(client.id) || { docCount: 0, unpaidAmount: 0 };

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                            {(client.full_name || client.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 truncate max-w-[200px]">
                              {client.full_name || client.email}
                            </p>
                            {client.full_name && (
                              <p className="text-[10px] text-slate-400 font-mono">{client.email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        {client.is_disabled ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
                            <ShieldAlert className="w-3 h-3" /> Disabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-700 font-medium">
                        {stats.docCount} files
                      </td>

                      <td className="p-3.5 font-mono font-bold">
                        <span className={stats.unpaidAmount > 0 ? 'text-amber-700' : 'text-slate-400'}>
                          {formatCurrency(stats.unpaidAmount)}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {formatDate(client.created_at)}
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => onSelectClient(client)}
                          className="h-8 px-3 text-xs gap-1 font-semibold"
                        >
                          Open Workspace <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
