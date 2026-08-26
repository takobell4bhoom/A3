import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, FolderOpen, Receipt } from 'lucide-react';

export default function CustomerHeader({
  firmName = 'Tax Shield Advisor',
  logoUrl,
  userEmail,
  activeTab,
  setActiveTab,
  documentCount = 0,
  invoiceCount = 0,
  features = { invoices: true, documents: true, workTracker: true },
  onSignOut,
}) {
  const showWorkTracker = features?.workTracker !== false;
  const showDocuments = features?.documents !== false;
  const showInvoices = features?.invoices !== false;

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-[0_1px_3px_0_rgba(0,0,0,0.02),0_1px_2px_-1px_rgba(0,0,0,0.02)]">
      <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-3 lg:gap-6">
        
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

        {/* Desktop Segmented Nav Tabs */}
        <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 bg-slate-100/90 p-1 lg:p-1.5 rounded-2xl border border-slate-200/70 shadow-inner shrink-0">
          {showWorkTracker && (
            <button
              onClick={() => setActiveTab('overview')}
              className={`text-[11px] lg:text-xs px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> 
              <span>Work Tracker</span>
            </button>
          )}

          {showDocuments && (
            <button
              onClick={() => setActiveTab('documents')}
              className={`text-[11px] lg:text-xs px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                activeTab === 'documents'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> 
              <span className="hidden lg:inline">My Documents</span>
              <span className="lg:hidden">Docs</span>
              <span className="text-[10px] opacity-75 font-mono">({documentCount})</span>
            </button>
          )}

          {showInvoices && (
            <button
              onClick={() => setActiveTab('invoices')}
              className={`text-[11px] lg:text-xs px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                activeTab === 'invoices'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> 
              <span>Invoices</span>
              <span className="text-[10px] opacity-75 font-mono">({invoiceCount})</span>
            </button>
          )}
        </nav>

        {/* User Profile & Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
          <div className="text-right hidden xl:block">
            <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{userEmail}</p>
            <p className="text-[10px] text-slate-500 font-medium">Verified Client</p>
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
    </header>
  );
}
