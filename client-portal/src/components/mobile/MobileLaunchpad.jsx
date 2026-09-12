import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MobileSupportDrawer from './MobileSupportDrawer';
import MobilePricingModal from './MobilePricingModal';
import { 
  LayoutGrid, 
  Headphones, 
  Globe, 
  ReceiptText, 
  Clock, 
  FolderOpen, 
  ShieldCheck, 
  LogOut, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function MobileLaunchpad() {
  const navigate = useNavigate();
  const { session, user, organization, signOut } = useAuth();
  
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportTopic, setSupportTopic] = useState('');
  const [pricingOpen, setPricingOpen] = useState(false);
  const [statusTracker, setStatusTracker] = useState(null);
  const [docCount, setDocCount] = useState(0);

  const userId = session?.user?.id || user?.id;
  const firmName = organization?.name || 'Tax Shield Advisor';
  const logoUrl = organization?.logo_url || '/taxshield-logo.jpg';
  const firmWebsite = organization?.website || 'https://taxshieldadvisor.com';

  useEffect(() => {
    if (!userId) return;

    // Fetch brief status milestone and doc count for mini-pulse widget
    async function loadMiniState() {
      try {
        const { data: status } = await supabase
          .from('status_tracker')
          .select('current_step, step_title, is_completed')
          .eq('user_id', userId)
          .maybeSingle();

        if (status) setStatusTracker(status);

        const { count } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (count !== null) setDocCount(count);
      } catch (err) {
        console.error('Failed to load launchpad state:', err);
      }
    }

    loadMiniState();
  }, [userId]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-sky-100 selection:text-sky-900 pb-28">
      
      {/* Sticky Top Brand Header Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sticky top-0 z-30 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={firmName} 
                className="h-9 w-auto max-w-[140px] object-contain shrink-0" 
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                TS
              </div>
            )}
            <div>
              <h1 className="text-xs font-black text-slate-900 tracking-tight leading-tight truncate max-w-[170px]">{firmName}</h1>
              <p className="text-[9.5px] text-slate-400 font-medium">Client Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session ? (
              <>
                <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/80 rounded-full py-1 px-2.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-slate-700">Client</span>
                </div>

                <button 
                  onClick={signOut}
                  title="Sign Out"
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 flex items-center justify-center transition-colors border border-slate-200/80 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-3 py-1.5 text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md w-full mx-auto px-4 pt-5 space-y-4 flex-1">
        
        {/* Welcome Section */}
        <div className="space-y-0.5 px-0.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              Client Launchpad
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </h2>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              FY 2025-26
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {session 
              ? `Welcome back, ${session?.user?.email ? session.user.email.split('@')[0] : 'Client'}. Select an action:` 
              : `Welcome to ${firmName}. Select an action below:`}
          </p>
        </div>

        {/* RECESSED TRAY CHASSIS (Directly styled after your desktop menu card depth) */}
        <div className="bg-slate-100/92 border border-slate-200/85 shadow-[inset_0_2px_4px_0_rgba(15,23,42,0.04),0_1px_2px_0_rgba(15,23,42,0.02)] p-3 rounded-3xl space-y-2.5">
          
          <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
              Services &amp; Actions
            </span>
            <span className="text-[9.5px] text-slate-400 font-medium normal-case">Instant Access</span>
          </div>

          {/* Quick Actions Elevated White Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            
            {/* TILE 1: Client Portal (Styled like the active 'Overview' pill) */}
            <button
              onClick={() => navigate(session ? '/portal' : '/')}
              className="bg-white border border-slate-200/90 shadow-[0_4px_14px_-2px_rgba(15,23,42,0.07),0_2px_4px_-1px_rgba(15,23,42,0.04)] rounded-2xl p-3.5 text-left flex flex-col justify-between min-h-[135px] relative group active:scale-[0.97] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100/80 text-blue-700 flex items-center justify-center shadow-xs">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[9px] font-bold rounded-full">
                  Active
                </span>
              </div>
              
              <div className="mt-2">
                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors flex items-center justify-between">
                  <span>Client Portal</span>
                  <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[9.5px] text-slate-500 font-medium leading-tight mt-0.5">
                  Work tracker, docs &amp; invoices
                </p>
              </div>
            </button>

            {/* TILE 2: Live Support (Styled with warm amber depth like 'Sell Licenses') */}
            <button
              onClick={() => {
                setSupportTopic('');
                setSupportOpen(true);
              }}
              className="bg-white border border-slate-200/90 shadow-[0_4px_14px_-2px_rgba(15,23,42,0.07),0_2px_4px_-1px_rgba(15,23,42,0.04)] rounded-2xl p-3.5 text-left flex flex-col justify-between min-h-[135px] relative group active:scale-[0.97] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shadow-xs">
                  <Headphones className="w-5 h-5" />
                </div>
                <span className="bg-[#fffbeb] border border-[#fde68a] text-[#92400e] px-2 py-0.5 text-[9px] font-bold rounded-full shadow-2xs">
                  Online
                </span>
              </div>
              
              <div className="mt-2">
                <div className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors flex items-center justify-between">
                  <span>Live Support</span>
                  <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[9.5px] text-slate-500 font-medium leading-tight mt-0.5">
                  WhatsApp &amp; call advisor
                </p>
              </div>
            </button>

            {/* TILE 3: Our Website */}
            <button
              onClick={() => window.open(firmWebsite, '_blank')}
              className="bg-white border border-slate-200/90 shadow-[0_4px_14px_-2px_rgba(15,23,42,0.07),0_2px_4px_-1px_rgba(15,23,42,0.04)] rounded-2xl p-3.5 text-left flex flex-col justify-between min-h-[135px] relative group active:scale-[0.97] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100/80 text-sky-600 flex items-center justify-center shadow-xs">
                  <Globe className="w-5 h-5" />
                </div>
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200/80 text-[8.5px] font-mono rounded-md">
                  .com
                </span>
              </div>
              
              <div className="mt-2">
                <div className="text-xs font-bold text-slate-900 group-hover:text-sky-700 transition-colors flex items-center justify-between">
                  <span>Our Website</span>
                  <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-sky-700 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[9.5px] text-slate-500 font-medium leading-tight mt-0.5">
                  Practice team &amp; services
                </p>
              </div>
            </button>

            {/* TILE 4: Pricing & Plans */}
            <button
              onClick={() => setPricingOpen(true)}
              className="bg-white border border-slate-200/90 shadow-[0_4px_14px_-2px_rgba(15,23,42,0.07),0_2px_4px_-1px_rgba(15,23,42,0.04)] rounded-2xl p-3.5 text-left flex flex-col justify-between min-h-[135px] relative group active:scale-[0.97] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/80 text-indigo-600 flex items-center justify-center shadow-xs">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200/80 text-slate-600 text-[9px] font-bold rounded-full">
                  Plans
                </span>
              </div>
              
              <div className="mt-2">
                <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition-colors flex items-center justify-between">
                  <span>Service Pricing</span>
                  <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[9.5px] text-slate-500 font-medium leading-tight mt-0.5">
                  All service rates &amp; packages
                </p>
              </div>
            </button>

          </div>
        </div>

        {/* MINI LIVE STATUS MILESTONE CARD */}
        <div 
          onClick={() => navigate(session ? '/portal' : '/')}
          className="bg-white border border-slate-200/90 shadow-[0_4px_14px_-2px_rgba(15,23,42,0.07),0_2px_4px_-1px_rgba(15,23,42,0.04)] rounded-2xl p-3.5 flex items-center justify-between text-xs cursor-pointer active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <span>Filing Status</span>
                {session && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {session 
                  ? (statusTracker?.step_title || 'Review & Verification') 
                  : 'Sign in to view real-time filing milestones & docs'}
              </p>
            </div>
          </div>
          
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-full">
            {session ? (statusTracker?.is_completed ? 'Completed' : 'In Progress') : 'Sign In'}
          </span>
        </div>

      </main>

      {/* FLOATING SEGMENTED BOTTOM BAR (Directly matching your desktop menu card) */}
      <div className="fixed bottom-3 left-0 right-0 max-w-md mx-auto px-4 z-40">
        <nav className="bg-slate-100/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200/85 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-around">
          
          {/* Active Tab: Home (Styled like the 'Overview' active pill) */}
          <button 
            className="bg-white text-blue-700 shadow-sm border border-slate-200/80 rounded-xl px-3.5 py-1.5 text-[10px] font-bold flex items-center gap-1.5 transition-all"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Home
          </button>

          {/* Tab: Tracker */}
          <button 
            onClick={() => navigate(session ? '/portal' : '/')}
            className="text-slate-600 hover:text-slate-900 px-2.5 py-1.5 text-[10px] font-semibold flex items-center gap-1 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Tracker
          </button>

          {/* Tab: Vault */}
          <button 
            onClick={() => navigate(session ? '/portal' : '/')}
            className="text-slate-600 hover:text-slate-900 px-2.5 py-1.5 text-[10px] font-semibold flex items-center gap-1 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Vault ({docCount})
          </button>

          {/* Tab: Support */}
          <button 
            onClick={() => setSupportOpen(true)}
            className="text-slate-600 hover:text-slate-900 px-2.5 py-1.5 text-[10px] font-semibold flex items-center gap-1 transition-colors"
          >
            <Headphones className="w-3.5 h-3.5" />
            Support
          </button>

        </nav>
      </div>

      {/* Support Drawer */}
      <MobileSupportDrawer
        key={supportTopic || 'support'}
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
        organization={organization}
        firmName={firmName}
        userEmail={session?.user?.email}
        initialTopic={supportTopic}
      />

      {/* Pricing Modal */}
      <MobilePricingModal
        isOpen={pricingOpen}
        onClose={() => setPricingOpen(false)}
        onSelectPlan={(planName) => {
          setSupportTopic(planName);
          setSupportOpen(true);
        }}
      />

    </div>
  );
}
