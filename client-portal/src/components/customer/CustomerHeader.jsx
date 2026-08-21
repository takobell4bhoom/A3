import { Button } from '@/components/ui/button';
import { Building2, LogOut, LayoutDashboard, FolderOpen, Receipt } from 'lucide-react';

export default function CustomerHeader({
  firmName = 'Tax Shield Advisor',
  userEmail,
  activeTab,
  setActiveTab,
  documentCount = 0,
  invoiceCount = 0,
  onSignOut,
}) {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none">{firmName}</h1>
            <span className="text-xs text-slate-400">Client Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">{userEmail}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSignOut} 
            className="gap-1.5 text-xs bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
          >
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
            <FolderOpen className="w-4 h-4" /> My Documents ({documentCount})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'invoices' ? 'border-emerald-400 text-emerald-400 bg-white/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" /> Invoices ({invoiceCount})
          </button>
        </div>
      </div>
    </header>
  );
}
