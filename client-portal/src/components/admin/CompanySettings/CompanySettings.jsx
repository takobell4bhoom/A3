import { useState, useRef } from 'react';
import { supabase } from '@/supabaseClient';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Building2, Receipt, MapPin, Phone, Mail, 
  FileText, CheckCircle2, ShieldCheck, Sparkles, Save, RotateCcw,
  Landmark, QrCode, Lock, Eye, EyeOff, KeyRound, Loader2, Globe, Shield,
  Upload, Trash2, Image as ImageIcon
} from 'lucide-react';

const getInitialFormData = (org) => ({
  name: org?.name || '',
  logo_url: org?.logo_url || '',
  website: org?.website || '',
  contact_email: org?.contact_email || '',
  contact_phone: org?.contact_phone || '',
  gstin: org?.gstin || '',
  pan: org?.pan || '',
  address: org?.address || '',
  city: org?.city || '',
  state: org?.state || '',
  pincode: org?.pincode || '',
  bank_name: org?.bank_name || '',
  bank_account_name: org?.bank_account_name || '',
  bank_account_number: org?.bank_account_number || '',
  bank_ifsc: org?.bank_ifsc || '',
  bank_branch: org?.bank_branch || '',
  upi_id: org?.upi_id || '',
  invoice_prefix: org?.invoice_prefix || 'INV',
  invoice_notes: org?.invoice_notes || 'Thank you for your business. Please make payment before the due date.',
});

