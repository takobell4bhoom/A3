import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { validateFile } from '@/lib/storage';
import { 
  Send, UploadCloud, Loader2, FileText, Search, X, Check 
} from 'lucide-react';

export default function DeliverDocumentModal({
  isOpen,
  onClose,
  customers = [],
  initialSelectedCustomer = null,
  onDeliverFile,
}) {
  const [targetCustomerId, setTargetCustomerId] = useState(() => initialSelectedCustomer?.id || (customers[0]?.id || ''));
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const activeClient = useMemo(() => {
    return customers.find(c => c.id === targetCustomerId) || initialSelectedCustomer || customers[0] || null;
  }, [customers, targetCustomerId, initialSelectedCustomer]);

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return customers;
    const q = clientSearchQuery.toLowerCase().trim();
    return customers.filter(
      c => (c.email && c.email.toLowerCase().includes(q)) || (c.full_name && c.full_name.toLowerCase().includes(q))
    );
  }, [customers, clientSearchQuery]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeClient) {
      toast.error('Missing Client', 'Please select a recipient client.');
      return;
    }
    if (!file) {
      toast.error('Missing File', 'Please choose a document to deliver.');
      return;
    }

    setUploading(true);
    try {
      const success = await onDeliverFile(activeClient.id, file);
      if (success) {
        setFile(null);
        onClose();
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold leading-none">Deliver Document to Client</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Upload completed returns, audit reports, or statements</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Target Client Picker */}
          <div className="relative space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Recipient Client <span className="text-red-500">*</span></Label>
            
            <div
              onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 flex items-center justify-between text-xs cursor-pointer hover:border-slate-400 transition-colors"
            >
              {activeClient ? (
                <div className="truncate">
                  <span className="font-semibold text-slate-800">{activeClient.full_name || activeClient.email}</span>
                  {activeClient.full_name && (
                    <span className="text-slate-400 ml-1.5 font-mono text-[11px]">({activeClient.email})</span>
                  )}
                </div>
              ) : (
                <span className="text-slate-400">Search and select client...</span>
              )}
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
            </div>

            {/* Dropdown Menu */}
            {isClientDropdownOpen && (
              <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl p-2 space-y-1.5 animate-in fade-in duration-150 max-h-56 overflow-y-auto">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search client by name or email..."
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    className="h-8 text-xs pl-8 pr-2 bg-slate-50"
                    autoFocus
                  />
                </div>

                <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400 text-center italic">No matching clients found</p>
                  ) : (
                    filteredClients.map((client) => {
                      const isSelected = activeClient?.id === client.id;
                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setTargetCustomerId(client.id);
                            setIsClientDropdownOpen(false);
                            setClientSearchQuery('');
                          }}
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

          {/* File Drag & Drop Dropzone */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Official Document File <span className="text-red-500">*</span></Label>
            
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:border-slate-400 transition-colors bg-slate-50/50">
              <input
                type="file"
                id="deliver-file-input"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <label htmlFor="deliver-file-input" className="cursor-pointer space-y-1.5 block">
                <FileText className="w-8 h-8 mx-auto text-emerald-600" />
                <div className="text-xs font-semibold text-slate-800">
                  {file ? file.name : "Click to select document or drag & drop"}
                </div>
                <p className="text-[10px] text-slate-400">PDF, XLSX, DOCX, PNG, JPG up to 500MB</p>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={uploading}
              className="text-xs h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              disabled={uploading || !file || !activeClient}
              className="text-xs h-9 px-5 font-semibold gap-1.5"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Delivering...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" /> Deliver File
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
