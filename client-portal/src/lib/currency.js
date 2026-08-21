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
    type: 'Task',
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
