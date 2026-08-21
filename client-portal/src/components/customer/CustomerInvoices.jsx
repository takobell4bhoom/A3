import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, CheckCircle, ExternalLink, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/dateUtils';
import InvoicePreviewModal from '../admin/InvoiceBuilder/InvoicePreviewModal';

export default function CustomerInvoices({ invoices = [], loading = false, firmName = 'Tax Shield Advisor' }) {
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                <Receipt className="w-5 h-5 text-slate-700" /> Invoices &amp; Statements
              </CardTitle>
              <CardDescription className="text-xs">
                Review itemized tax advisory billing requests, view official tax invoices, and pay securely.
              </CardDescription>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              INR (₹)
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-400">Loading invoices...</p>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No invoices yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Your tax advisor has not issued any invoices for your account.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((inv) => {
                const totalAmount = inv.total_cents ? inv.total_cents / 100 : Number(inv.amount || 0);

                return (
                  <div key={inv.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">
                          {inv.billing_entity || 'Tax Services'}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{inv.invoice_no || 'Invoice'}</h4>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Due Date</p>
                        <p className="text-xs font-semibold text-slate-700">
                          {inv.due_date ? formatDate(inv.due_date) : 'Upon Receipt'}
                        </p>
                      </div>
                    </div>

                    {inv.items && Array.isArray(inv.items) && inv.items.length > 0 && (
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                        {inv.items.map((it, idx) => {
                          const itemTotal = (parseFloat(it.amount) || 0) - (parseFloat(it.discount) || 0);
                          return (
                            <div key={idx} className="flex justify-between text-slate-600">
                              <span>{it.particulars || 'Service Item'}</span>
                              <span className="font-medium text-slate-800 font-mono">{formatCurrency(itemTotal)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {inv.remarks && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                        &quot;{inv.remarks}&quot;
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-xs text-slate-400">Total Payable</p>
                        <p className="text-xl font-bold text-slate-900 font-mono">{formatCurrency(totalAmount)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Printable Tax Invoice */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoice(inv)}
                          className="text-xs h-9 px-3 gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" /> View Invoice
                        </Button>

                        {inv.status === 'paid' ? (
                          <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Paid
                          </span>
                        ) : inv.stripe_url ? (
                          <a href={inv.stripe_url} target="_blank" rel="noreferrer">
                            <Button variant="accent" size="sm" className="gap-1 px-4 h-9">
                              Pay Now <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Payment link pending</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Printable Tax Invoice Modal */}
      {selectedInvoice && (
        <InvoicePreviewModal
          isOpen={Boolean(selectedInvoice)}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
          client={null}
          firmName={firmName}
        />
      )}
    </div>
  );
}
