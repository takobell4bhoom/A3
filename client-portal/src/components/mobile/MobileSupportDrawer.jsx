import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { MessageCircle, Phone, Clock, X, CheckCircle2, ArrowRight } from 'lucide-react';

export default function MobileSupportDrawer({ 
  isOpen, 
  onClose, 
  organization, 
  firmName = 'Tax Shield Advisor',
  userEmail,
  initialTopic = '',
}) {
  const toast = useToast();
  const [queryText, setQueryText] = useState(initialTopic ? `I would like to inquire about ${initialTopic}.` : '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  // Configurable contact details from organization metadata or defaults
  const supportPhone = organization?.phone || '+91 7428238001';
  const cleanPhone = supportPhone.replace(/[^0-9]/g, '');
  const supportEmail = organization?.support_email || 'simar@taxshieldadvisor.com';
  const whatsappNumber = organization?.whatsapp || cleanPhone;

  const handleWhatsApp = () => {
    const detailText = queryText.trim()
      ? `I need assistance regarding: ${queryText.trim()}`
      : 'I need assistance with my portal services.';
    const message = encodeURIComponent(
      `Hello ${firmName}, ${detailText} (${userEmail || 'Client'}).`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  const handleCall = () => {
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!queryText.trim()) return;

    setSubmitting(true);
    // Simulate support ticket dispatch
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast.success('Query Received', 'Your tax advisor has been notified and will reach out shortly.');
      setTimeout(() => {
        setSubmitted(false);
        setQueryText('');
        onClose();
      }, 2000);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      
      {/* Backdrop click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Drawer Card */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl p-6 z-10 space-y-5 animate-in slide-in-from-bottom-8 duration-200 max-h-[90vh] overflow-y-auto">
        
        {/* Top Handle / Close Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Advisor Support Desk</h3>
              <p className="text-[10px] text-slate-400 font-medium">{firmName}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Direct Connect Actions (WhatsApp & Phone) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleWhatsApp}
            className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-900 rounded-2xl p-3.5 flex flex-col items-start gap-1 transition-all active:scale-[0.98] shadow-xs text-left"
          >
            <div className="flex items-center justify-between w-full">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs shadow-xs font-bold">
                WA
              </span>
              <span className="text-[9px] font-bold text-emerald-700 bg-white/80 px-1.5 py-0.5 rounded-full border border-emerald-200">
                Instant
              </span>
            </div>
            <span className="text-xs font-bold mt-1 text-slate-900">WhatsApp Chat</span>
            <span className="text-[10px] text-emerald-700 font-medium">Direct advisor desk</span>
          </button>

          <button
            onClick={handleCall}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 rounded-2xl p-3.5 flex flex-col items-start gap-1 transition-all active:scale-[0.98] shadow-xs text-left"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded-full border border-slate-200">
                Voice
              </span>
            </div>
            <span className="text-xs font-bold mt-1 text-slate-900">Direct Call</span>
            <span className="text-[10px] text-slate-500 font-medium truncate w-full">{supportPhone}</span>
          </button>
        </div>

        {/* Operating Hours Note */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] text-slate-500">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Priority Advisory Desk: Mon – Sat, 9:30 AM – 7:00 PM IST</span>
        </div>

        {/* Quick Query Form */}
        <form onSubmit={handleSubmitTicket} className="space-y-3 pt-1">
          <label className="block text-xs font-bold text-slate-800">
            Send a Quick Query or Request a Callback
          </label>
          <textarea
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="E.g., I have uploaded my Form 16, please review..."
            rows={3}
            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none bg-slate-50/50"
            disabled={submitting || submitted}
          />

          {submitted ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Your request has been routed to your designated tax officer.
            </div>
          ) : (
            <Button
              type="submit"
              disabled={submitting || !queryText.trim()}
              variant="primary"
              className="w-full text-xs h-10 rounded-xl gap-2 font-bold"
            >
              {submitting ? 'Sending Request...' : 'Submit Advisory Request'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </form>

        {/* Support Email fallback */}
        <div className="text-center pt-1 border-t border-slate-100">
          <p className="text-[10px] text-slate-400">
            Prefer email? Write to <a href={`mailto:${supportEmail}`} className="font-semibold text-slate-700 underline">{supportEmail}</a>
          </p>
        </div>

      </div>
    </div>
  );
}
