import { Button } from '@/components/ui/button';
import { Users, FolderOpen, Receipt, LayoutDashboard, KeyRound, Settings, LogOut } from 'lucide-react';

export default function AdminHeader({
  firmName = 'Tax Shield Advisor',
  logoUrl,
  userEmail,
  activeTab,
  setActiveTab,
  documentCount = 0,
  clientCount = 0,
  maxLicenses = 25,
  soldLicensesCount = 0,
  isOwner = false,
  isDistributor = false,
  onSignOut,
}) {
  const displayCount = isDistributor ? soldLicensesCount : clientCount;
  const usagePercent = maxLicenses > 0 ? Math.min(100, Math.round((displayCount / maxLicenses) * 100)) : 0;

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-[0_1px_3px_0_rgba(0,0,0,0.02),0_1px_2px_-1px_rgba(0,0,0,0.02)]">
      <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20 gap-3 lg:gap-6">
          
          {/* Brand Logo (Prominent, Dynamic & Responsive) */}
          <div className="flex items-center shrink-0 py-1">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={firmName} 
                className="h-10 sm:h-11 md:h-12 lg:h-13 w-auto max-w-[150px] sm:max-w-[180px] md:max-w-[210px] lg:max-w-[240px] object-contain shrink-0 transition-all drop-shadow-2xs" 
              />
            ) : (
              <img 
                src="/taxshield-logo.jpg" 
                alt="Taxshield Advisor" 
                className="h-10 sm:h-11 md:h-12 lg:h-13 w-auto max-w-[150px] sm:max-w-[180px] md:max-w-[210px] lg:max-w-[240px] object-contain shrink-0 transition-all drop-shadow-2xs" 
              />
            )}
          </div>

          {/* Desktop Enterprise Segmented Navigation (Fluid & responsive across laptop/desktop sizes) */}
          <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 bg-slate-100/90 p-1 lg:p-1.5 rounded-2xl border border-slate-200/70 shadow-inner shrink min-w-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('overview')}
              className={`text-[11px] lg:text-xs px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 lg:gap-2 whitespace-nowrap shrink-0 ${
                activeTab === 'overview'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" /> 
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`text-[11px] lg:text-xs px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 lg:gap-2 whitespace-nowrap shrink-0 ${
                activeTab === 'clients'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Users className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" /> 
              <span className="hidden xl:inline">{isDistributor ? 'Clients & Workspaces' : 'Client Directory'}</span>
              <span className="xl:hidden">Clients</span>
            </button>

            <button
              onClick={() => setActiveTab('invoices')}
              className={`text-[11px] lg:text-xs px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 lg:gap-2 whitespace-nowrap shrink-0 ${
                activeTab === 'invoices'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" /> 
              <span>Invoices</span>
            </button>

            {/* Documents Vault (Distributor Only) */}
            {isDistributor && (
              <button
                onClick={() => setActiveTab('documents')}
                className={`text-[11px] lg:text-xs px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 lg:gap-2 whitespace-nowrap shrink-0 ${
                  activeTab === 'documents'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" /> 
                <span>Vault</span>
                <span className="text-[10px] opacity-75 font-mono">({documentCount})</span>
              </button>
            )}

            {/* Dedicated Tab for Selling and Managing Company Licenses (Distributor Only) */}
            {isDistributor && (
              <button
                onClick={() => setActiveTab('licenses')}
                className={`text-[11px] lg:text-xs px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl transition-all flex items-center gap-1.5 lg:gap-2 whitespace-nowrap shrink-0 ${
                  activeTab === 'licenses'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm font-extrabold'
                    : 'text-amber-800 bg-amber-50/90 hover:bg-amber-100 border border-amber-200/80 font-bold'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" /> 
                <span className="hidden xl:inline">Sell Licenses</span>
                <span className="xl:hidden">Licenses</span>
              </button>
            )}

            {/* Dedicated Settings & Security Tab for Everyone */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`text-[11px] lg:text-xs px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 lg:gap-2 whitespace-nowrap shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" /> 
              <span>Settings</span>
            </button>
          </nav>

          {/* Right Controls: Quota & User Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Live License Quota Counter (Reactive for both Distributors & Company Admins) */}
            <div 
              onClick={() => setActiveTab(isDistributor ? 'licenses' : 'clients')}
              className="hidden lg:flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl px-2.5 lg:px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-all shadow-2xs shrink-0"
              title={isDistributor ? "Click to view license pool" : "Click to view client seats"}
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-500 font-medium hidden xl:inline">
                {isDistributor ? 'Licenses Sold:' : 'License Pool:'}
              </span>
              <span className={`font-mono font-bold ${usagePercent >= 90 ? 'text-rose-600' : 'text-slate-900'}`}>
                {displayCount} / {maxLicenses}
              </span>
            </div>

            <div className="text-right hidden 2xl:block border-l border-slate-200 pl-3">
              <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{userEmail}</p>
              <p className="text-[10px] text-slate-500 font-medium">
                {isOwner ? 'Master Access' : isDistributor ? 'Distributor Admin' : 'Company Admin'}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onSignOut}
              className="text-xs border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-xl h-8 sm:h-9 px-2.5 sm:px-3 gap-1.5 transition-colors shadow-xs shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" /> <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>

        </div>
      </div>
    </header>
  );
}
