import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Building2, Printer, X } from 'lucide-react';
import { formatCurrency, numberToWords } from '@/lib/currency';
import { useAuth } from '@/context/AuthContext';

function formatInvoiceDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  invoice,
  client,
  organization: propOrg,
  firmName = 'Tax Shield Advisor',
}) {
  const { organization: authOrg } = useAuth();
  const organization = propOrg || invoice?.organization || authOrg;

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const activeCompanyName = organization?.name || firmName;
  const companyGstin = organization?.gstin;
  const companyPan = organization?.pan;

  const totalAmount = invoice.total_cents ? invoice.total_cents / 100 : Number(invoice.amount || 0);
  const subtotal = invoice.subtotal_cents ? invoice.subtotal_cents / 100 : Number(invoice.subtotal || totalAmount);
  const discount = invoice.discount_cents ? invoice.discount_cents / 100 : Number(invoice.discount_total || 0);
  const roundOff = invoice.round_off_cents ? invoice.round_off_cents / 100 : Number(invoice.round_off || 0);

  const isExplicitNonGst = invoice.billing_entity && (invoice.billing_entity.includes('Non GST') || invoice.billing_entity.includes('0%'));
  const gstRateMatch = invoice.billing_entity?.match(/(\d+(\.\d+)?)%/);
  const parsedGstRate = isExplicitNonGst 
    ? 0 
    : Number(invoice.tax_rate ?? (gstRateMatch ? gstRateMatch[1] : (invoice.billing_entity?.includes('GST') ? 18 : 0)));

  const isGst = parsedGstRate > 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const gstAmount = isGst ? Math.round(taxableAmount * (parsedGstRate / 100) * 100) / 100 : 0;
  const cgst = isGst ? Math.round((gstAmount / 2) * 100) / 100 : 0;
  const sgst = isGst ? Math.round((gstAmount - cgst) * 100) / 100 : 0;
  const halfRate = parsedGstRate / 2;

  const clientEmail = client?.email || invoice.client_email || invoice.user?.email || '';
  const clientName = client?.full_name || invoice.client_name || invoice.user?.full_name || clientEmail || 'Client';

  const amountInWords = numberToWords(totalAmount);

  const upiId = organization?.upi_id;
  const upiQrUrl = upiId 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=2&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(activeCompanyName)}&am=${totalAmount.toFixed(2)}&cu=INR`)}`
    : null;

  return createPortal(
    <div className="print-invoice-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto print:static print:block print:p-0 print:m-0 print:bg-white print:overflow-visible">
      <div 
        className="print-invoice-card w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 my-8 print:static print:w-full print:max-w-none print:m-0 print:p-0 print:border-none print:shadow-none print:rounded-none"
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
              className="text-xs h-8 gap-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
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
        <div className="print-invoice-sheet p-8 sm:p-10 space-y-5 bg-white text-slate-950 font-sans print:p-0 print:space-y-3.5">
          
          {/* Top Row: Left Brand/Company Info & Right Big "Invoice" Title */}
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-0.5 max-w-md">
              {organization?.logo_url ? (
                <div className="mb-2">
                  <img
                    src={organization.logo_url}
                    alt={activeCompanyName}
                    className="max-h-12 max-w-[180px] object-contain rounded print:max-h-12 print:max-w-[180px]"
                  />
                </div>
              ) : (
                <div className="mb-2">
                  <img
                    src="/taxshield-logo.jpg"
                    alt={firmName || 'Taxshield Advisor'}
                    className="max-h-11 max-w-[170px] object-contain rounded print:max-h-11 print:max-w-[170px]"
                  />
                </div>
              )}

              <h2 className="text-sm sm:text-base font-extrabold text-slate-950 uppercase tracking-tight leading-tight">
                {activeCompanyName}
              </h2>
              
              {organization?.address && (
                <p className="text-xs text-slate-700 leading-tight">
                  {organization.address}
                </p>
              )}
              {(organization?.city || organization?.state || organization?.pincode) && (
                <p className="text-xs text-slate-700 leading-tight">
                  {[organization.city, organization.state, organization.pincode].filter(Boolean).join(', ')}
                </p>
              )}
              
              {organization?.contact_phone && (
                <p className="text-xs text-slate-900 font-semibold pt-0.5">
                  <span className="font-bold">Mobile:</span> {organization.contact_phone}
                </p>
              )}
              {organization?.contact_email && (
                <p className="text-xs text-slate-900 font-semibold">
                  <span className="font-bold">Email:</span> {organization.contact_email}
                </p>
              )}
              {companyGstin && (
                <p className="text-xs text-slate-900 font-semibold font-mono">
                  <span className="font-bold font-sans">GSTIN:</span> {companyGstin}
                </p>
              )}
              {companyPan && (
                <p className="text-xs text-slate-900 font-semibold font-mono">
                  <span className="font-bold font-sans">PAN:</span> {companyPan}
                </p>
              )}
            </div>

            <div className="text-right shrink-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
                Invoice
              </h1>
            </div>
          </div>

          {/* Metadata Section: To (Client) & Invoice Metadata (No, Date, Due Date) */}
          <div className="flex justify-between items-start gap-4 pt-1">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-700">To:</span>
              <h3 className="text-sm font-bold text-slate-950">{clientName}</h3>
              {clientEmail && <p className="text-xs text-slate-600 font-mono">{clientEmail}</p>}
              {client?.address && <p className="text-xs text-slate-600">{client.address}</p>}
            </div>

            <div className="text-xs space-y-1 text-right shrink-0">
              <div className="flex justify-end gap-3">
                <span className="font-semibold text-slate-700 min-w-[85px] text-left">Invoice No.:</span>
                <span className="font-bold text-slate-950 font-mono text-right min-w-[85px]">{invoice.invoice_no || '0157'}</span>
              </div>
              <div className="flex justify-end gap-3">
                <span className="font-semibold text-slate-700 min-w-[85px] text-left">Invoice Date:</span>
                <span className="font-medium text-slate-900 text-right min-w-[85px]">{formatInvoiceDate(invoice.issue_date)}</span>
              </div>
              <div className="flex justify-end gap-3">
                <span className="font-semibold text-slate-700 min-w-[85px] text-left">Due Date:</span>
                <span className="font-medium text-slate-900 text-right min-w-[85px]">{invoice.due_date ? formatInvoiceDate(invoice.due_date) : 'Upon Receipt'}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="pt-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-y border-slate-300 font-bold text-[11px] uppercase tracking-wider text-slate-900">
                  <th className="py-2 px-2 text-left">DESCRIPTION</th>
                  <th className="py-2 px-2 text-right w-28">PRICE</th>
                  <th className="py-2 px-2 text-right w-24">DISCOUNT</th>
                  <th className="py-2 px-2 text-right w-28">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0 ? (
                  invoice.items.map((it, idx) => {
                    const itemAmount = parseFloat(it.amount) || 0;
                    const itemDiscount = parseFloat(it.discount) || 0;
                    const itemNet = Math.max(0, itemAmount - itemDiscount);

                    return (
                      <tr key={idx}>
                        <td className="py-2 px-2 font-medium text-slate-900">{it.particulars || 'Service Item'}</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-900">{formatCurrency(itemAmount)}</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-700">{itemDiscount > 0 ? formatCurrency(itemDiscount) : '₹0.00'}</td>
                        <td className="py-2 px-2 text-right font-mono font-semibold text-slate-950">{formatCurrency(itemNet)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-3 px-2 text-center text-slate-400 italic">No line items listed.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="border-b border-slate-300" />
          </div>

          {/* Amount in Words & QR Code Box (Left) + Financial Breakdown (Right) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1 items-start">
            
            {/* Left Column: Words & UPI Box */}
            <div className="space-y-2.5">
              {amountInWords && (
                <p className="text-xs font-semibold text-slate-950 capitalize">
                  {amountInWords}
                </p>
              )}

              {/* UPI & QR Code Box */}
              {organization?.upi_id && (
                <div className="border border-slate-300 rounded-lg p-2.5 flex items-center justify-between gap-3 bg-white">
                  <div className="space-y-0.5">
                    <p className="font-bold text-[11px] text-slate-950 leading-tight">
                      Scan QR code to pay using any UPI app.
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium pt-0.5">UPI ID</p>
                    <p className="font-bold text-xs font-mono text-slate-950">{organization.upi_id}</p>
                  </div>

                  {upiQrUrl && (
                    <div className="shrink-0 bg-white p-1 rounded border border-slate-200">
                      <img
                        src={upiQrUrl}
                        alt="UPI QR Code"
                        className="w-16 h-16 object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Financial Breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Subtotal:</span>
                <span className="font-mono font-medium text-slate-950">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Discount:</span>
                  <span className="font-mono font-medium text-slate-950">{formatCurrency(discount)}</span>
                </div>
              )}
              {isGst && (
                <>
                  <div className="flex justify-between text-slate-700">
                    <span>CGST ({halfRate}%):</span>
                    <span className="font-mono font-medium text-slate-950">{formatCurrency(cgst)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>SGST ({halfRate}%):</span>
                    <span className="font-mono font-medium text-slate-950">{formatCurrency(sgst)}</span>
                  </div>
                </>
              )}
              {roundOff !== 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Round off:</span>
                  <span className="font-mono font-medium text-slate-950">{formatCurrency(roundOff)}</span>
                </div>
              )}
              
              <div className="flex justify-between border-y border-slate-300 py-1.5 font-bold text-sm text-slate-950">
                <span>Total:</span>
                <span className="font-mono font-extrabold">{formatCurrency(totalAmount)}</span>
              </div>

              <div className="flex justify-between text-slate-700 pt-0.5">
                <span>Received:</span>
                <span className="font-mono font-medium text-slate-950">{invoice.status === 'paid' ? formatCurrency(totalAmount) : '₹0.00'}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Balance:</span>
                <span className="font-mono font-bold text-slate-950">{invoice.status === 'paid' ? '₹0.00' : formatCurrency(totalAmount)}</span>
              </div>
            </div>

          </div>

          {/* Bottom Section: Terms & Conditions, Bank Details, and Authorized Signatory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-slate-200">
            
            {/* Left Column: Terms & Bank Details */}
            <div className="space-y-3 text-[11px] text-slate-800">
              
              {/* Terms & Condition */}
              <div>
                <h4 className="font-bold uppercase text-[10px] text-slate-950 tracking-wider mb-0.5">
                  TERMS &amp; CONDITION:
                </h4>
                {invoice.remarks ? (
                  <p className="text-slate-700 leading-tight whitespace-pre-line">{invoice.remarks}</p>
                ) : (
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-700 leading-tight text-[10px]">
                    <li>This quotation is valid for 30 days from the date issued; prices and terms may change thereafter.</li>
                    <li>Fees mentioned cover all the specified services; government fees, taxes, and extra work will be charged separately.</li>
                    <li>A minimum 50% advance is required to start work; remaining payment must be cleared as per agreed milestones.</li>
                    <li>All timelines depend on timely submission of documents and processing; delays beyond our control are not our responsibility.</li>
                  </ol>
                )}
              </div>

              {/* Bank Details */}
              {(organization?.bank_name || organization?.bank_account_number) && (
                <div>
                  <h4 className="font-bold uppercase text-[10px] text-slate-950 tracking-wider mb-0.5">
                    BANK DETAILS:
                  </h4>
                  <div className="space-y-0.5 font-bold uppercase text-[10.5px] text-slate-900">
                    {organization.bank_name && <p>BANK: {organization.bank_name}</p>}
                    {organization.bank_account_number && <p>ACCOUNT: {organization.bank_account_number}</p>}
                    {organization.bank_ifsc && <p>IFSC CODE: {organization.bank_ifsc}</p>}
                    {organization.bank_branch && <p>BRANCH: {organization.bank_branch}</p>}
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Authorized Signatory */}
            <div className="flex flex-col justify-between items-end text-right">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 uppercase">
                  For {activeCompanyName}
                </p>
              </div>

              <div className="pt-4 text-center space-y-0.5">
                <div className="font-serif italic text-base text-slate-800 tracking-wide select-none opacity-80">
                  {organization?.contact_email ? organization.contact_email.split('@')[0] : 'Authorized'}
                </div>
                <div className="border-t border-slate-400 w-36 mx-auto pt-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-700 block">
                    AUTHORIZED SIGNATORY
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
