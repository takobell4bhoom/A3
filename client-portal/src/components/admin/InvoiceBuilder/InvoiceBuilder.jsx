import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, Loader2, Search, ArrowLeft, Check, Sparkles } from 'lucide-react';
import InvoiceItemsTable from './InvoiceItemsTable';
import { 
  calculateInvoiceTotals, 
  formatCurrency, 
  getNextInvoiceNumber, 
  createInvoiceItem,
  INDIAN_STATES 
} from '@/lib/currency';
import { calculateDueDate } from '@/lib/dateUtils';
import { useToast } from '@/components/ui/toast';

function detectGstAndPos(client, organization) {
  if (!client) return null;
  const clientAddress = (client.address || '').toLowerCase();
  const orgState = (organization?.state || '').toLowerCase();

  for (const st of INDIAN_STATES) {
    if (clientAddress.includes(st.name.toLowerCase()) || clientAddress.includes(st.code)) {
      const pos = `${st.code} - ${st.name}`;
      const type = (orgState && !orgState.includes(st.name.toLowerCase())) ? 'inter' : 'intra';
      return { pos, type };
    }
  }
  return null;
}

export default function InvoiceBuilder({
  customers = [],
  existingInvoices = [],
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

  // Enterprise GST Tax Mode: 'intra' (CGST+SGST) | 'inter' (IGST) | 'exempt' (0%)
  const [gstType, setGstType] = useState(() => {
    const detected = detectGstAndPos(selectedCustomer, organization);
    return detected?.type || 'intra';
  });
  const [gstRate, setGstRate] = useState(18); // Editable GST Tax Rate (e.g. 0, 5, 12, 18, 28)
  const [placeOfSupply, setPlaceOfSupply] = useState(() => {
    const detected = detectGstAndPos(selectedCustomer, organization);
    if (detected?.pos) return detected.pos;
    return organization?.state ? `${organization.state}` : '27 - Maharashtra';
  });
  const [isRcm, setIsRcm] = useState(false); // Reverse Charge Mechanism

  // Auto-Increment Sequential Invoice Number
  const [invoiceNo, setInvoiceNo] = useState(() => {
    return getNextInvoiceNumber(existingInvoices, organization?.invoice_prefix || 'INV');
  });

  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentTerm, setPaymentTerm] = useState('NET 30');
  const [customDueDate, setCustomDueDate] = useState('');
  const [remarks, setRemarks] = useState(() => organization?.invoice_notes || '');
  const [stripeUrl, setStripeUrl] = useState('');
  const [roundOff, setRoundOff] = useState(0);

  const [items, setItems] = useState(() => [
    createInvoiceItem('Tax Advisory & Compliance Services', 5000, '9983')
  ]);

  const toast = useToast();

  // Selected client resolution
  const activeClient = useMemo(() => {
    return customers.find(c => c.id === targetCustomerId) || selectedCustomer || null;
  }, [customers, targetCustomerId, selectedCustomer]);

  const handleSelectClient = (client) => {
    setTargetCustomerId(client.id);
    if (onSelectCustomer) onSelectCustomer(client);
    setIsClientDropdownOpen(false);
    setClientSearchQuery('');

    const detected = detectGstAndPos(client, organization);
    if (detected) {
      if (detected.pos) setPlaceOfSupply(detected.pos);
      if (detected.type) setGstType(detected.type);
    }
  };

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
  const numericGstRate = gstType === 'exempt' ? 0 : Math.max(0, parseFloat(gstRate) || 0);
  const isGst = numericGstRate > 0 && gstType !== 'exempt';
  const billingEntity = isGst 
    ? (gstType === 'inter' ? `IGST Billing (${numericGstRate}%)` : `GST Billing (${numericGstRate}%)`)
    : 'Non GST / Exempt Billing';

  // Safe Financial Totals in Paise/Rupees with full Indian GST compliance (CGST+SGST vs IGST)
  const totals = calculateInvoiceTotals(items, roundOff, numericGstRate, gstType);

  // Invoice Line Item Handlers
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      createInvoiceItem('', 0, '9983')
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

    // Enrich items array so JSONB preserves full GST details on any database schema
    const enrichedItems = items.map(item => ({
      ...item,
      sac_code: item.sac_code || '9983',
      gst_type: gstType,
      gst_rate: numericGstRate,
      place_of_supply: placeOfSupply,
      is_rcm: isRcm,
      cgst_amount: totals.cgst,
      sgst_amount: totals.sgst,
      igst_amount: totals.igst,
      tax_amount: totals.tax,
    }));

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
      items: enrichedItems,
      status: 'unpaid',
      // Enterprise GST Metadata
      gst_type: gstType,
      gst_rate: numericGstRate,
      tax_amount: totals.tax,
      cgst_amount: totals.cgst,
      sgst_amount: totals.sgst,
      igst_amount: totals.igst,
      place_of_supply: placeOfSupply,
      is_rcm: isRcm,
    };

    const success = await onCreateInvoice(invoicePayload);
    if (success) {
      // Auto-increment sequence for next invoice
      const updatedInvoicesList = [...existingInvoices, { invoice_no: invoiceNo }];
      setInvoiceNo(getNextInvoiceNumber(updatedInvoicesList, organization?.invoice_prefix || 'INV'));
      setRemarks('');
      setStripeUrl('');
      setCustomDueDate('');
      setRoundOff(0);
      setItems([createInvoiceItem('Tax Advisory & Compliance Services', 0, '9983')]);
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
              <Receipt className="w-5 h-5 text-emerald-600" /> Issue Enterprise GST Tax Invoice
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
            
            {/* Left Column: Client Search & GST Configuration */}
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
                                onClick={() => handleSelectClient(client)}
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

              {/* Enterprise GST Tax Mode Selector */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-800">
                    Tax Structure &amp; GST Type <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                    {gstType === 'exempt'
                      ? '0% (Non-GST / Exempt)'
                      : gstType === 'inter'
                        ? `IGST (${numericGstRate}%)`
                        : `CGST ${(numericGstRate / 2)}% + SGST ${(numericGstRate / 2)}%`}
                  </span>
                </div>

                {/* Segmented GST Mode Pills */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/70 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setGstType('intra');
                      if (numericGstRate === 0) setGstRate(18);
                    }}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-md transition-all text-center ${
                      gstType === 'intra'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Intra-State (CGST+SGST)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGstType('inter');
                      if (numericGstRate === 0) setGstRate(18);
                    }}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-md transition-all text-center ${
                      gstType === 'inter'
                        ? 'bg-white text-blue-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Inter-State (IGST)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGstType('exempt');
                      setGstRate(0);
                    }}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-md transition-all text-center ${
                      gstType === 'exempt'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Non-GST / Exempt
                  </button>
                </div>

                {/* GST Rate Percentage & Quick Select (Visible when not exempt) */}
                {gstType !== 'exempt' && (
                  <div className="space-y-2 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-slate-700">GST Rate (%)</Label>
                      <span className="text-[10px] text-slate-500 font-medium">Standard Indian Slabs</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-24">
                        <Input 
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          value={gstRate}
                          onChange={(e) => setGstRate(e.target.value)}
                          className="h-8 text-xs font-mono font-bold bg-white text-slate-900 pr-7"
                          placeholder="18"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          %
                        </span>
                      </div>

                      {/* Preset Quick Select Pills */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {[5, 12, 18, 28].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setGstRate(rate)}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                              numericGstRate === rate
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {rate}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Place of Supply (POS) & RCM Declaration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-200/60">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Place of Supply (POS)
                    </Label>
                    <select
                      value={placeOfSupply}
                      onChange={(e) => {
                        const selectedState = e.target.value;
                        setPlaceOfSupply(selectedState);
                        const orgState = (organization?.state || '').toLowerCase();
                        if (orgState && !orgState.includes(selectedState.split('-')[1]?.trim().toLowerCase())) {
                          setGstType('inter');
                        }
                      }}
                      className="w-full h-8 mt-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st.code} value={`${st.code} - ${st.name}`}>
                          {st.code} - {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Reverse Charge (RCM)
                    </Label>
                    <select
                      value={isRcm ? 'yes' : 'no'}
                      onChange={(e) => setIsRcm(e.target.value === 'yes')}
                      className="w-full h-8 mt-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="no">No (Standard Tax Supply)</option>
                      <option value="yes">Yes (Tax Payable by Recipient)</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Column: Dates & Auto-Increment Sequence */}
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
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">Invoice No. <span className="text-red-500">*</span></Label>
                    <span className="text-[9px] text-emerald-700 font-bold flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> Auto-Seq
                    </span>
                  </div>
                  <Input 
                    value={invoiceNo} 
                    onChange={(e) => setInvoiceNo(e.target.value)} 
                    required 
                    className="h-9 text-xs mt-1 font-mono bg-slate-50 font-bold text-slate-800" 
                    title="Consecutive sequential invoice number"
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

          {/* Line Items Table with SAC / HSN in ₹ */}
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
                  {gstType === 'inter' ? (
                    <div className="flex justify-between items-center text-blue-800 font-medium">
                      <span>IGST ({numericGstRate}%) [Inter-State]</span>
                      <span className="font-mono font-semibold">{formatCurrency(totals.igst)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>CGST ({(numericGstRate / 2)}%) [Central Tax]</span>
                        <span className="font-mono">{formatCurrency(totals.cgst)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>SGST ({(numericGstRate / 2)}%) [State Tax]</span>
                        <span className="font-mono">{formatCurrency(totals.sgst)}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-800 font-semibold border-t border-slate-200/60 pt-1">
                        <span>Total GST ({numericGstRate}%)</span>
                        <span className="font-mono">{formatCurrency(totals.tax)}</span>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex justify-between items-center text-slate-400 italic">
                  <span>GST (0% Non-GST / Exempt)</span>
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
