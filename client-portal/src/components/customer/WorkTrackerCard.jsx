import { useMemo } from 'react';
import { Clock, CheckCircle2, Circle, Check } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

const PIPELINE_STEPS = [
  { num: 1, title: 'Document Gathering', desc: 'Submitting tax forms & receipts', pct: 25 },
  { num: 2, title: 'Tax Audit & Calculation', desc: 'Advisor preparing deductions & returns', pct: 50 },
  { num: 3, title: 'Draft Review & Signature', desc: 'Pending client review & signoff', pct: 75 },
  { num: 4, title: 'Filed & Accepted', desc: 'Officially accepted by Tax Authority', pct: 100 },
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

export default function WorkTrackerCard({ statusTracker }) {
  // Determine progress metrics based on current status
  const progressInfo = useMemo(() => {
    if (!statusTracker || !statusTracker.current_step) {
      return { stepNum: 1, percentage: 25, isCompleted: false, title: 'Step 1 of 4: Initial Document Gathering' };
    }

    const s = statusTracker.current_step.toLowerCase();
    const match = s.match(/(?:step|phase)\s*([1-4])/i);
    let stepNum = 1;
    if (match && match[1]) {
      stepNum = parseInt(match[1], 10);
    } else if (s.includes('accepted') || s.includes('completed') || s.includes('filed')) {
      stepNum = 4;
    } else if (s.includes('draft') || s.includes('signature') || s.includes('signoff')) {
      stepNum = 3;
    } else if (s.includes('review') || s.includes('audit') || s.includes('calculation') || s.includes('computation')) {
      stepNum = 2;
    }

    const isCompleted = stepNum === 4 && (
      s.includes('completed') || 
      s.includes('accepted') || 
      s.includes('filed') ||
      s.includes('100%')
    );
    const percentage = isCompleted ? 100 : stepNum === 4 ? 100 : stepNum === 3 ? 75 : stepNum === 2 ? 50 : 25;

    return { stepNum, percentage, isCompleted, title: statusTracker.current_step };
  }, [statusTracker]);

  const phaseTitles = useMemo(() => {
    return getStoredPhases(statusTracker?.organization_id, statusTracker?.user_id, statusTracker?.current_step);
  }, [statusTracker]);

  // Extract clean dynamic title from custom statusTracker
  const getCardTitle = (step) => {
    if (step.num === progressInfo.stepNum && statusTracker?.current_step) {
      const clean = statusTracker.current_step.replace(/^(?:step\s*\d+\s*(?:of\s*\d+)?|phase\s*\d+)\s*:\s*/i, '').trim();
      return clean || phaseTitles[step.num] || step.title;
    }
    return phaseTitles[step.num] || step.title;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      
      {/* High-Contrast Enterprise Tracker Card */}
      <div className="bg-white border border-slate-200 text-slate-900 shadow-sm rounded-2xl overflow-hidden">
        
        <div className="p-6 sm:p-8 space-y-7">
          
          {/* Header Info Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 text-emerald-400 shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-none">Live Filing Status Tracker</h2>
                <p className="text-xs text-slate-500 mt-1">Real-time status broadcasted directly by your tax advisor</p>
              </div>
            </div>

            {/* Live Progress Status Badge */}
            <div className="self-start sm:self-auto">
              {progressInfo.isCompleted ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Task Completed (100%)
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  Phase 0{progressInfo.stepNum} in Progress ({progressInfo.percentage}%)
                </span>
              )}
            </div>
          </div>

          {/* Current Step Big Title & Notes */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest block">
              Current Milestone
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {progressInfo.title}
            </h3>
            {statusTracker?.notes && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs sm:text-sm text-slate-800 leading-relaxed mt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Advisor Remarks:
                </span>
                <p className="font-medium text-slate-700">&quot;{statusTracker.notes}&quot;</p>
              </div>
            )}
          </div>

          {/* Animated Continuous Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
              <span className="text-slate-500">Pipeline Progression</span>
              <span className={`font-mono text-sm ${progressInfo.isCompleted ? 'text-emerald-700' : 'text-emerald-600'}`}>
                {progressInfo.percentage}%
              </span>
            </div>

            {/* The Track */}
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out relative ${
                  progressInfo.isCompleted
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-md shadow-emerald-500/30'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 animate-pulse'
                }`}
                style={{ width: `${progressInfo.percentage}%` }}
              />
            </div>
          </div>

          {/* 4-Step Pipeline Node Stepper with Clear Visible Typography */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            {PIPELINE_STEPS.map((step) => {
              const isPast = step.num < progressInfo.stepNum || progressInfo.isCompleted;
              const isCurrent = step.num === progressInfo.stepNum && !progressInfo.isCompleted;
              const cardTitle = getCardTitle(step);

              return (
                <div
                  key={step.num}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-emerald-500/50'
                      : isPast
                        ? 'bg-emerald-50/70 border-emerald-200 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isCurrent ? 'text-emerald-400' : isPast ? 'text-emerald-700' : 'text-slate-400'}`}>
                      Phase 0{step.num}
                    </span>
                    {isPast ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                    ) : isCurrent ? (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-300" />
                    )}
                  </div>
                  <h4 className={`font-bold text-xs mt-2 leading-snug ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                    {cardTitle}
                  </h4>
                  <p className={`text-[10px] mt-1 line-clamp-2 leading-relaxed ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Footer Timestamp */}
          {statusTracker?.updated_at && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400">
              <span className="font-medium">Status Broadcast</span>
              <span>Last updated: {formatDate(statusTracker.updated_at)}</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
