/**
 * Safe financial calculations in integer paise/cents to avoid JavaScript floating point rounding bugs
 * Formatted for Indian Rupee (INR / ₹) with Indian numbering format (e.g., ₹1,50,000.00).
 */

/**
 * Generates a unique invoice number with timestamp & random sequence
 * @returns {string}
 */
export function generateInvoiceNumber() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${rand}`;
}

/**
 * Creates an empty or default line item object
 * @param {string} particulars 
 * @param {number} amount 
 * @returns {{ id: string, particulars: string, type: string, amount: number, discount: number }}
 */
export function createInvoiceItem(particulars = 'Tax Advisory Services', amount = 0) {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    particulars,
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
 * Calculates complete line item and invoice totals safely with optional GST tax calculation.
 * @param {Array<{ amount: number|string, discount?: number|string }>} items 
 * @param {number|string} roundOff 
 * @param {number} taxRatePercent e.g. 18 for 18% GST, 0 for Non-GST
 * @returns {{ 
 *   subtotalCents: number, 
 *   discountCents: number, 
 *   taxableCents: number,
 *   taxCents: number,
 *   cgstCents: number,
 *   sgstCents: number,
 *   roundOffCents: number, 
 *   totalCents: number, 
 *   subtotal: number, 
 *   discount: number, 
 *   taxable: number,
 *   tax: number,
 *   cgst: number,
 *   sgst: number,
 *   roundOff: number, 
 *   total: number,
 *   taxRate: number
 * }}
 */
export function calculateInvoiceTotals(items = [], roundOff = 0, taxRatePercent = 0) {
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
  const taxCents = taxRate > 0 ? Math.round(taxableCents * (taxRate / 100)) : 0;
  const cgstCents = taxRate > 0 ? Math.round(taxCents / 2) : 0;
  const sgstCents = taxRate > 0 ? taxCents - cgstCents : 0;

  const roundOffCents = toCents(roundOff);
  const totalCents = Math.max(0, taxableCents + taxCents + roundOffCents);

  return {
    subtotalCents,
    discountCents,
    taxableCents,
    taxCents,
    cgstCents,
    sgstCents,
    roundOffCents,
    totalCents,
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    taxable: fromCents(taxableCents),
    tax: fromCents(taxCents),
    cgst: fromCents(cgstCents),
    sgst: fromCents(sgstCents),
    roundOff: fromCents(roundOffCents),
    total: fromCents(totalCents),
    taxRate,
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
