/**
 * Safe financial calculations in integer paise/cents to avoid JavaScript floating point rounding bugs
 * Formatted for Indian Rupee (INR / ₹) with Indian numbering format (e.g., ₹1,50,000.00).
 */

/**
 * Complete directory of 36 Indian States & Union Territories with official 2-digit GST state codes
 */
export const INDIAN_STATES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

/**
 * Computes the consecutive sequential auto-increment invoice number for an organization
 * Complies with Section 31 of CGST Act (consecutive serial numbering unique per financial year).
 * Examples: INV-2026-0001 -> INV-2026-0002 -> INV-2026-0003
 * 
 * @param {Array<{ invoice_no?: string }>} existingInvoices
 * @param {string} prefix
 * @returns {string}
 */
export function getNextInvoiceNumber(existingInvoices = [], prefix = 'INV') {
  const cleanPrefix = (prefix || 'INV').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') || 'INV';
  const currentYear = new Date().getFullYear();

  let maxSeq = 0;

  if (Array.isArray(existingInvoices)) {
    for (const inv of existingInvoices) {
      if (!inv?.invoice_no) continue;
      const invNo = String(inv.invoice_no).trim().toUpperCase();

      // Match Pattern 1: {PREFIX}-{YEAR}-{SEQUENCE} (e.g. INV-2026-0001 or INV-2026-0157)
      const yearMatch = invNo.match(new RegExp(`^${cleanPrefix}[-/](${currentYear})[-/](\\d+)`));
      if (yearMatch) {
        const seq = parseInt(yearMatch[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
        continue;
      }

      // Match Pattern 2: {PREFIX}-{SEQUENCE} (e.g. INV-0001 or INV-0042)
      const simpleMatch = invNo.match(new RegExp(`^${cleanPrefix}[-/](\\d+)`));
      if (simpleMatch) {
        const seq = parseInt(simpleMatch[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const paddedSeq = String(nextSeq).padStart(4, '0');
  return `${cleanPrefix}-${currentYear}-${paddedSeq}`;
}

/**
 * Generates a fallback unique invoice number
 * @returns {string}
 */
export function generateInvoiceNumber(prefix = 'INV') {
  return getNextInvoiceNumber([], prefix);
}

/**
 * Creates an empty or default line item object
 * @param {string} particulars 
 * @param {number} amount 
 * @param {string} sacCode Default 9983 for Professional / Advisory Services
 * @returns {{ id: string, particulars: string, sac_code: string, amount: number, discount: number }}
 */
export function createInvoiceItem(particulars = 'Tax Advisory Services', amount = 0, sacCode = '9983') {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    particulars,
    sac_code: sacCode,
    amount,
    discount: 0,
  };
}

/**
 * Converts a rupee amount (e.g. 350.50 or "350.50") to integer paise (35050).
 * @param {number|string} val 
 * @returns {number}
 */
export function toCents(val) {
  if (val === null || val === undefined || val === '') return 0;
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g, '')) : val;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts integer paise (35050) to decimal rupees (350.50).
 * @param {number} cents 
 * @returns {number}
 */
export function fromCents(cents) {
  if (!cents || isNaN(cents)) return 0;
  return cents / 100;
}

/**
 * Formats integer paise or decimal rupees to Indian Rupee currency string (e.g. "₹350.50", "₹1,50,000.00").
 * @param {number} amount In rupees or paise (specify isCents)
 * @param {boolean} isCents Default is false (amount in rupees)
 * @returns {string}
 */
export function formatCurrency(amount, isCents = false) {
  const rupees = isCents ? fromCents(amount) : (Number(amount) || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Calculates complete line item and invoice totals with full Indian GST compliance:
 * - Intra-State Supply: CGST (50%) + SGST (50%)
 * - Inter-State Supply: IGST (100%)
 * - Non-GST / Exempt: 0% Tax
 * 
 * @param {Array<{ amount: number|string, discount?: number|string }>} items 
 * @param {number|string} roundOff 
 * @param {number} taxRatePercent e.g. 18 for 18% GST, 0 for Non-GST
 * @param {'intra'|'inter'|'exempt'} gstType 'intra' (CGST+SGST) | 'inter' (IGST) | 'exempt' (0%)
 * @returns {{ 
 *   subtotalCents: number, 
 *   discountCents: number, 
 *   taxableCents: number,
 *   taxCents: number,
 *   cgstCents: number,
 *   sgstCents: number,
 *   igstCents: number,
 *   roundOffCents: number, 
 *   totalCents: number, 
 *   subtotal: number, 
 *   discount: number, 
 *   taxable: number,
 *   tax: number,
 *   cgst: number,
 *   sgst: number,
 *   igst: number,
 *   roundOff: number, 
 *   total: number, 
 *   taxRate: number,
 *   gstType: 'intra'|'inter'|'exempt'
 * }}
 */
export function calculateInvoiceTotals(items = [], roundOff = 0, taxRatePercent = 0, gstType = 'intra') {
  let subtotalCents = 0;
  let discountCents = 0;

  for (const item of items) {
    const itemAmountCents = toCents(item.amount);
    const itemDiscountCents = toCents(item.discount);
    subtotalCents += itemAmountCents;
    discountCents += itemDiscountCents;
  }

  const taxableCents = Math.max(0, subtotalCents - discountCents);
  const taxRate = parseFloat(taxRatePercent) || 0;
  const isTaxable = taxRate > 0 && gstType !== 'exempt';
  
  const taxCents = isTaxable ? Math.round(taxableCents * (taxRate / 100)) : 0;
  
  let cgstCents = 0;
  let sgstCents = 0;
  let igstCents = 0;

  if (isTaxable) {
    if (gstType === 'inter') {
      // Inter-State: 100% IGST
      igstCents = taxCents;
    } else {
      // Intra-State: 50% CGST + 50% SGST
      cgstCents = Math.round(taxCents / 2);
      sgstCents = taxCents - cgstCents;
    }
  }

  const roundOffCents = toCents(roundOff);
  const totalCents = Math.max(0, taxableCents + taxCents + roundOffCents);

  return {
    subtotalCents,
    discountCents,
    taxableCents,
    taxCents,
    cgstCents,
    sgstCents,
    igstCents,
    roundOffCents,
    totalCents,
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    taxable: fromCents(taxableCents),
    tax: fromCents(taxCents),
    cgst: fromCents(cgstCents),
    sgst: fromCents(sgstCents),
    igst: fromCents(igstCents),
    roundOff: fromCents(roundOffCents),
    total: fromCents(totalCents),
    taxRate,
    gstType: isTaxable ? gstType : 'exempt',
  };
}

/**
 * Converts a numerical rupee amount into formal Indian English words.
 * Example: 4400 -> "Four Thousand Four Hundred Rupees Only"
 * @param {number|string} num 
 * @returns {string}
 */
export function numberToWords(num) {
  if (num === null || num === undefined || isNaN(Number(num))) return '';
  const n = Math.round(Number(num));
  if (n === 0) return 'Zero Rupees Only';
  if (n < 0) return 'Minus ' + numberToWords(Math.abs(n));

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(val) {
    if (val < 20) return ones[val];
    const t = Math.floor(val / 10);
    const o = val % 10;
    return tens[t] + (o ? ' ' + ones[o] : '');
  }

  function convertThreeDigits(val) {
    const h = Math.floor(val / 100);
    const rem = val % 100;
    let str = '';
    if (h > 0) str += ones[h] + ' Hundred';
    if (rem > 0) {
      if (str) str += ' ';
      str += convertTwoDigits(rem);
    }
    return str;
  }

  let words = '';
  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  if (crore > 0) {
    words += convertTwoDigits(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertTwoDigits(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertTwoDigits(thousand) + ' Thousand ';
  }
  if (rem > 0) {
    words += convertThreeDigits(rem) + ' ';
  }

  return (words.trim() + ' Rupees only.').replace(/\s+/g, ' ');
}
