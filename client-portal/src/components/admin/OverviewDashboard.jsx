import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { 
  Users, Receipt, Clock, CheckCircle, Search, ArrowRight, 
  UserPlus, Building2, ShieldAlert, X, KeyRound 
} from 'lucide-react';

export default function OverviewDashboard({
  customers = [],
  documents = [],
  invoices = [],
  onSelectClient,
  onOpenOnboardModal,
  onNavigateToLicenses,
  isDistributor = false,
  maxLicenses = 25,
  soldLicensesCount = 0,
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
    const licenseUsagePercent = Math.min(100, Math.round((soldLicensesCount / maxLicenses) * 100));
    const remainingLicenses = Math.max(0, maxLicenses - soldLicensesCount);

    return {
      activeClientsCount,
      totalClients: customers.length,
      totalInvoiced,
      totalPaid,
      totalUnpaid,
      totalDocuments: documents.length,
      soldLicensesCount,
      licenseUsagePercent,
      remainingLicenses,
    };
  }, [customers, invoices, documents, maxLicenses, soldLicensesCount]);

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
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Enterprise Executive Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-7 sm:p-9 shadow-lg border border-slate-800/80 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4" /> {isDistributor ? 'Partner Distributor Control' : 'Corporate Financial Console'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5">{firmName} Workspace</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
            {isDistributor 
              ? 'Multi-tenant client advisory, automated filing milestone broadcasting, and company license distribution.' 
              : 'Client ledger directory, itemized GST tax invoice generation, and secure financial document vault.'}
          </p>
        </div>

        <div className="flex items-center gap-3.5 shrink-0 flex-wrap relative z-10">
          {isDistributor && onNavigateToLicenses && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToLicenses}
              className="h-11 px-5 font-extrabold text-xs gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 border-none shadow-md hover:shadow-lg transition-all"
            >
              <KeyRound className="w-4 h-4" /> Sell Licenses Hub
            </Button>
          )}
          <Button
            variant="accent"
            size="sm"
            onClick={onOpenOnboardModal}
            className="h-11 px-6 font-bold text-xs gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <UserPlus className="w-4 h-4" /> Onboard New Client
          </Button>
        </div>
      </div>

      {/* High-End Enterprise KPI Metric Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isDistributor ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-5`}>
        
        {/* Card 1: License Sales & Quota (Distributor Only) */}
        {isDistributor && (
          <Card 
            className={`border-sky-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-gradient-to-br from-white via-sky-50/20 to-sky-50/40 rounded-2xl transition-all duration-200 ${
              onNavigateToLicenses ? 'cursor-pointer hover:border-sky-400 hover:shadow-md' : ''
            }`}
            onClick={onNavigateToLicenses}
          >
            <CardContent className="p-6 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-900 uppercase tracking-wider">License Pool</span>
                <div className="p-2.5 bg-sky-100/80 rounded-xl text-sky-700 border border-sky-200/60">
                  <KeyRound className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 pt-1">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">{kpis.soldLicensesCount}</span>
                <span className="text-xs text-slate-500 font-mono font-medium">/ {maxLicenses} Sold</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      kpis.licenseUsagePercent >= 90 ? 'bg-rose-500' : kpis.licenseUsagePercent >= 70 ? 'bg-amber-500' : 'bg-sky-600'
                    }`}
                    style={{ width: `${kpis.licenseUsagePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {kpis.remainingLicenses} available
                  </p>
                  {onNavigateToLicenses && (
                    <span className="text-[11px] font-bold text-sky-700 hover:underline flex items-center gap-0.5">
                      Sell ↗
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card 2: Active Clients */}
        <Card className="border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-white rounded-2xl hover:border-slate-300 hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Clients</span>
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700 border border-slate-200/60">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">{kpis.activeClientsCount}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">{kpis.totalClients} total accounts in directory</p>
          </CardContent>
        </Card>

        {/* Card 3: Total Invoiced */}
        <Card className="border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-white rounded-2xl hover:border-slate-300 hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invoiced</span>
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-700 border border-blue-100">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">{formatCurrency(kpis.totalInvoiced)}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">{invoices.length} invoices generated</p>
          </CardContent>
        </Card>

        {/* Card 4: Collected Revenue */}
        <Card className="border-emerald-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-gradient-to-br from-white to-emerald-50/30 rounded-2xl hover:border-emerald-300 hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Collected Revenue</span>
              <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700 border border-emerald-200/60">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-emerald-700 mt-2 font-mono">{formatCurrency(kpis.totalPaid)}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Paid in full &amp; cleared</p>
          </CardContent>
        </Card>

        {/* Card 5: Outstanding Balance */}
        <Card className="border-amber-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-gradient-to-br from-white to-amber-50/30 rounded-2xl hover:border-amber-300 hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Outstanding Due</span>
              <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700 border border-amber-200/60">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-amber-700 mt-2 font-mono">{formatCurrency(kpis.totalUnpaid)}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">Pending payment settlement</p>
          </CardContent>
        </Card>

      </div>

      {/* Quick Access Client Workspace Grid */}
      <Card className="border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-white rounded-3xl overflow-hidden">
        <div className="p-6 sm:p-7 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900">Client Workspace Launcher</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Quickly launch into any client&apos;s isolated 360° workspace to view files, milestone status, or issue invoices.
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by client name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-xs pl-9 pr-8 bg-white border-slate-200 rounded-xl shadow-xs focus:ring-2 focus:ring-sky-500/20"
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

        <div className="p-6 sm:p-7">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              No matching clients found in directory.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredClients.map((client) => {
                const stats = clientStatsMap.get(client.id) || { docCount: 0, unpaidAmount: 0 };
                const initial = (client.full_name || client.email)[0].toUpperCase();

                return (
                  <div
                    key={client.id}
                    onClick={() => onSelectClient(client)}
                    className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {initial}
                        </div>
                        {client.is_disabled ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Suspended
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 mt-3 truncate group-hover:text-blue-700 transition-colors">
                        {client.full_name || client.email}
                      </h4>
                      {client.full_name && (
                        <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{client.email}</p>
                      )}
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">{stats.docCount} files shared</span>
                      <span className="font-bold text-sky-700 flex items-center gap-1 group-hover:text-blue-700">
                        Launch <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

    </div>
  );
}
