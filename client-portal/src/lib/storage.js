import { supabase } from '../supabaseClient';

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/csv',
  'text/plain',
];

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

/**
 * Validates a file before upload
 * @param {File} file 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File size exceeds maximum limit of 500MB.' };
  }

  // Check extension as secondary fallback
  const extension = file.name.split('.').pop().toLowerCase();
  const allowedExtensions = ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'png', 'jpg', 'jpeg', 'webp', 'csv', 'txt'];
  
  if (!allowedExtensions.includes(extension)) {
    return { valid: false, error: `File type .${extension} is not supported. Please upload PDF, Office documents, or images.` };
  }

  return { valid: true };
}

/**
 * Generates a secure, collision-free storage path for a client upload.
 * @param {string} userId 
 * @param {string} originalName 
 * @param {string} prefix 'customer' | 'admin'
 * @returns {{ filePath: string, safeFileName: string }}
 */
export function generateSecureFilePath(userId, originalName, prefix = 'customer') {
  const fileExt = originalName.split('.').pop().toLowerCase();
  const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const safeFileName = `${prefix}_${uniqueId}.${fileExt}`;
  const filePath = `${userId}/${safeFileName}`;
  return { filePath, safeFileName };
}

/**
 * Creates a signed download URL for private documents.
 * @param {string} rawPath 
 * @param {number} expiresInSeconds 
 * @returns {Promise<string>}
 */
export async function getSecureDocumentUrl(rawPath, expiresInSeconds = 120) {
  if (!rawPath) throw new Error('Invalid file path');
  
  const cleanPath = rawPath.includes('customer-documents/') 
    ? rawPath.split('customer-documents/').pop() 
    : rawPath;

  const { data, error } = await supabase.storage
    .from('customer-documents')
    .createSignedUrl(cleanPath, expiresInSeconds);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Could not generate document link');
  
  return data.signedUrl;
}