export default function CompanySettings({ organization, onUpdateOrganization }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form State initialized from organization prop
  const [formData, setFormData] = useState(() => getInitialFormData(organization));

  // Security / Change Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSavedSuccess(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File Too Large', 'Please select an image smaller than 2MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setFormData(prev => ({ ...prev, logo_url: dataUrl }));

      // Auto-save logo immediately if organization ID exists
      if (organization?.id) {
        try {
          const { data, error } = await supabase
            .from('organizations')
            .update({ 
              logo_url: dataUrl, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', organization.id)
            .select()
            .single();

          if (error) throw error;

          toast.success('Logo Saved', 'Company logo uploaded and saved to your profile.');
          if (onUpdateOrganization && data) {
            onUpdateOrganization(data);
          }
        } catch (err) {
          console.error('Failed to auto-save logo:', err);
          toast.info('Logo Selected', 'Logo preview updated. Click "Save Changes" to save all fields.');
        } finally {
          setLogoUploading(false);
        }
      } else {
        setLogoUploading(false);
        toast.info('Logo Selected', 'Logo preview updated. Click "Save Changes" to save.');
      }
    };
    reader.onerror = () => {
      setLogoUploading(false);
      toast.error('Read Error', 'Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    setFormData(prev => ({ ...prev, logo_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (organization?.id) {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .update({ 
            logo_url: null, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', organization.id)
          .select()
          .single();

        if (error) throw error;

        toast.success('Logo Removed', 'Logo has been removed from your company profile.');
        if (onUpdateOrganization && data) {
          onUpdateOrganization(data);
        }
      } catch (err) {
        console.error('Failed to remove logo:', err);
        toast.info('Logo Removed', 'Click "Save Changes" to apply.');
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!organization?.id) {
      toast.error('Error', 'No organization record found to update.');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Validation Error', 'Company Legal Name is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        logo_url: formData.logo_url || null,
        website: formData.website.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        gstin: formData.gstin.trim().toUpperCase() || null,
        pan: formData.pan.trim().toUpperCase() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        pincode: formData.pincode.trim() || null,
        bank_name: formData.bank_name.trim() || null,
        bank_account_name: formData.bank_account_name.trim() || null,
        bank_account_number: formData.bank_account_number.trim() || null,
        bank_ifsc: formData.bank_ifsc.trim().toUpperCase() || null,
        bank_branch: formData.bank_branch.trim() || null,
        upi_id: formData.upi_id.trim() || null,
        invoice_prefix: (formData.invoice_prefix.trim().toUpperCase() || 'INV').replace(/[^A-Z0-9-]/g, ''),
        invoice_notes: formData.invoice_notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('organizations')
        .update(payload)
        .eq('id', organization.id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Company Settings Saved', 'Your business details, logo, bank info, and invoice letterhead have been updated.');
      setSavedSuccess(true);
      if (onUpdateOrganization && data) {
        onUpdateOrganization(data);
      }
    } catch (err) {
      console.error('Failed to update company settings:', err);
      toast.error('Save Failed', err.message || 'Could not save company settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (organization) {
      setFormData(getInitialFormData(organization));
      setSavedSuccess(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error('Validation Error', 'Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Password Mismatch', 'The new passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Password Updated', 'Your account password has been changed successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Failed to update password:', err);
      toast.error('Password Change Failed', err.message || 'Could not update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-7 sm:p-9 shadow-lg border border-slate-800/80 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4" /> Company Profile, Banking &amp; Security
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5">Settings &amp; Letterhead</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
            Configure your registered business details, GSTIN, Bank &amp; UPI coordinates (auto-printed on invoices), and manage your account security credentials.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={loading}
            className="h-10 px-4 text-xs font-semibold gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 rounded-xl"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>

          <Button
            type="submit"
            form="company-settings-form"
            variant="accent"
            size="sm"
            disabled={loading}
            className="h-10 px-5 text-xs font-bold gap-2 shadow-md hover:shadow-lg rounded-xl"
          >
            {loading ? (
              <span>Saving...</span>
            ) : savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" /> Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <form id="company-settings-form" onSubmit={handleSave} className="space-y-8">
        
        {/* Section 1: Company Brand Logo */}
        <Card className="border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-white rounded-3xl overflow-hidden">
          <CardHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <ImageIcon className="w-4 h-4 text-sky-600" /> Company Logo &amp; Visual Branding
                </div>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Upload your organization&apos;s high-resolution logo. Automatically printed on top of all generated invoices.
                </CardDescription>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                <Sparkles className="w-3 h-3" /> Auto-Printed on Invoices
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Logo Preview Container */}
              <div className="w-40 h-28 sm:w-48 sm:h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center p-3 shrink-0 overflow-hidden relative group">
                {formData.logo_url ? (
                  <img
                    src={formData.logo_url}
                    alt={formData.name || 'Company Logo'}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center space-y-1">
                    <Building2 className="w-6 h-6 text-slate-300 mx-auto" />
                    <span className="text-[10px] font-semibold text-slate-400 block">No Logo Uploaded</span>
                  </div>
                )}
              </div>

              {/* Upload Controls & Instructions */}
              <div className="space-y-3 flex-1 text-center sm:text-left">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                  <Button
                    type="button"
                    size="sm"
                    disabled={logoUploading}
                    onClick={(e) => {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }}
                    className="h-9 px-4 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-colors gap-2"
                  >
                    {logoUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Logo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>{formData.logo_url ? 'Change Logo' : 'Upload Logo'}</span>
                      </>
                    )}
                  </Button>

                  {formData.logo_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={logoUploading}
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemoveLogo();
                      }}
                      className="h-9 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Supported formats: <strong>PNG, JPG, SVG, WebP</strong> (Max 2MB). A transparent background PNG or SVG is recommended for crisp invoice printing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Business Identity & Statutory Tax IDs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <Card className="lg:col-span-2 border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-white rounded-3xl overflow-hidden">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-sky-600" /> Business Identity &amp; Tax Information
              </div>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Official legal identifiers used for GST compliance, tax invoicing, and billing dispatch.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700">Company Legal Name *</Label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="e.g. Apex Retailers Pvt Ltd"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                      className="pl-9 text-xs font-bold rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Website URL</Label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="e.g. https://apexretail.com"
                      value={formData.website}
                      onChange={(e) => handleChange('website', e.target.value)}
                      className="pl-9 text-xs font-mono rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Billing / Support Email</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="email"
                      placeholder="billing@yourcompany.com"
                      value={formData.contact_email}
                      onChange={(e) => handleChange('contact_email', e.target.value)}
                      className="pl-9 text-xs font-mono rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">GSTIN (15 Digits)</Label>
                  <Input
                    type="text"
                    placeholder="e.g. 27ABCDE1234F1Z5"
                    value={formData.gstin}
                    maxLength={15}
                    onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                    className="text-xs font-mono font-bold uppercase tracking-wider rounded-xl"
                  />
                  <p className="text-[10px] text-slate-400">Printed on GST tax invoices</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Company PAN (10 Digits)</Label>
                  <Input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={formData.pan}
                    maxLength={10}
                    onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                    className="text-xs font-mono font-bold uppercase tracking-wider rounded-xl"
                  />
                  <p className="text-[10px] text-slate-400">Permanent Account Number</p>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700">Contact Phone / WhatsApp</Label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.contact_phone}
                      onChange={(e) => handleChange('contact_phone', e.target.value)}
                      className="pl-9 text-xs font-mono rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Letterhead Preview Card */}
          <Card className="border-sky-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-gradient-to-br from-sky-50/40 via-white to-white rounded-3xl overflow-hidden flex flex-col justify-between">
            <div>
              <CardHeader className="p-6 pb-3 border-b border-sky-100">
                <div className="flex items-center gap-2 text-sky-950 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-sky-600" /> Invoice Header Preview
                </div>
                <CardDescription className="text-xs text-slate-500">
                  How your firm branding appears to clients.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      {formData.logo_url ? (
                        <img
                          src={formData.logo_url}
                          alt="Logo"
                          className="max-h-8 max-w-[130px] object-contain mb-1"
                        />
                      ) : (
                        <img
                          src="/taxshield-logo.jpg"
                          alt="Taxshield Advisor"
                          className="max-h-7 max-w-[120px] object-contain mb-1"
                        />
                      )}
                      <h3 className="font-extrabold text-sm text-slate-900 truncate">
                        {formData.name || 'Your Company Name'}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {formData.contact_email || 'contact@company.com'}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 self-start">
                      {formData.invoice_prefix || 'INV'}-XXXXX
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-600 space-y-1 font-mono">
                    {formData.gstin && (
                      <p><span className="font-bold text-slate-800">GSTIN:</span> {formData.gstin}</p>
                    )}
                    {formData.pan && (
                      <p><span className="font-bold text-slate-800">PAN:</span> {formData.pan}</p>
                    )}
                    {formData.address && (
                      <p className="text-slate-500 font-sans">
                        {formData.address}, {formData.city} {formData.state} {formData.pincode}
                      </p>
                    )}
                  </div>

                  {formData.bank_name && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] space-y-0.5">
                      <p className="font-bold text-slate-800 flex items-center gap-1">
                        <Landmark className="w-3 h-3 text-sky-600" /> {formData.bank_name}
                      </p>
                      <p className="text-slate-500">A/C: {formData.bank_account_number || '••••••••'}</p>
                      {formData.upi_id && <p className="text-emerald-700 font-bold">UPI: {formData.upi_id}</p>}
                    </div>
                  )}
                </div>
              </CardContent>
            </div>

            <div className="p-6 pt-0">
              <div className="flex items-center gap-2 text-[11px] text-sky-900 bg-sky-100/70 p-3 rounded-2xl font-medium">
                <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Automatically printed on all generated client invoices.</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Section 2: Bank Transfer & UPI Payment Details */}
        <Card className="border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-white rounded-3xl overflow-hidden">
          <CardHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Landmark className="w-4 h-4 text-emerald-600" /> Bank Transfer &amp; Direct UPI Payment Details
                </div>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  These banking coordinates and UPI ID will be printed directly onto your client invoices for quick settlement.
                </CardDescription>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                <QrCode className="w-3 h-3" /> Auto-Printed on Invoices
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Bank Name</Label>
                <Input
                  type="text"
                  placeholder="e.g. HDFC Bank Ltd"
                  value={formData.bank_name}
                  onChange={(e) => handleChange('bank_name', e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Account Holder Name</Label>
                <Input
                  type="text"
                  placeholder="e.g. Apex Retailers Pvt Ltd"
                  value={formData.bank_account_name}
                  onChange={(e) => handleChange('bank_account_name', e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Account Number</Label>
                <Input
                  type="text"
                  placeholder="e.g. 50200012345678"
                  value={formData.bank_account_number}
                  onChange={(e) => handleChange('bank_account_number', e.target.value)}
                  className="text-xs font-mono rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">IFSC Code</Label>
                <Input
                  type="text"
                  placeholder="e.g. HDFC0001234"
                  value={formData.bank_ifsc}
                  maxLength={11}
                  onChange={(e) => handleChange('bank_ifsc', e.target.value.toUpperCase())}
                  className="text-xs font-mono font-bold uppercase rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Branch Name / City</Label>
                <Input
                  type="text"
                  placeholder="e.g. Fort, Mumbai"
                  value={formData.bank_branch}
                  onChange={(e) => handleChange('bank_branch', e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">UPI ID / VPA</Label>
                <div className="relative">
                  <QrCode className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="e.g. business@hdfcbank"
                    value={formData.upi_id}
                    onChange={(e) => handleChange('upi_id', e.target.value)}
                    className="pl-9 text-xs font-mono font-bold text-emerald-800 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Registered Address */}
        <Card className="border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-white rounded-3xl overflow-hidden">
          <CardHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <MapPin className="w-4 h-4 text-sky-600" /> Registered Business &amp; Billing Address
            </div>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Official physical headquarters address shown on tax invoices.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                <Label className="text-xs font-bold text-slate-700">Street Address</Label>
                <Input
                  type="text"
                  placeholder="e.g. Suite 400, Commercial Plaza, MG Road"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">City</Label>
                <Input
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">State</Label>
                <Input
                  type="text"
                  placeholder="e.g. Maharashtra"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Pincode (6 Digits)</Label>
                <Input
                  type="text"
                  placeholder="e.g. 400001"
                  value={formData.pincode}
                  maxLength={6}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  className="text-xs font-mono rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Country</Label>
                <Input
                  type="text"
                  value="India"
                  disabled
                  className="text-xs bg-slate-50 font-medium text-slate-600 rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Invoicing Preferences & Notes */}
        <Card className="border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-white rounded-3xl overflow-hidden">
          <CardHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Receipt className="w-4 h-4 text-sky-600" /> Invoicing Preferences &amp; Terms
            </div>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Customize invoice sequence formatting and default customer remarks.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Invoice Number Prefix</Label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="INV"
                    value={formData.invoice_prefix}
                    maxLength={6}
                    onChange={(e) => handleChange('invoice_prefix', e.target.value.toUpperCase())}
                    className="pl-9 text-xs font-mono font-bold uppercase rounded-xl"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Example: {formData.invoice_prefix || 'INV'}-2026-001</p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-700">Default Terms &amp; Payment Remarks</Label>
                <Input
                  type="text"
                  placeholder="e.g. Thank you for your business. Payment due within 15 days."
                  value={formData.invoice_notes}
                  onChange={(e) => handleChange('invoice_notes', e.target.value)}
                  className="text-xs rounded-xl"
                />
                <p className="text-[10px] text-slate-400">Default text populated in the Remarks field of new invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </form>

      {/* Section 5: Account Security & Password Management */}
      <Card className="border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] bg-white rounded-3xl overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Lock className="w-4 h-4 text-rose-600" /> Account Security &amp; Password Management
          </div>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Update your login credentials securely. Passwords are encrypted with SHA-256 / bcrypt in Supabase Auth.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">New Password *</Label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-9 pr-9 text-xs rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Confirm New Password *</Label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-9 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-slate-400">
                Minimum 6 characters with letters and numbers.
              </p>

              <Button
                type="submit"
                size="sm"
                disabled={changingPassword || !newPassword}
                className="h-10 px-5 text-xs font-bold gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" /> Change Password
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

    </div>
  );
}
