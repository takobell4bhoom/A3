/**
 * Date formatting and payment term due date utilities
 */

/**
 * Calculates due date based on issue date string and payment terms
 * @param {string} issueDateStr YYYY-MM-DD
 * @param {string} paymentTerm 'NET 15' | 'NET 30' | 'NET 60' | 'Due on Receipt'
 * @returns {string} YYYY-MM-DD
 */
export function calculateDueDate(issueDateStr, paymentTerm) {
  if (!issueDateStr) return '';
  const dateObj = new Date(issueDateStr);
  if (isNaN(dateObj.getTime())) return '';

  let daysToAdd = 30;
  if (paymentTerm === 'NET 15') daysToAdd = 15;
  else if (paymentTerm === 'NET 60') daysToAdd = 60;
  else if (paymentTerm === 'Due on Receipt') daysToAdd = 0;

  dateObj.setDate(dateObj.getDate() + daysToAdd);
  return dateObj.toISOString().split('T')[0];
}

/**
 * Formats ISO date or string to localized readable format (e.g. 'Oct 14, 2026')
 * @param {string|Date} dateVal 
 * @param {string} fallback 
 * @returns {string}
 */
export function formatDate(dateVal, fallback = '—') {
  if (!dateVal) return fallback;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
