import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Loader2, CheckCircle2, Search, Check, RotateCcw } from 'lucide-react';

const PIPELINE_STEPS = [
  { num: 1, title: 'Initial Document Gathering', desc: 'Client submits tax forms & receipts', pct: 25 },
  { num: 2, title: 'Tax Audit & Calculation', desc: 'Advisor prepares return & deductions', pct: 50 },
  { num: 3, title: 'Draft Review & Signature', desc: 'Pending client review & signoff', pct: 75 },
  { num: 4, title: 'Return Filed & Accepted', desc: 'Accepted by Tax Authority / IRS', pct: 100 },
];

const DEFAULT_PHASE_TITLES = {
  1: 'Initial Document Gathering',
  2: 'Tax Audit & Calculation',
  3: 'Draft Review & Signature',
  4: 'Return Filed & Accepted',
};

function getStoredPhases(orgId, clientId, currentStepString) {
  let stored = {};
  try {
    if (clientId) {
      const clientData = localStorage.getItem(`client_pipeline_phases_${clientId}`);
      if (clientData) stored = JSON.parse(clientData);
    }
    if (!Object.keys(stored).length && orgId) {
      const firmData = localStorage.getItem(`firm_pipeline_phases_${orgId}`);
      if (firmData) stored = JSON.parse(firmData);
    }
    if (!Object.keys(stored).length) {
      const globalData = localStorage.getItem('firm_pipeline_phases_default');
      if (globalData) stored = JSON.parse(globalData);
    }
  } catch (e) {
    console.warn('Could not read phase titles from storage', e);
  }

  const result = {
    1: stored[1] || stored['1'] || DEFAULT_PHASE_TITLES[1],
    2: stored[2] || stored['2'] || DEFAULT_PHASE_TITLES[2],
    3: stored[3] || stored['3'] || DEFAULT_PHASE_TITLES[3],
    4: stored[4] || stored['4'] || DEFAULT_PHASE_TITLES[4],
  };

  if (currentStepString) {
    const match = currentStepString.match(/(?:step|phase)\s*([1-4])/i);
    const clean = currentStepString.replace(/^(?:step\s*\d+\s*(?:of\s*\d+)?|phase\s*\d+)\s*:\s*/i, '').trim();
    if (match && match[1] && clean) {
      result[match[1]] = clean;
    }
  }

  return result;
}

