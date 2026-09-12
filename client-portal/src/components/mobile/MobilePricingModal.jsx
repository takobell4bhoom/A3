import { X, Check, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobilePricingModal({ isOpen, onClose, onSelectPlan }) {
  if (!isOpen) return null;

  const plans = [
    {
      id: 'gst-registration',
      name: 'GST Registration',
      price: '₹1,499',
      unit: 'per service',
      tag: 'Registrations',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Complete GST registration support for businesses, startups & proprietors.',
      features: [
        'GST application preparation & filing',
        'Document verification & application review',
        'GST ARN tracking & status updates',
        'GST certificate download & handover',
      ],
      ctaText: 'Inquire About GST',
    },
    {
      id: 'msme-registration',
      name: 'MSME Registration',
      price: '₹999',
      unit: 'per service',
      tag: 'Registrations',
      tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Get your business registered under Udyam for MSME recognition and benefits.',
      features: [
        'Udyam registration application',
        'Business details & document verification',
        'Udyam Registration Number generation',
        'Digital MSME certificate handover',
      ],
      ctaText: 'Inquire About MSME',
    },
    {
      id: 'dsc-registration',
      name: 'DSC Registration',
      price: '₹2,499',
      unit: 'per service',
      tag: 'Digital Signature',
      tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Secure digital signature certificate for MCA, GST and other online compliance requirements.',
      features: [
        'DSC application & documentation support',
        'Aadhaar-based identity verification',
        'Video verification assistance',
        'DSC issuance & installation guidance',
      ],
      ctaText: 'Inquire About DSC',
    },
    {
      id: 'digital-marketing',
      name: 'Digital Marketing',
      price: '₹4,999',
      unit: 'per service',
      tag: 'Marketing',
      tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
      description: 'Build your online presence and reach the right audience through digital marketing.',
      features: [
        'Social media marketing strategy',
        'Creative content & campaign planning',
        'Lead generation & audience targeting',
        'Performance tracking & growth guidance',
      ],
      ctaText: 'Inquire About Marketing',
    },
    {
      id: 'business-growth',
      name: 'Business Growth',
      price: '₹4,999',
      unit: 'per service',
      tag: 'Business Advisory',
      tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
      description: 'Strategic business guidance to improve operations, build systems and scale your business.',
      features: [
        'Business growth & strategy planning',
        'Revenue and lead generation guidance',
        'Process automation & management systems',
        'Funding and expansion advisory',
      ],
      ctaText: 'Inquire About Growth',
    },
    {
      id: 'website-development',
      name: 'Website Development',
      price: '₹6,999',
      unit: 'per service',
      tag: 'Technology',
      tagColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      description: 'Professional, responsive websites designed to establish your brand online.',
      features: [
        'Responsive website design',
        'Business-focused pages & content',
        'Contact forms and essential integrations',
        'Website launch & basic setup support',
      ],
      ctaText: 'Inquire About Website',
    },
    {
      id: 'legal-drafting',
      name: 'Legal Drafting',
      price: '₹1,499',
      unit: 'per service',
      tag: 'Legal Services',
      tagColor: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'Professional legal document drafting support for businesses and everyday business needs.',
      features: [
        'Business agreements & contracts',
        'Notices, declarations & legal letters',
        'Customized drafting based on requirements',
        'Document review & final draft delivery',
      ],
      ctaText: 'Inquire About Legal Drafting',
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
              <h3 className="text-sm font-extrabold text-slate-900">Service Pricing &amp; Plans</h3>
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
                  <p className="text-[9px] text-slate-400">{p.unit || 'per service'}</p>
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
                  if (onSelectPlan) onSelectPlan(p.name, p.ctaText);
                }}
                className="w-full text-xs h-8 rounded-xl font-bold gap-1 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <span>{p.ctaText || `Inquire About ${p.name.split(' ')[0]}`}</span> <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-center text-slate-400">
          All services managed and audited by accredited professionals &amp; advisors.
        </p>

      </div>
    </div>
  );
}
