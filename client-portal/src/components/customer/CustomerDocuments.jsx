import FileUpload from '../FileUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, FileCheck, Download } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

export default function CustomerDocuments({
  userId,
  adminSentDocuments = [],
  customerUploadedDocuments = [],
  loading = false,
  onDownloadFile,
  onUploadComplete,
}) {
  return (
    <div className="space-y-6">
      {/* Deliveries from advisor */}
      <Card className="border-emerald-200 bg-emerald-50/20 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
            <FileDown className="w-5 h-5 text-emerald-600" /> Documents From Your Tax Advisor ({adminSentDocuments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-400">Loading documents...</p>
          ) : adminSentDocuments.length === 0 ? (
            <div className="p-4 bg-white/60 border border-emerald-100 rounded-xl text-center text-xs text-slate-500">
              No official documents delivered yet. Completed returns will appear here.
            </div>
          ) : (
            <div className="divide-y divide-emerald-100 bg-white rounded-xl border border-emerald-100 px-4">
              {adminSentDocuments.map((doc) => (
                <div key={doc.id} className="py-3.5 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <p className="text-sm font-bold text-slate-900 truncate">{doc.file_name}</p>
                    <span className="text-xs text-slate-400">• {formatDate(doc.created_at)}</span>
                  </div>
                  <Button 
                    variant="accent" 
                    size="sm" 
                    onClick={() => onDownloadFile(doc.file_url)} 
                    className="text-xs h-9 px-3 gap-1.5 shrink-0"
                  >
                    <Download className="w-4 h-4" /> Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submissions & uploader */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FileUpload userId={userId} onUploadComplete={onUploadComplete} />

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-slate-700" /> Your Submitted Documents ({customerUploadedDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-400">Loading your submissions...</p>
            ) : customerUploadedDocuments.length === 0 ? (
              <p className="text-sm text-slate-400">No documents uploaded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                {customerUploadedDocuments.map((doc) => (
                  <li key={doc.id} className="py-3 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.file_name}</p>
                      <p className="text-xs text-slate-400">{formatDate(doc.created_at)}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onDownloadFile(doc.file_url)} 
                      className="text-xs h-8 px-2.5 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
