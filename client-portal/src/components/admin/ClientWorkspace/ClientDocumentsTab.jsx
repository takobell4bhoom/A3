import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ConfirmationModal } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { validateFile } from '@/lib/storage';
import { formatDate } from '@/lib/dateUtils';
import { 
  Send, UploadCloud, Loader2, FileText, Download, Trash2, 
  FileSpreadsheet, Image, FileCode
} from 'lucide-react';

function getFileIcon(fileName = '') {
  const ext = fileName.split('.').pop().toLowerCase();
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />;
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
    return <Image className="w-5 h-5 text-purple-600 shrink-0" />;
  }
  if (['pdf'].includes(ext)) {
    return <FileText className="w-5 h-5 text-red-600 shrink-0" />;
  }
  return <FileCode className="w-5 h-5 text-blue-600 shrink-0" />;
}

export default function ClientDocumentsTab({
  client,
  documents = [],
  onUploadDocument,
  onDownloadFile,
  onDeleteFile,
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [docCategory, setDocCategory] = useState('all'); // 'all' | 'admin' | 'client'
  const toast = useToast();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const val = validateFile(selected);
      if (!val.valid) {
        toast.error('Invalid File', val.error);
        e.target.value = '';
        setFile(null);
        return;
      }
      setFile(selected);
    }
  };

  const handleDeliver = async (e) => {
    e.preventDefault();
    if (!file || !client) return;

    setUploading(true);
    try {
      const success = await onUploadDocument(client.id, file);
      if (success) {
        setFile(null);
        const fileInput = document.getElementById('client-file-input');
        if (fileInput) fileInput.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDeleteFile(deleteTarget.id, deleteTarget.filePath);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const clientDocs = documents.filter(d => d.uploaded_by_role !== 'admin');
  const adminDocs = documents.filter(d => d.uploaded_by_role === 'admin');

  const filteredDocs = docCategory === 'all' 
    ? documents 
    : docCategory === 'admin' 
      ? adminDocs 
      : clientDocs;

  return (
    <div className="space-y-6">
      {/* Upload Zone & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Deliver Document to Client Card */}
        <Card className="border-slate-200 border-l-4 border-l-emerald-600 lg:col-span-1 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-slate-900">
              <Send className="w-5 h-5 text-emerald-600" /> Deliver Document
            </CardTitle>
            <CardDescription className="text-xs">
              Upload filed returns or reports directly to {client.full_name || client.email}&apos;s portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDeliver} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-slate-400 transition-colors bg-slate-50">
                <input
                  type="file"
                  id="client-file-input"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <label htmlFor="client-file-input" className="cursor-pointer space-y-1 block">
                  <UploadCloud className="w-7 h-7 mx-auto text-emerald-600" />
                  <div className="text-xs font-semibold text-slate-800 truncate px-2">
                    {file ? file.name : "Click to select or drag document"}
                  </div>
                  <p className="text-[10px] text-slate-400">PDF, XLSX, DOCX up to 500MB</p>
                </label>
              </div>

              <Button
                type="submit"
                variant="accent"
                size="sm"
                disabled={uploading || !file}
                className="w-full text-xs font-semibold gap-1.5"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Delivering to Client...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Deliver File to Client
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Client Storage & Category Metrics */}
        <Card className="border-slate-200 lg:col-span-2 shadow-sm bg-white flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-900">Document Vault Overview</CardTitle>
            <CardDescription className="text-xs">
              Bi-directional file exchange for this client workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div 
                onClick={() => setDocCategory('all')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  docCategory === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${docCategory === 'all' ? 'text-slate-400' : 'text-slate-500'}`}>Total Files</span>
                <p className="text-xl font-bold font-mono mt-0.5">{documents.length}</p>
              </div>

              <div 
                onClick={() => setDocCategory('admin')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  docCategory === 'admin' ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm' : 'bg-emerald-50/40 border-emerald-200 text-emerald-900 hover:bg-emerald-50'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${docCategory === 'admin' ? 'text-emerald-200' : 'text-emerald-700'}`}>Delivered</span>
                <p className="text-xl font-bold font-mono mt-0.5">{adminDocs.length}</p>
              </div>

              <div 
                onClick={() => setDocCategory('client')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  docCategory === 'client' ? 'bg-blue-700 text-white border-blue-700 shadow-sm' : 'bg-blue-50/40 border-blue-200 text-blue-900 hover:bg-blue-50'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${docCategory === 'client' ? 'text-blue-200' : 'text-blue-700'}`}>Submitted</span>
                <p className="text-xl font-bold font-mono mt-0.5">{clientDocs.length}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              All files are encrypted with 256-bit AES storage and restricted via Supabase Row-Level Security policies.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              {docCategory === 'all' ? 'All Workspace Files' : docCategory === 'admin' ? 'Official Documents Delivered by Firm' : 'Documents Submitted by Client'} ({filteredDocs.length})
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredDocs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-1">
              <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700">No documents in this category</p>
              <p className="text-[11px] text-slate-400">Use the upload box above to deliver official documents.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => {
                const isAdminDoc = doc.uploaded_by_role === 'admin';

                return (
                  <div key={doc.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {getFileIcon(doc.file_name)}
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-900 truncate" title={doc.file_name}>
                          {doc.file_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isAdminDoc ? (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Delivered by Firm
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              Client Submission
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {formatDate(doc.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onDownloadFile(doc.file_url)}
                        className="h-7 px-2.5 text-xs gap-1"
                      >
                        <Download className="w-3 h-3" /> View / Download
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget({ id: doc.id, filePath: doc.file_url, fileName: doc.file_name })}
                        className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Document"
        description={`Are you sure you want to permanently delete "${deleteTarget?.fileName}" from ${client.full_name || client.email}'s workspace?`}
        confirmText="Delete Document"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
