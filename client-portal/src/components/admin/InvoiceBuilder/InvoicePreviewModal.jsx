import { Button } from '@/components/ui/button';
import { Building2, Printer, X, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/dateUtils';

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  invoice,
  client,
  firmName = 'Tax Shield Advisor',
}) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalAmount = invoice.total_cents ? invoice.total_cents / 100 : Number(invoice.amount || 0);
  const subtotal = invoice.subtotal_cents ? invoice.subtotal_cents / 100 : Number(invoice.subtotal || totalAmount);
  const discount = invoice.discount_cents ? invoice.discount_cents / 100 : Number(invoice.discount_total || 0);
  const roundOff = invoice.round_off_cents ? invoice.round_off_cents / 100 : Number(invoice.round_off || 0);

  const isGst = invoice.billing_entity && invoice.billing_entity.includes('GST');
  const taxableAmount = Math.max(0, subtotal - discount);
  const gstAmount = isGst ? taxableAmount * 0.18 : 0;
  const cgst = isGst ? gstAmount / 2 : 0;
  const sgst = isGst ? gstAmount / 2 : 0;

  const clientEmail = client?.email || invoice.client_email || invoice.user?.email || 'Client';
  const clientName = client?.full_name || invoice.client_name || invoice.user?.full_name || clientEmail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto print:p-0 print:bg-white">
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 my-8 print:border-none print:shadow-none print:m-0 print:max-w-none"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Action Bar (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold">Tax Invoice Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 gap-1.5 px-3"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
            </Button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="p-8 sm:p-10 space-y-8 bg-white text-slate-900 font-sans">
          
          {/* Top Firm & Invoice Info */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-900 text-emerald-400 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-none">{firmName}</h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Tax &amp; Financial Advisory Services</p>
                </div>
              </div>
              <div className="mt-4 text-xs text-slate-500 space-y-0.5">
                <p><span className="font-semibold text-slate-700">Billing Category:</span> {invoice.billing_entity || 'Standard Tax Services'}</p>
                <p><span className="font-semibold text-slate-700">Payment Term:</span> {invoice.payment_term || 'NET 30'}</p>
              </div>
            </div>

            <div className="sm:text-right">
              <div className="inline-block">
                <span className="text-xs uppercase tracking-widest font-bold text-slate-400">Tax Invoice</span>
                <h3 className="text-2xl font-mono font-bold text-slate-900">{invoice.invoice_no || 'INV-0000'}</h3>
              </div>
              <div className="mt-2 text-xs text-slate-600 space-y-1">
                <p><span className="text-slate-400">Date:</span> {formatDate(invoice.issue_date)}</p>
                <p><span className="text-slate-400">Due Date:</span> {invoice.due_date ? formatDate(invoice.due_date) : 'Upon Receipt'}</p>
              </div>
              <div className="mt-3">
                {invoice.status === 'paid' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    <CheckCircle className="w-3.5 h-3.5" /> PAID
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                    <Clock className="w-3.5 h-3.5" /> UNPAID / DUE
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Billed To Details */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Billed To</span>
            <h4 className="text-sm font-bold text-slate-900 mt-0.5">{clientName}</h4>
            <p className="text-xs text-slate-600 font-mono mt-0.5">{clientEmail}</p>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Particulars</th>
                  <th className="p-3 w-24">Type</th>
                  <th className="p-3 w-28 text-right">Amount</th>
                  <th className="p-3 w-24 text-right">Discount</th>
                  <th className="p-3 w-28 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0 ? (
                  invoice.items.map((it, idx) => {
                    const itemAmount = parseFloat(it.amount) || 0;
                    const itemDiscount = parseFloat(it.discount) || 0;
                    const itemNet = Math.max(0, itemAmount - itemDiscount);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-medium text-slate-800">{it.particulars || 'Service Item'}</td>
                        <td className="p-3 text-slate-500">{it.type || 'Task'}</td>
                        <td className="p-3 text-right font-mono text-slate-600">{formatCurrency(itemAmount)}</td>
                        <td className="p-3 text-right font-mono text-slate-400">
                          {itemDiscount > 0 ? `-${formatCurrency(itemDiscount)}` : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{formatCurrency(itemNet)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400 italic">No line items listed.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Calculations Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            <div className="space-y-3 max-w-xs text-xs">
              {invoice.remarks && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-700 block mb-1">Remarks / Terms:</span>
                  <p className="text-slate-600 italic leading-relaxed">&quot;{invoice.remarks}&quot;</p>
                </div>
              )}

              {invoice.stripe_url && (
                <div className="text-xs print:hidden">
                  <span className="font-semibold text-slate-700 block mb-1">Payment Link:</span>
                  <a 
                    href={invoice.stripe_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-emerald-700 hover:underline break-all"
                  >
                    {invoice.stripe_url}
                  </a>
                </div>
              )}
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-medium text-slate-800">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Discount:</span>
                  <span className="font-mono">-{formatCurrency(discount)}</span>
                </div>
              )}
              {isGst && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (9%):</span>
                    <span className="font-mono text-slate-800">{formatCurrency(cgst)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (9%):</span>
                    <span className="font-mono text-slate-800">{formatCurrency(sgst)}</span>
                  </div>
                </>
              )}
              {roundOff !== 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Round Off:</span>
                  <span className="font-mono">{formatCurrency(roundOff)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2.5 flex justify-between text-sm font-bold text-slate-900">
                <span>Total Amount:</span>
                <span className="text-base font-mono text-emerald-700">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="border-t border-slate-100 pt-4 text-center text-[10px] text-slate-400">
            This is a computer-generated tax invoice. Thank you for your business.
          </div>

        </div>
      </div>
    </div>
  );
}
