import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationModal } from '@/components/ui/dialog';
import { formatDate } from '@/lib/dateUtils';
import DeliverDocumentModal from './DeliverDocumentModal';
import { 
  FolderOpen, FileText, Download, Trash2, Plus, Search, X, 
  Send, FileCheck, FileSpreadsheet, Image, FileCode, ChevronLeft, ChevronRight 
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

export default function DocumentCenter({
  customers = [],
  documents = [],
  onUploadAdminDocument,
  onDownloadFile,
  onDeleteFile,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('all'); // 'all' | customerId
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'customer' | 'admin'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isDeliverModalOpen, setIsDeliverModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, filePath, fileName }
  const [deleting, setDeleting] = useState(false);

  // Fast customer map
  const customerMap = useMemo(() => {
    const map = new Map();
    for (const c of customers) {
      map.set(c.id, c);
    }
    return map;
  }, [customers]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let clientUploads = 0;
    let adminDeliveries = 0;
    const clientSet = new Set();

    for (const doc of documents) {
      if (doc.uploaded_by_role === 'admin') {
        adminDeliveries++;
      } else {
        clientUploads++;
      }
      if (doc.user_id) clientSet.add(doc.user_id);
    }

    return {
      total: documents.length,
      clientUploads,
      adminDeliveries,
      activeClients: clientSet.size,
    };
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const client = customerMap.get(doc.user_id);
      const clientEmail = (client?.email || '').toLowerCase();
      const clientName = (client?.full_name || '').toLowerCase();
      const fileName = (doc.file_name || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      // Search match
      const matchesSearch = !q || fileName.includes(q) || clientEmail.includes(q) || clientName.includes(q);

      // Client match
      const matchesClient = clientFilter === 'all' || doc.user_id === clientFilter;

      // Source match
      const matchesSource = 
        sourceFilter === 'all' ||
        (sourceFilter === 'admin' && doc.uploaded_by_role === 'admin') ||
        (sourceFilter === 'customer' && doc.uploaded_by_role !== 'admin');

      return matchesSearch && matchesClient && matchesSource;
    });
  }, [documents, customerMap, searchQuery, clientFilter, sourceFilter]);

  // Paginated Slice for high-performance rendering (Prevents DOM overload at 1000s of documents)
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  
  const paginatedDocuments = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, effectivePage, pageSize]);

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

  const selectedClientObject = useMemo(() => {
    return customers.find(c => c.id === clientFilter) || null;
  }, [customers, clientFilter]);

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Documents</span>
              <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                <FolderOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{metrics.total}</p>
            <p className="text-[11px] text-slate-400 mt-1">{metrics.activeClients} active client folders</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 shadow-sm bg-emerald-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Delivered by Firm</span>
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-900 mt-2 font-mono">{metrics.adminDeliveries}</p>
            <p className="text-[11px] text-emerald-700/80 mt-1">Official reports sent</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 shadow-sm bg-blue-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Client Submissions</span>
              <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-2 font-mono">{metrics.clientUploads}</p>
            <p className="text-[11px] text-blue-700/80 mt-1">Files received from clients</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-slate-900 text-white flex flex-col justify-between">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Quick Action</span>
              <p className="text-sm font-bold text-white mt-1">Send Document to Client</p>
            </div>
            <Button
              variant="accent"
              size="sm"
              onClick={() => setIsDeliverModalOpen(true)}
              className="mt-3 w-full gap-1.5 text-xs font-semibold"
            >
              <Plus className="w-4 h-4" /> Deliver Document
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Document Feed Card */}
      <Card className="border-slate-200 shadow-sm bg-white">
        
        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Source Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSourceFilter('all')}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  sourceFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Files ({documents.length})
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('admin')}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  sourceFilter === 'admin'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <Send className="w-3 h-3" /> Firm Deliveries ({metrics.adminDeliveries})
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('customer')}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  sourceFilter === 'customer'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                <FileCheck className="w-3 h-3" /> Client Uploads ({metrics.clientUploads})
              </button>
            </div>

            {/* Client Filter Dropdown + Search Input */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Client Filter */}
              <div className="relative w-full sm:w-56">
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="all">Filter: All Clients ({customers.length})</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name ? `${c.full_name} (${c.email})` : c.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search files or clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs pl-8 pr-8 bg-slate-50 border-slate-200 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Active Filter Scope Notice */}
          {clientFilter !== 'all' && selectedClientObject && (
            <div className="flex items-center justify-between bg-emerald-50 text-emerald-900 px-3.5 py-2 rounded-lg border border-emerald-200 text-xs font-medium">
              <span>Showing files for client: <strong>{selectedClientObject.full_name || selectedClientObject.email}</strong></span>
              <button
                type="button"
                onClick={() => setClientFilter('all')}
                className="text-emerald-700 hover:text-emerald-900 text-xs underline font-semibold ml-3"
              >
                Reset to All Clients
              </button>
            </div>
          )}
        </div>

        {/* Documents Feed */}
        {filteredDocuments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FolderOpen className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No documents match your filters</p>
            <p className="text-xs text-slate-400">
              {searchQuery || clientFilter !== 'all' || sourceFilter !== 'all'
                ? 'Try adjusting your search query or client filter.'
                : 'Click "Deliver Document" to send your first file to a client.'}
            </p>
            <Button
              variant="accent"
              size="sm"
              onClick={() => setIsDeliverModalOpen(true)}
              className="mt-3 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Deliver a Document
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-5">Document Name</th>
                  <th className="p-3.5">Client Folder</th>
                  <th className="p-3.5">Source / Direction</th>
                  <th className="p-3.5">Date Uploaded</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedDocuments.map((doc) => {
                  const client = customerMap.get(doc.user_id);
                  const isDeliveredByAdmin = doc.uploaded_by_role === 'admin';
                  const clientEmail = client?.email || 'Client';
                  const clientName = client?.full_name || '';

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Document Name & Icon */}
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-3 max-w-xs sm:max-w-md">
                          {getFileIcon(doc.file_name)}
                          <div className="truncate">
                            <p className="font-semibold text-slate-900 truncate" title={doc.file_name}>
                              {doc.file_name}
                            </p>
                            {doc.file_size_bytes && (
                              <p className="text-[10px] text-slate-400 font-mono">
                                {(doc.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Client Badge */}
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => setClientFilter(doc.user_id)}
                          title="Click to filter by this client"
                          className="text-left group cursor-pointer"
                        >
                          <p className="font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors truncate max-w-[180px]">
                            {clientName || clientEmail}
                          </p>
                          {clientName && (
                            <p className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">{clientEmail}</p>
                          )}
                        </button>
                      </td>

                      {/* Direction Tag */}
                      <td className="p-3.5">
                        {isDeliveredByAdmin ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Send className="w-3 h-3 text-emerald-600" /> Delivered by Firm
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                            <FileCheck className="w-3 h-3 text-blue-600" /> Submitted by Client
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="p-3.5 text-slate-500 font-medium">
                        {formatDate(doc.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {filteredDocuments.length > 0 && (
          <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong className="text-slate-900 font-mono">{(effectivePage - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-slate-900 font-mono">{Math.min(effectivePage * pageSize, filteredDocuments.length)}</strong> of{' '}
                <strong className="text-slate-900 font-mono">{filteredDocuments.length}</strong> files
              </span>

              <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                <span className="text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 rounded border border-slate-200 bg-white px-1.5 text-xs text-slate-900 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px] font-mono font-medium">
                Page {effectivePage} of {totalPages}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={effectivePage <= 1}
                  className="h-7 w-7 p-0"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={effectivePage >= totalPages}
                  className="h-7 w-7 p-0"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Deliver Document Modal */}
      <DeliverDocumentModal
        isOpen={isDeliverModalOpen}
        onClose={() => setIsDeliverModalOpen(false)}
        customers={customers}
        initialSelectedCustomer={selectedClientObject}
        onDeliverFile={onUploadAdminDocument}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Document"
        description={`Are you sure you want to permanently delete "${deleteTarget?.fileName}"? This file will be removed from secure storage.`}
        confirmText="Delete Document"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
