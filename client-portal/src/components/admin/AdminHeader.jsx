import { Button } from '@/components/ui/button';
import { Building2, LogOut, Users, FolderOpen, Receipt, LayoutDashboard } from 'lucide-react';

export default function AdminHeader({
  firmName = 'Tax Shield Advisor',
  userEmail,
  activeTab,
  setActiveTab,
  documentCount = 0,
  onSignOut,
}) {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white">{firmName}</span>
                <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  Enterprise
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">Advisory Console</p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/50 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('overview')}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Overview
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'clients'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Clients &amp; Workspaces
            </button>

            <button
              onClick={() => setActiveTab('invoices')}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'invoices'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" /> All Invoices
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'documents'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" /> Global Documents ({documentCount})
            </button>
          </nav>

          {/* User Email & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200 truncate max-w-[180px]">{userEmail}</p>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Firm Administrator</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onSignOut}
              className="text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 h-8 gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>

        </div>
      </div>
    </header>
  );
}
