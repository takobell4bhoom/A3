import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Loader2, CheckCircle2, Circle, Check, 
  RotateCcw, Clock 
} from 'lucide-react';

const PIPELINE_STEPS = [
  { num: 1, title: 'Initial Document Gathering', desc: 'Client submits tax forms & receipts', pct: 25 },
  { num: 2, title: 'Tax Audit & Calculation', desc: 'Advisor prepares return & deductions', pct: 50 },
  { num: 3, title: 'Draft Review & Signature', desc: 'Pending client review & signoff', pct: 75 },
  { num: 4, title: 'Return Filed & Accepted', desc: 'Accepted by Tax Authority / IRS', pct: 100 },
];

export default function ClientWorkTrackerTab({
  client,
  statusStep,
  setStatusStep,
  statusNotes,
  setStatusNotes,
  onUpdateStatus,
  savingStatus = false,
}) {
  // Compute current step index & progress percentage
  const currentProgress = useMemo(() => {
    const s = (statusStep || '').toLowerCase();
    if (s.includes('step 4') || s.includes('accepted') || s.includes('completed') || s.includes('filed')) {
      return { stepNum: 4, percentage: 100, isCompleted: true };
    }
    if (s.includes('step 3') || s.includes('draft') || s.includes('signature')) {
      return { stepNum: 3, percentage: 75, isCompleted: false };
    }
    if (s.includes('step 2') || s.includes('review') || s.includes('audit') || s.includes('calculation')) {
      return { stepNum: 2, percentage: 50, isCompleted: false };
    }
    return { stepNum: 1, percentage: 25, isCompleted: false };
  }, [statusStep]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!client) return;
    onUpdateStatus(client.id, statusStep, statusNotes);
  };

  // One-click Complete Task Action
  const handleCompleteTask = () => {
    const completedTitle = 'Step 4 of 4: Return Filed & Accepted by Tax Authority';
    const completedNotes = statusNotes || 'Tax return filing successfully verified and completed.';
    setStatusStep(completedTitle);
    setStatusNotes(completedNotes);
    onUpdateStatus(client.id, completedTitle, completedNotes);
  };

  // Start New Task Cycle Action
  const handleStartNewTask = () => {
    const initialTitle = 'Step 1 of 4: Initial Document Gathering';
    const initialNotes = '';
    setStatusStep(initialTitle);
    setStatusNotes(initialNotes);
    onUpdateStatus(client.id, initialTitle, initialNotes);
  };

  const handleSelectPhase = (step) => {
    setStatusStep(`Step ${step.num} of 4: ${step.title}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Live Client Progress Mirror Box */}
      <div className="bg-white border border-slate-200 text-slate-900 shadow-sm rounded-2xl p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block">
                Live Client Screen Mirror
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                {statusStep || 'Initial Document Gathering'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentProgress.isCompleted ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completed (100%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                In Progress ({currentProgress.percentage}%)
              </span>
            )}
          </div>
        </div>

        {/* Animated Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span className="text-slate-500">Live Progression Bar</span>
            <span className="font-mono text-emerald-600 font-bold">{currentProgress.percentage}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                currentProgress.isCompleted
                  ? 'bg-emerald-600 shadow-sm shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 animate-pulse'
              }`}
              style={{ width: `${currentProgress.percentage}%` }}
            />
          </div>
        </div>

        {/* Stepper Nodes */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {PIPELINE_STEPS.map((st) => {
            const isPast = st.num < currentProgress.stepNum || currentProgress.isCompleted;
            const isCurrent = st.num === currentProgress.stepNum && !currentProgress.isCompleted;

            return (
              <div
                key={st.num}
                onClick={() => handleSelectPhase(st)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-emerald-500/50'
                    : isPast
                      ? 'bg-emerald-50/70 border-emerald-200 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isCurrent ? 'text-emerald-400' : isPast ? 'text-emerald-700' : 'text-slate-400'}`}>
                    Phase 0{st.num}
                  </span>
                  {isPast ? (
                    <Check className="w-4 h-4 text-emerald-600 font-bold" />
                  ) : isCurrent ? (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </div>
                <h4 className={`font-bold text-xs mt-1.5 leading-snug ${isCurrent ? 'text-white' : 'text-slate-900'}`}>{st.title}</h4>
                <span className={`text-[10px] block mt-0.5 ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>{st.pct}% Target</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Milestone Controller Form */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base text-slate-900">Milestone Control &amp; Broadcast</CardTitle>
            <CardDescription className="text-xs">
              Change the phase or mark the filing completely finished.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {/* Complete Task Button */}
            {!currentProgress.isCompleted ? (
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={handleCompleteTask}
                disabled={savingStatus}
                className="text-xs h-8 gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Completed (100%)
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStartNewTask}
                disabled={savingStatus}
                className="text-xs h-8 gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Start New Task Cycle
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Milestone Phase Title <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Step 2 of 4: Tax Audit & Calculation in Progress"
                value={statusStep}
                onChange={(e) => setStatusStep(e.target.value)}
                required
                className="mt-1 text-xs font-medium"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Client Advisory Notes (Optional)</Label>
              <textarea
                rows={3}
                placeholder="e.g. All documents received. Reviewing deduction eligibility."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="w-full mt-1 p-2.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                type="submit"
                variant="accent"
                size="sm"
                disabled={savingStatus}
                className="px-6 font-semibold text-xs"
              >
                {savingStatus ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Publishing Update...
                  </>
                ) : (
                  "Publish Milestone Update"
                )}
              </Button>

              {currentProgress.isCompleted && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStartNewTask}
                  className="text-xs text-slate-600 hover:text-slate-900 gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset to Phase 01 (New Service)
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
