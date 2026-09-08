import { X, Check, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobilePricingModal({ isOpen, onClose, onSelectPlan }) {
  if (!isOpen) return null;

  const plans = [
    {
      id: 'salaried',
      name: 'Salaried Individual (ITR-1 / 2)',
      price: '₹1,499',
      tag: 'Most Popular',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Ideal for employees with single or multiple Form 16s, house property & interest income.',
      features: [
        'Form 16 & AIS / 26AS cross-verification',
        'Maximum tax refund optimization',
        'Chapter VI-A (80C, 80D) deduction review',
        'Post-filing verification & ITR-V generation',
      ],
    },
    {
      id: 'investor',
      name: 'Capital Gains & Trading',
      price: '₹2,999',
      tag: 'Investors',
      tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Comprehensive tax filing for stock traders, mutual fund investors & crypto holders.',
      features: [
        'Stocks, Mutual Funds & F&O capital gains',
        'Direct Zerodha / Groww / CAMS P&L import',
        'Loss carry-forward & set-off advisory',
        'Foreign stock (RSU / ESPP) compliance',
      ],
    },
    {
      id: 'business',
      name: 'Proprietorship & Freelancers',
      price: '₹4,999',
      tag: 'Professionals',
      tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
      description: 'Presumptive taxation (Sec 44ADA / 44AD) for freelancers, doctors, lawyers & business.',
      features: [
        'Gross receipts & presumptive income calculation',
        'GST reconciliation with GSTR-1 / 3B',
        'Advance tax quarterly liability check',
        'Dedicated senior chartered accountant review',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl p-6 z-10 space-y-4 animate-in slide-in-from-bottom-8 duration-200 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Tax Advisory Plans</h3>
              <p className="text-[10px] text-slate-400 font-medium">Transparent, zero hidden fees</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pricing Cards List */}
        <div className="space-y-3">
          {plans.map((p) => (
            <div 
              key={p.id}
              className="border border-slate-200/90 rounded-2xl p-4 bg-white hover:border-slate-300 transition-all shadow-xs space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${p.tagColor}`}>
                    {p.tag}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 mt-1.5">{p.name}</h4>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{p.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-slate-900 font-mono">{p.price}</span>
                  <p className="text-[9px] text-slate-400">per assessment</p>
                </div>
              </div>

              <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 space-y-1">
                {p.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  if (onSelectPlan) onSelectPlan(p.name);
                }}
                className="w-full text-xs h-8 rounded-xl font-bold gap-1 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
              >
                Inquire About {p.name.split(' ')[0]} <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-center text-slate-400">
          All filings prepared and audited by accredited Tax Practitioners &amp; Chartered Accountants.
        </p>

      </div>
    </div>
  );
}
