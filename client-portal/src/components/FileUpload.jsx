import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Loader2 } from 'lucide-react';

export default function FileUpload({ userId, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus(null);
      setErrorMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStatus(null);
    setErrorMessage('');

    try {
      // 1. Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // 2. Upload file to Private Supabase Storage Bucket ('customer-documents')
      const { error: uploadError } = await supabase.storage
        .from('customer-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/pdf',
        });

      if (uploadError) throw uploadError;

      // 3. Save relative storage path in DB (for Private Bucket Signed URLs)
      const { error: dbError } = await supabase
        .from('documents')
        .insert([
          {
            user_id: userId,
            file_name: file.name,
            file_url: filePath, // Store relative storage path
            upload_status: 'completed'
          }
        ]);

      if (dbError) throw dbError;

      setStatus('success');
      setFile(null);
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      console.error('Upload error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'File upload failed. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-emerald-600" />
          Document Submission
        </CardTitle>
        <CardDescription>
          Upload your financial records, W-2s, or tax schedules. Supports all file formats.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Upload Dropzone Container */}
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-slate-400 transition-colors bg-slate-50/50">
          <input
            type="file"
            id="file-input"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <label htmlFor="file-input" className="cursor-pointer space-y-2 block">
            <FileText className="w-10 h-10 mx-auto text-slate-400" />
            <div className="text-sm font-medium text-slate-700">
              {file ? file.name : "Click to select or drag & drop files here"}
            </div>
            <p className="text-xs text-slate-400">PDF, XLSX, DOCX, PNG, JPG up to 500MB</p>
          </label>
        </div>

        {/* Upload Action Button */}
        {file && (
          <Button 
            onClick={handleUpload} 
            disabled={uploading} 
            variant="accent" 
            className="w-full flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Encrypting & Transferring...
              </>
            ) : (
              `Upload ${file.name}`
            )}
          </Button>
        )}

        {/* Success Feedback */}
        {status === 'success' && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            Document uploaded and verified successfully.
          </div>
        )}

        {/* Error / Failsafe Feedback */}
        {status === 'error' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-800 text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Upload Interrupted</p>
              <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}