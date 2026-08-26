import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationModal } from '@/components/ui/dialog';
import { formatDate } from '@/lib/dateUtils';
import { 
  User, Mail, Phone, Calendar, ShieldCheck, ShieldAlert, 
  UserCheck, UserX, Trash2, Edit3, Save, X, Building, 
  FileText, Hash, MapPin, Check 
} from 'lucide-react';

const CLIENT_TYPES = [
  'Individual',
  'Proprietorship',
  'Partnership Firm',
  'Private Limited (Pvt Ltd)',
  'Public Limited',
  'Limited Liability Partnership (LLP)',
  'Trust / Society / NGO',
  'Hindu Undivided Family (HUF)',
  'Association of Persons (AOP) / BOI',
];

const CLIENT_GROUPS = [
  'Corporate Clients',
  'High Net Worth (HNI)',
  'Direct Tax & ITR Filing',
  'GST & Indirect Tax',
  'Statutory & Internal Audit',
  'Monthly Retainership',
  'Startups & MSMEs',
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 
  'Delhi (NCT)', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export default function ClientProfileTab({
  client,
  onUpdateClient,
  onToggleAccess,
  onDeleteClient,
  togglingAccess = false,
  deletingClient = false,
  firmName = 'Tax Shield Advisor',
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form Edit State initialized from client
  const [formData, setFormData] = useState({
    full_name: client.full_name || '',
    phone: client.phone || '',
    secondary_mobile: client.secondary_mobile || '',
    file_no: client.file_no || '',
    client_type: client.client_type || 'Individual',
    client_group: client.client_group || '',
    pan: client.pan || '',
    gstin: client.gstin || '',
    billing_profile: client.billing_profile || '',
    contact_person: client.contact_person || '',
    date_of_birth: client.date_of_birth || '',
    address: client.address || '',
    city: client.city || '',
    pincode: client.pincode || '',
    state: client.state || 'Maharashtra',
  });

  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (onUpdateClient) {
        await onUpdateClient({
          id: client.id,
          ...formData,
        });
      }
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: client.full_name || '',
      phone: client.phone || '',
      secondary_mobile: client.secondary_mobile || '',
      file_no: client.file_no || '',
      client_type: client.client_type || 'Individual',
      client_group: client.client_group || '',
      pan: client.pan || '',
      gstin: client.gstin || '',
      billing_profile: client.billing_profile || '',
      contact_person: client.contact_person || '',
      date_of_birth: client.date_of_birth || '',
      address: client.address || '',
      city: client.city || '',
      pincode: client.pincode || '',
      state: client.state || 'Maharashtra',
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Top Header Card with Edit Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" /> Client Onboarded Details &amp; Profile
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Comprehensive business, tax, and communication details for this client.
          </p>
        </div>

        <div>
          {!isEditing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs h-9 px-4 font-semibold gap-1.5 border-slate-300 hover:bg-slate-50"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Client Details
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={saving}
                className="text-xs h-9 px-3"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
              <Button
                type="submit"
                form="edit-client-profile-form"
                variant="accent"
                size="sm"
                disabled={saving}
                className="text-xs h-9 px-4 font-semibold gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      <form id="edit-client-profile-form" onSubmit={handleSaveProfile} className="space-y-6">
        
        {/* ================= 1. BASIC & TAX DETAILS CARD ================= */}
        <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" /> Basic &amp; Tax Registration Details
              </CardTitle>
              <CardDescription className="text-xs">
                Entity constitution, tax identifiers, and internal filing reference.
              </CardDescription>
            </div>

            {isEditing && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Editing Mode Active
              </span>
            )}
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Client Name */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Client / Entity Name
                </span>
                {isEditing ? (
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                    className="h-8 text-xs bg-white mt-1 font-semibold"
                    required
                  />
                ) : (
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {client.full_name || 'Not provided'}
                  </p>
                )}
              </div>

              {/* File No. */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-500" /> File Reference No.
                </span>
                {isEditing ? (
                  <Input
                    value={formData.file_no}
                    onChange={(e) => setFormData(p => ({ ...p, file_no: e.target.value }))}
                    className="h-8 text-xs bg-white mt-1"
                    placeholder="e.g. FIL-2026-089"
                  />
                ) : (
                  <p className="text-sm font-bold text-slate-900 mt-1 font-mono">
                    {formData.file_no || '—'}
                  </p>
                )}
              </div>

              {/* Client Type */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-500" /> Entity Constitution
                </span>
                {isEditing ? (
                  <select
                    value={formData.client_type}
                    onChange={(e) => setFormData(p => ({ ...p, client_type: e.target.value }))}
                    className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                  >
                    {CLIENT_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {formData.client_type || 'Individual'}
                  </p>
                )}
              </div>

              {/* Group */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" /> Client Group
                </span>
                {isEditing ? (
                  <select
                    value={formData.client_group}
                    onChange={(e) => setFormData(p => ({ ...p, client_group: e.target.value }))}
                    className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                  >
                    <option value="">None / General</option>
                    {CLIENT_GROUPS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {formData.client_group || 'General'}
                  </p>
                )}
              </div>

              {/* PAN */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-500" /> PAN Number
                </span>
                {isEditing ? (
                  <Input
                    value={formData.pan}
                    onChange={(e) => setFormData(p => ({ ...p, pan: e.target.value.toUpperCase() }))}
                    className="h-8 text-xs bg-white mt-1 font-mono uppercase"
                    maxLength={10}
                    placeholder="ABCDE1234F"
                  />
                ) : (
                  <p className="text-sm font-bold text-slate-900 font-mono mt-1">
                    {formData.pan || '—'}
                  </p>
                )}
              </div>

              {/* GSTIN */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-500" /> GSTIN Number
                </span>
                {isEditing ? (
                  <Input
                    value={formData.gstin}
                    onChange={(e) => setFormData(p => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                    className="h-8 text-xs bg-white mt-1 font-mono uppercase"
                    maxLength={15}
                    placeholder="27AAAAA0000A1Z5"
                  />
                ) : (
                  <p className="text-sm font-bold text-slate-900 font-mono mt-1">
                    {formData.gstin || '—'}
                  </p>
                )}
              </div>

              {/* Contact Person Name */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Contact Person
                </span>
                {isEditing ? (
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => setFormData(p => ({ ...p, contact_person: e.target.value }))}
                    className="h-8 text-xs bg-white mt-1"
                    placeholder="e.g. Mr. Rajesh Kumar"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {formData.contact_person || '—'}
                  </p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Date of Birth / Incorporation
                </span>
                {isEditing ? (
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData(p => ({ ...p, date_of_birth: e.target.value }))}
                    className="h-8 text-xs bg-white mt-1"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {formData.date_of_birth || '—'}
                  </p>
                )}
              </div>

              {/* Onboarded Date */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Account Created
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {formatDate(client.created_at)}
                </p>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* ================= 2. CONTACT & LOCATION DETAILS CARD ================= */}
        <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" /> Contact &amp; Communication Details
            </CardTitle>
            <CardDescription className="text-xs">
              Primary email, phone numbers, and physical business address.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Primary Mobile */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> Primary Mobile
                </span>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                    className="h-8 text-xs bg-white mt-1"
                    placeholder="+91 98765 43210"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-900 mt-1 font-mono">
                    {formData.phone || '—'}
                  </p>
                )}
              </div>

              {/* Secondary Mobile */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> Secondary Mobile
                </span>
                {isEditing ? (
                  <Input
                    value={formData.secondary_mobile}
                    onChange={(e) => setFormData(p => ({ ...p, secondary_mobile: e.target.value }))}
                    className="h-8 text-xs bg-white mt-1"
                    placeholder="Optional phone"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-900 mt-1 font-mono">
                    {formData.secondary_mobile || '—'}
                  </p>
                )}
              </div>

              {/* Login Email */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" /> Login Email (Permanent)
                </span>
                <p className="text-sm font-bold text-slate-900 font-mono mt-1 truncate">
                  {client.email}
                </p>
              </div>

              {/* City */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> City
                </span>
                {isEditing ? (
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                    className="h-8 text-xs bg-white mt-1"
                    placeholder="e.g. Mumbai"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {formData.city || '—'}
                  </p>
                )}
              </div>

              {/* State */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> State
                </span>
                {isEditing ? (
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData(p => ({ ...p, state: e.target.value }))}
                    className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                  >
                    {INDIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {formData.state || 'Maharashtra'}
                  </p>
                )}
              </div>

              {/* Pincode */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-500" /> Pincode
                </span>
                {isEditing ? (
                  <Input
                    value={formData.pincode}
                    onChange={(e) => setFormData(p => ({ ...p, pincode: e.target.value }))}
                    className="h-8 text-xs bg-white mt-1 font-mono"
                    maxLength={6}
                    placeholder="400001"
                  />
                ) : (
                  <p className="text-sm font-bold text-slate-900 font-mono mt-1">
                    {formData.pincode || '—'}
                  </p>
                )}
              </div>

              {/* Address (Full Span) */}
              <div className="sm:col-span-2 lg:col-span-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> Street Address / Premises
                </span>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                    className="w-full p-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white mt-1"
                    placeholder="Full street address, building number..."
                  />
                ) : (
                  <p className="text-xs font-medium text-slate-800 mt-1 leading-relaxed">
                    {formData.address || 'Not provided'}
                  </p>
                )}
              </div>

            </div>
          </CardContent>
        </Card>

        {isEditing && (
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
              className="text-xs h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              disabled={saving}
              className="text-xs h-9 px-6 font-semibold gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" /> Save Profile Details
            </Button>
          </div>
        )}

      </form>

      {/* ================= 3. SECURITY & ACCESS MANAGEMENT CARD ================= */}
      <Card className={`shadow-sm bg-white border ${client.is_disabled ? 'border-red-200' : 'border-slate-200'} rounded-2xl`}>
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

      {/* ================= 4. DANGER ZONE CARD ================= */}
      <Card className="border-red-200 shadow-sm bg-red-50/20 rounded-2xl">
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
