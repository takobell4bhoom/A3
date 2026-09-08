import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { User, Trash2, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/supabaseClient';

export default function AccountSettingsModal({ isOpen, onClose, userEmail, userId, onSignOut }) {
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reason, setReason] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  if (!isOpen) return null;

  const handleRequestDeletion = async () => {
    setRequesting(true);
    try {
      // 1. Direct update to users table for instantaneous Admin visibility
      const { error: dbError } = await supabase
        .from('users')
        .update({
          deletion_requested_at: new Date().toISOString(),
          deletion_reason: reason || 'User requested deletion via mobile app',
          is_disabled: true,
        })
        .eq('id', userId);

      if (dbError) throw dbError;

      // 2. Also log audit trail record
      try {
        await supabase
          .from('audit_logs')
          .insert([
            {
              user_id: userId,
              action: 'ACCOUNT_DELETION_REQUESTED',
              target_type: 'user',
              target_id: userId,
              details: { reason: reason || 'User requested deletion via mobile app' },
            }
          ]);
      } catch (auditErr) {
        console.warn('Audit log write warning:', auditErr);
      }

      setRequested(true);
      toast.success('Deletion Request Logged', 'Your account deletion request has been submitted for compliance processing.');
      
      setTimeout(async () => {
        if (onSignOut) await onSignOut();
      }, 2500);
    } catch (err) {
      toast.error('Request Failed', err.message || 'Could not submit request.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl p-6 z-10 space-y-4 animate-in slide-in-from-bottom-8 duration-200">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Account Security</h3>
              <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{userEmail}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {requested ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="text-xs font-bold text-emerald-900">Account Deletion Initiated</h4>
            <p className="text-[10px] text-emerald-700">
              Your data purge request has been recorded. You will be signed out momentarily.
            </p>
          </div>
        ) : !confirmDelete ? (
          <div className="space-y-4 pt-1">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Client Profile</div>
              <div className="text-[11px] text-slate-500 font-mono truncate">{userId}</div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Delete Account &amp; Data</h4>
                  <p className="text-[10px] text-slate-500">Permanently request deletion of all files and records</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs text-rose-600 hover:bg-rose-50 hover:border-rose-200 h-8 px-3"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Permanent Deletion Notice</span>
                <p className="text-[10px] text-rose-700 mt-0.5">
                  This action will submit your tax documents, invoices, and profile for irreversible deletion under data protection compliance.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Reason for leaving (optional):
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="E.g., Switched accountant, no longer required..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                className="w-1/2 text-xs h-9"
              >
                Cancel
              </Button>
              <button
                onClick={handleRequestDeletion}
                disabled={requesting}
                className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold h-9 flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                {requesting ? 'Processing...' : 'Confirm Request'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
