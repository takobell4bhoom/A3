import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, Loader2, Search, ArrowLeft, Check } from 'lucide-react';
import InvoiceItemsTable from './InvoiceItemsTable';
import { calculateInvoiceTotals, formatCurrency, generateInvoiceNumber, createInvoiceItem } from '@/lib/currency';
import { calculateDueDate } from '@/lib/dateUtils';
import { useToast } from '@/components/ui/toast';

export default function InvoiceBuilder({
  customers = [],
  selectedCustomer,
  onSelectCustomer,
  onCreateInvoice,
  onBackToList,
  organization,
  savingInvoice = false,
}) {
  const [targetCustomerId, setTargetCustomerId] = useState(selectedCustomer?.id || '');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  const [gstRate, setGstRate] = useState(18); // Editable GST Tax Rate (e.g. 0, 5, 12, 18, 28)
  const [invoiceNo, setInvoiceNo] = useState(() => {
    const prefix = organization?.invoice_prefix || 'INV';
    return `${prefix}-${Date.now().toString().slice(-6)}`;
  });
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentTerm, setPaymentTerm] = useState('NET 30');
  const [customDueDate, setCustomDueDate] = useState('');
  const [remarks, setRemarks] = useState(() => organization?.invoice_notes || '');
  const [stripeUrl, setStripeUrl] = useState('');
  const [roundOff, setRoundOff] = useState(0);

  const [items, setItems] = useState(() => [
    createInvoiceItem('Tax Advisory Services', 5000)
  ]);

  const toast = useToast();

  // Selected client resolution
  const activeClient = useMemo(() => {
    return customers.find(c => c.id === targetCustomerId) || selectedCustomer || null;
  }, [customers, targetCustomerId, selectedCustomer]);

  // Filtered clients for the dropdown search
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return customers;
    const q = clientSearchQuery.toLowerCase().trim();
    return customers.filter(
      c => (c.email && c.email.toLowerCase().includes(q)) || (c.full_name && c.full_name.toLowerCase().includes(q))
    );
  }, [customers, clientSearchQuery]);

  // Compute Due Date derived from Issue Date and Payment Term
  const dueDate = customDueDate || calculateDueDate(issueDate, paymentTerm);

  // Dynamic Editable GST Rate
  const numericGstRate = Math.max(0, parseFloat(gstRate) || 0);
  const isGst = numericGstRate > 0;
  const billingEntity = isGst ? `GST Billing (${numericGstRate}%)` : 'Non GST Billing';

  // Safe Financial Totals in Paise/Rupees with dynamic GST
  const totals = calculateInvoiceTotals(items, roundOff, numericGstRate);

  // Invoice Line Item Handlers
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      createInvoiceItem('', 0)
    ]);
  };

  const handleRemoveItem = (id) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeClient) {
      toast.error('Missing Client', 'Please search and select a client for this invoice.');
      return;
    }

    const invoicePayload = {
      user_id: activeClient.id,
      invoice_no: invoiceNo,
      billing_entity: billingEntity,
      payment_term: paymentTerm,
      issue_date: issueDate,
      due_date: dueDate,
      remarks: remarks.trim() || undefined,
      subtotal_cents: totals.subtotalCents,
      discount_cents: totals.discountCents,
      round_off_cents: totals.roundOffCents,
      total_cents: totals.totalCents,
      amount: totals.total, // In decimal Rupees
      stripe_url: stripeUrl.trim() || undefined,
      items: items,
      status: 'unpaid',
    };

    const success = await onCreateInvoice(invoicePayload);
    if (success) {
      setInvoiceNo(generateInvoiceNumber());
      setRemarks('');
      setStripeUrl('');
      setCustomDueDate('');
      setRoundOff(0);
      setItems([createInvoiceItem('Tax Advisory Services', 0)]);
      if (onBackToList) onBackToList();
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToList && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBackToList}
                className="h-8 px-2 text-xs gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
              </Button>
            )}
            <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
              <Receipt className="w-5 h-5 text-emerald-600" /> Issue New Tax Invoice
            </CardTitle>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
            Currency: INR (₹)
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Client Search & Billing Entity */}
            <div className="space-y-4">
              {/* Searchable Client Selector */}
              <div className="relative">
                <Label className="text-xs font-semibold text-slate-700">Target Client <span className="text-red-500">*</span></Label>
                
                <div className="mt-1">
                  <div
                    onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 flex items-center justify-between text-xs cursor-pointer hover:border-slate-400 transition-colors"
                  >
                    {activeClient ? (
                      <span className="font-semibold text-slate-800 truncate">
                        {activeClient.full_name ? `${activeClient.full_name} (${activeClient.email})` : activeClient.email}
                      </span>
                    ) : (
                      <span className="text-slate-400">Select or search client...</span>
                    )}
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                  </div>

                  {/* Dropdown Menu */}
                  {isClientDropdownOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl p-2 space-y-1.5 animate-in fade-in duration-150 max-h-60 overflow-y-auto">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="text"
                          placeholder="Type name or email to filter..."
                          value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          className="h-8 text-xs pl-8 pr-2 bg-slate-50"
                          autoFocus
                        />
                      </div>

                      <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                        {filteredClients.length === 0 ? (
                          <p className="p-3 text-xs text-slate-400 text-center italic">No matching clients</p>
                        ) : (
                          filteredClients.map((client) => {
                            const isSelected = activeClient?.id === client.id;
                            return (
                              <button
                                key={client.id}
                                type="button"
                                onClick={() => {
                                  setTargetCustomerId(client.id);
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
              </div>

              {/* Editable GST Tax Rate Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-800">
                    GST Tax Rate (%) <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                    {numericGstRate > 0 ? `CGST ${(numericGstRate / 2)}% + SGST ${(numericGstRate / 2)}%` : 'Exempt / Non-GST'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-28">
                    <Input 
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={gstRate}
                      onChange={(e) => setGstRate(e.target.value)}
                      className="h-8 text-xs font-mono font-bold bg-white text-slate-900 pr-7"
                      placeholder="0.0"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      %
                    </span>
                  </div>

                  {/* Preset Quick Select Pills */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {[0, 5, 12, 18, 28].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setGstRate(rate)}
                        className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                          numericGstRate === rate
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {rate === 0 ? '0% (Non-GST)' : `${rate}%`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Dates & Terms */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Issue Date <span className="text-red-500">*</span></Label>
                  <Input 
                    type="date" 
                    value={issueDate} 
                    onChange={(e) => setIssueDate(e.target.value)} 
                    className="h-9 text-xs mt-1" 
                    required 
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Invoice No. <span className="text-red-500">*</span></Label>
                  <Input 
                    value={invoiceNo} 
                    onChange={(e) => setInvoiceNo(e.target.value)} 
                    required 
                    className="h-9 text-xs mt-1 font-mono bg-slate-50 font-bold text-slate-800" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Payment Term <span className="text-red-500">*</span></Label>
                  <select 
                    value={paymentTerm} 
                    onChange={(e) => {
                      setPaymentTerm(e.target.value);
                      setCustomDueDate('');
                    }}
                    className="w-full h-9 mt-1 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="NET 30">NET 30 (30 Days)</option>
                    <option value="NET 15">NET 15 (15 Days)</option>
                    <option value="NET 60">NET 60 (60 Days)</option>
                    <option value="Due on Receipt">Due on Receipt (Immediate)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Due Date <span className="text-red-500">*</span></Label>
                  <Input 
                    type="date" 
                    value={dueDate} 
                    onChange={(e) => setCustomDueDate(e.target.value)} 
                    className="h-9 text-xs mt-1 bg-slate-50 font-medium" 
                    required 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table in ₹ */}
          <InvoiceItemsTable
            items={items}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onItemChange={handleItemChange}
          />

          {/* Bottom Calculations & Payment Link */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 items-start">
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Remarks / Terms Notes</Label>
                <textarea 
                  rows={3} 
                  placeholder="e.g. Please make payment via UPI or net banking within due date." 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full mt-1 p-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">UPI / Stripe Payment Link (Optional)</Label>
                  <span className="text-[10px] text-slate-400">Shareable with client</span>
                </div>
                <Input 
                  type="text" 
                  placeholder="https://buy.stripe.com/... or UPI ID: name@upi" 
                  value={stripeUrl} 
                  onChange={(e) => setStripeUrl(e.target.value)} 
                  className="h-9 text-xs mt-1 font-mono" 
                />
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900 font-mono">{formatCurrency(totals.subtotal)}</span>
              </div>

              {totals.discount > 0 && (
                <div className="flex justify-between items-center text-slate-500">
                  <span>Discount</span>
                  <span className="font-mono">-{formatCurrency(totals.discount)}</span>
                </div>
              )}

              {isGst ? (
                <>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>CGST ({(numericGstRate / 2)}%)</span>
                    <span className="font-mono">{formatCurrency(totals.cgst)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>SGST ({(numericGstRate / 2)}%)</span>
                    <span className="font-mono">{formatCurrency(totals.sgst)}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-800 font-semibold border-t border-slate-200/60 pt-1">
                    <span>Total GST ({numericGstRate}%)</span>
                    <span className="font-mono">{formatCurrency(totals.tax)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-slate-400 italic">
                  <span>GST (0% Non-GST)</span>
                  <span className="font-mono">₹0.00</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>Round Off (₹)</span>
                <input 
                  type="number" 
                  step="0.01" 
                  value={roundOff} 
                  onChange={(e) => setRoundOff(e.target.value)} 
                  className="w-20 h-7 text-right text-xs border border-slate-200 rounded px-1.5 bg-white font-mono" 
                />
              </div>

              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-bold text-slate-900">
                <span>Total Amount</span>
                <span className="text-base text-emerald-700 font-mono">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Button 
              type="submit" 
              variant="accent" 
              disabled={savingInvoice || !activeClient} 
              className="w-full sm:w-auto px-8 font-semibold"
            >
              {savingInvoice ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing &amp; Delivering Invoice...
                </>
              ) : (
                "Save & Dispatch Invoice"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
