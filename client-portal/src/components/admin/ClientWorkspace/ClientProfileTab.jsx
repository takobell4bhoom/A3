import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationModal } from '@/components/ui/dialog';
import { formatDate } from '@/lib/dateUtils';
import { 
  User, Mail, Phone, Calendar, ShieldCheck, ShieldAlert, UserCheck, UserX, Trash2 
} from 'lucide-react';

export default function ClientProfileTab({
  client,
  onToggleAccess,
  onDeleteClient,
  togglingAccess = false,
  deletingClient = false,
  firmName = 'Tax Shield Advisor',
}) {
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Account Overview Card */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" /> Client Account Profile
          </CardTitle>
          <CardDescription className="text-xs">
            Client registration details and authentication status.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" /> Full Name / Company
              </span>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {client.full_name || 'Not provided'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" /> Login Email
              </span>
              <p className="text-sm font-bold text-slate-900 font-mono mt-1">
                {client.email}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" /> Phone Number
              </span>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {client.phone || '—'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> Onboarded Date
              </span>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {formatDate(client.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security & Access Management Card */}
      <Card className={`shadow-sm bg-white border ${client.is_disabled ? 'border-red-200' : 'border-slate-200'}`}>
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base text-slate-900 flex items-center gap-2">
            {client.is_disabled ? (
              <ShieldAlert className="w-5 h-5 text-red-600" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            )}
            Portal Security &amp; Access Controls
          </CardTitle>
          <CardDescription className="text-xs">
            Manage whether this client can authenticate into {firmName}.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Current Status:</span>
              {client.is_disabled ? (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Access Suspended
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Active &amp; Verified
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              {client.is_disabled
                ? 'This client is currently locked out. When they attempt to log in, they will see a suspension message.'
                : 'Client has full access to upload documents, review filing milestones, and pay invoices.'}
            </p>
          </div>

          <Button
            type="button"
            variant={client.is_disabled ? "accent" : "outline"}
            size="sm"
            onClick={() => setIsAccessModalOpen(true)}
            className={`text-xs h-9 px-4 shrink-0 ${!client.is_disabled ? "text-red-600 border-red-200 hover:bg-red-50" : ""}`}
          >
            {client.is_disabled ? (
              <>
                <UserCheck className="w-4 h-4 mr-1.5" /> Restore Portal Access
              </>
            ) : (
              <>
                <UserX className="w-4 h-4 mr-1.5" /> Suspend Portal Access
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone: Delete Client Card */}
      <Card className="border-red-200 shadow-sm bg-red-50/20">
        <CardHeader className="pb-3 border-b border-red-100">
          <CardTitle className="text-base text-red-900 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" /> Danger Zone: Permanently Delete Client
          </CardTitle>
          <CardDescription className="text-xs text-red-700/80">
            Irreversible account and workspace eradication.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-slate-600 max-w-md">
            Permanently deletes {client.full_name || client.email}&apos;s account, all uploaded documents, active work tracker status, and billing ledger. This action cannot be reversed.
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-xs h-9 px-4 text-red-600 border-red-300 hover:bg-red-600 hover:text-white transition-colors shrink-0 font-semibold gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Delete Client Account
          </Button>
        </CardContent>
      </Card>

      {/* Toggle Access Confirmation Modal */}
      <ConfirmationModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        onConfirm={async () => {
          await onToggleAccess();
          setIsAccessModalOpen(false);
        }}
        title={client.is_disabled ? "Restore Client Access" : "Suspend Client Access"}
        description={
          client.is_disabled
            ? `Re-enable portal access for ${client.email}? The client will be able to log in immediately.`
            : `Disable portal access for ${client.email}? The client will be locked out and receive an account suspension screen.`
        }
        confirmText={client.is_disabled ? "Restore Access" : "Disable Access"}
        variant={client.is_disabled ? "success" : "danger"}
        loading={togglingAccess}
      />

      {/* Delete Client Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          await onDeleteClient(client.id);
          setIsDeleteModalOpen(false);
        }}
        title="Permanently Delete Client"
        description={`Are you sure you want to delete "${client.full_name || client.email}"? All documents, status milestones, and billing records will be permanently erased.`}
        confirmText="Delete Client Permanently"
        variant="danger"
        loading={deletingClient}
      />
    </div>
  );
}
