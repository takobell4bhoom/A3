import { Shield, LogOut, ArrowRight, LayoutDashboard, Settings, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function OwnerHeader({
  ownerEmail,
  distributorCount = 0,
  totalLicenses = 0,
  activeTab = 'governance',
  setActiveTab = () => {},
  onSignOut,
}) {
  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-50 shadow-xl font-sans">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-18 sm:h-20 gap-3 sm:gap-6">
          
          {/* Platform Owner Branding */}
          <div className="flex items-center gap-3 sm:gap-6 shrink-0 py-1">
            <div className="flex items-center shrink-0">
              <img 
                src="/taxshield-logo.jpg" 
                alt="Taxshield Advisor" 
                className="h-10 sm:h-11 md:h-12 w-auto max-w-[150px] sm:max-w-[180px] md:max-w-[210px] lg:max-w-[230px] object-contain rounded-xl border border-slate-700 bg-white p-1 shrink-0 transition-all" 
              />
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 shrink-0">
              <button
                onClick={() => setActiveTab('governance')}
                className={`text-[11px] lg:text-xs px-2.5 lg:px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                  activeTab === 'governance'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Distributors
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`text-[11px] lg:text-xs px-2.5 lg:px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Settings className="w-3.5 h-3.5" /> 
                <span className="hidden lg:inline">Platform Settings &amp; Security</span>
                <span className="lg:hidden">Settings</span>
              </button>
            </nav>
          </div>

          {/* Quick Metrics & User Controls */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            
            {/* Live Global Badge */}
            <div className="hidden xl:flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Distributors:</span>
                <span className="font-bold text-white font-mono">{distributorCount}</span>
              </div>
              <div className="h-3 w-px bg-slate-800" />
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Licenses:</span>
                <span className="font-bold text-emerald-400 font-mono">{totalLicenses}</span>
              </div>
            </div>

            {/* Switch to Distributor Firm Console */}
            <Link
              to="/admin"
              className="hidden lg:inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg font-semibold transition-all shrink-0"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
              Firm Dashboard <ArrowRight className="w-3 h-3" />
            </Link>

            {/* Owner Email & Sign Out */}
            <div className="flex items-center gap-2 border-l border-slate-800 pl-2.5 sm:pl-3 shrink-0">
              <div className="hidden 2xl:block text-right">
                <span className="text-xs font-bold text-white block truncate max-w-[150px]">
                  {ownerEmail || 'Platform Owner'}
                </span>
                <span className="text-[10px] text-amber-400 font-mono">Super Admin</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={onSignOut}
                className="text-slate-400 hover:text-red-400 hover:bg-red-950/30 text-xs h-8 px-2.5"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">Sign Out</span>
              </Button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