export default function WorkTrackerManager({
  customers = [],
  selectedCustomer,
  onSelectCustomer,
  statusStep,
  setStatusStep,
  statusNotes,
  setStatusNotes,
  onUpdateStatus,
  savingStatus = false,
}) {
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  const activeClient = selectedCustomer || customers[0] || null;

  const phaseTitles = useMemo(() => {
    return getStoredPhases(activeClient?.organization_id, activeClient?.id, statusStep);
  }, [activeClient, statusStep]);

  const [selectedStepNum, setSelectedStepNum] = useState(() => {
    const s = (statusStep || '').toLowerCase();
    const match = s.match(/(?:step|phase)\s*([1-4])/i);
    if (match && match[1]) return parseInt(match[1], 10);
    if (s.includes('step 4') || s.includes('accepted') || s.includes('completed') || s.includes('filed')) return 4;
    if (s.includes('step 3') || s.includes('draft') || s.includes('signature')) return 3;
    if (s.includes('step 2') || s.includes('review') || s.includes('audit') || s.includes('calculation')) return 2;
    return 1;
  });

  const activeStepNum = useMemo(() => {
    const s = (statusStep || '').toLowerCase();
    const match = s.match(/(?:step|phase)\s*([1-4])/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    if (s.includes('accepted') || s.includes('completed') || s.includes('filed')) return 4;
    if (s.includes('draft') || s.includes('signature') || s.includes('signoff')) return 3;
    if (s.includes('review') || s.includes('audit') || s.includes('calculation') || s.includes('computation')) return 2;
    return selectedStepNum || 1;
  }, [statusStep, selectedStepNum]);

  const currentProgress = useMemo(() => {
    const stepNum = activeStepNum;
    const s = (statusStep || '').toLowerCase();
    const isCompleted = stepNum === 4 && (
      s.includes('completed') || 
      s.includes('accepted') || 
      s.includes('filed') ||
      s.includes('100%')
    );
    const percentage = isCompleted ? 100 : stepNum === 4 ? 100 : stepNum === 3 ? 75 : stepNum === 2 ? 50 : 25;
    return { stepNum, percentage, isCompleted };
  }, [activeStepNum, statusStep]);

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return customers;
    const q = clientSearchQuery.toLowerCase().trim();
    return customers.filter(
      c => (c.email && c.email.toLowerCase().includes(q)) || (c.full_name && c.full_name.toLowerCase().includes(q))
    );
  }, [customers, clientSearchQuery]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!activeClient) return;
    onUpdateStatus(activeClient.id, statusStep, statusNotes);
  };

  const handleCompleteTask = () => {
    if (!activeClient) return;
    const completedTitle = 'Step 4 of 4: Return Filed & Accepted by Tax Authority';
    const completedNotes = statusNotes || 'Tax return filing successfully verified and completed.';
    setSelectedStepNum(4);
    setStatusStep(completedTitle);
    setStatusNotes(completedNotes);
    onUpdateStatus(activeClient.id, completedTitle, completedNotes);
  };

  const handleStartNewTask = () => {
    if (!activeClient) return;
    const initialTitle = 'Step 1 of 4: Initial Document Gathering';
    const initialNotes = '';
    setSelectedStepNum(1);
    setStatusStep(initialTitle);
    setStatusNotes(initialNotes);
    onUpdateStatus(activeClient.id, initialTitle, initialNotes);
  };

  return (
    <Card className="border-slate-200 max-w-2xl mx-auto shadow-sm bg-white">
      <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <Clock className="w-5 h-5 text-emerald-600" /> Update Live Work Status
          </CardTitle>
          <CardDescription className="text-xs">
            Updates broadcast in real-time to the client&apos;s customer portal dashboard.
          </CardDescription>
        </div>

        {activeClient && (
          <div>
            {!currentProgress.isCompleted ? (
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={handleCompleteTask}
                disabled={savingStatus}
                className="text-xs h-8 gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed (100%)
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStartNewTask}
                disabled={savingStatus}
                className="text-xs h-8 gap-1.5 text-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Start New Task
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Direct Client Selector */}
          <div className="relative space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Target Client Account <span className="text-red-500">*</span></Label>
            
            <div
              onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 flex items-center justify-between text-xs cursor-pointer hover:border-slate-400 transition-colors"
            >
              {activeClient ? (
                <div className="truncate">
                  <span className="font-semibold text-slate-800">{activeClient.full_name || activeClient.email}</span>
                  {activeClient.full_name && (
                    <span className="text-slate-400 ml-1.5 font-mono text-[11px]">({activeClient.email})</span>
                  )}
                </div>
              ) : (
                <span className="text-slate-400">Search and select client...</span>
              )}
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
            </div>

            {/* Dropdown */}
            {isClientDropdownOpen && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl p-2 space-y-1.5 animate-in fade-in duration-150 max-h-56 overflow-y-auto">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search client by name or email..."
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    className="h-8 text-xs pl-8 pr-2 bg-slate-50"
                    autoFocus
                  />
                </div>

                <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400 text-center italic">No matching clients found</p>
                  ) : (
                    filteredClients.map((client) => {
                      const isSelected = activeClient?.id === client.id;
                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            if (onSelectCustomer) onSelectCustomer(client);
                            setIsClientDropdownOpen(false);
                            setClientSearchQuery('');
                          }}
                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isSelected ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="truncate">
                            <p className="truncate">{client.full_name || client.email}</p>
                            {client.full_name && <p className="text-[10px] text-slate-400 font-mono">{client.email}</p>}
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Current Step / Milestone Title <span className="text-red-500">*</span></Label>
            <Input 
              placeholder="e.g. Step 2 of 4: Tax Audit Review in Progress" 
              value={statusStep} 
              onChange={(e) => setStatusStep(e.target.value)} 
              required 
              className="mt-1 text-xs" 
            />
          </div>

          {/* Quick preset chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Pipeline Templates
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PIPELINE_STEPS.map((st) => (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => {
                    setSelectedStepNum(st.num);
                    const titleForStep = phaseTitles[st.num] || st.title;
                    setStatusStep(`Step ${st.num} of 4: ${titleForStep}`);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200 text-left"
                >
                  Phase {st.num}: {phaseTitles[st.num] || st.title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Notes for Client (Optional)</Label>
            <textarea 
              rows={3} 
              placeholder="e.g. Missing W-2 uploaded. Reviewing deduction forms." 
              value={statusNotes} 
              onChange={(e) => setStatusNotes(e.target.value)} 
              className="w-full mt-1 p-2.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800" 
            />
          </div>

          <Button 
            type="submit" 
            variant="accent" 
            size="sm" 
            disabled={savingStatus || !activeClient} 
            className="w-full sm:w-auto px-6 font-semibold"
          >
            {savingStatus ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Publishing Milestone...
              </>
            ) : (
              "Publish Live Status"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
