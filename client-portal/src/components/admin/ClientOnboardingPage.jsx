import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, Search, Pencil, Image as ImageIcon, 
  Loader2, Check, UserPlus, ShieldAlert, Eye, EyeOff 
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

export default function ClientOnboardingPage({
  customers = [],
  onBack,
  onCreateCustomer,
  maxLicenses = 25,
  creatingClient = false,
}) {
  const isQuotaExceeded = customers.length >= maxLicenses;

  // Basic Details State
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [clientName, setClientName] = useState('');
  const [fileNo, setFileNo] = useState('');
  const [clientType, setClientType] = useState('Individual');
  const [clientGroup, setClientGroup] = useState('');
  const [pan, setPan] = useState('');
  const [gstin, setGstin] = useState('');
  const [billingProfile, setBillingProfile] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [dob, setDob] = useState('');

  // Portal Credentials
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Contact Details State
  const [mobileNo, setMobileNo] = useState('');
  const [secondaryMobile, setSecondaryMobile] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [state, setState] = useState('Maharashtra');

  // Opening Balance State
  const [hasOpeningBalance, setHasOpeningBalance] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingBalanceType, setOpeningBalanceType] = useState('Dr');

  const [formError, setFormError] = useState('');
  const fileInputRef = useRef(null);

  // Sync contact email with login email if login email hasn't been manually typed yet
  const handleContactEmailChange = (val) => {
    setContactEmail(val);
    if (!loginEmail || loginEmail === contactEmail) {
      setLoginEmail(val);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const targetEmail = (loginEmail || contactEmail || '').trim();
    if (!targetEmail) {
      setFormError('Please provide a valid login email address.');
      return;
    }
    if (!loginPassword || loginPassword.length < 6) {
      setFormError('Temporary password must be at least 6 characters.');
      return;
    }
    if (!clientName.trim()) {
      setFormError('Client Name is required.');
      return;
    }

    const payload = {
      email: targetEmail,
      password: loginPassword,
      fullName: clientName.trim(),
      phone: mobileNo.trim() || undefined,
      fileNo: fileNo.trim() || undefined,
      clientType,
      clientGroup: clientGroup || undefined,
      pan: pan.trim().toUpperCase() || undefined,
      gstin: gstin.trim().toUpperCase() || undefined,
      billingProfile: billingProfile || undefined,
      contactPerson: contactPerson.trim() || undefined,
      dob: dob || undefined,
      secondaryMobile: secondaryMobile.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      pincode: pincode.trim() || undefined,
      state: state || undefined,
      isActive,
      hasOpeningBalance,
      openingBalance: hasOpeningBalance ? Number(openingBalance || 0) : 0,
      openingBalanceType,
      photoUrl: photoPreview || undefined,
    };

    const success = await onCreateCustomer(payload);
    if (success) {
      onBack();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-7xl mx-auto pb-12">
      
      {/* Top Header & Breadcrumbs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <button
                type="button"
                onClick={onBack}
                className="hover:text-emerald-700 transition-colors"
              >
                Client Directory
              </button>
              <span>/</span>
              <span className="text-slate-900 font-bold">Onboard New Client</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              New Client Profile Registration
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            disabled={creatingClient}
            className="text-xs h-9 px-4"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="client-onboarding-form"
            variant="accent"
            size="sm"
            disabled={creatingClient || isQuotaExceeded}
            className="text-xs h-9 px-5 font-semibold gap-1.5 shadow-sm"
          >
            {creatingClient ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Registering Client...
              </>
            ) : isQuotaExceeded ? (
              "License Quota Reached"
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Save &amp; Onboard Client
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quota Limit Reached Warning */}
      {isQuotaExceeded && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-medium flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold text-amber-950 text-sm">License Quota Reached ({customers.length} / {maxLicenses} Max Active)</p>
              <p className="text-amber-800 mt-0.5 text-xs">You have utilized all allocated client licenses. Please contact your Platform Owner to increase your license quota before onboarding new clients.</p>
            </div>
          </div>
        </div>
      )}

      {formError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2 shadow-sm animate-in shake">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main 2-Column Responsive Form */}
      <form id="client-onboarding-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ================= LEFT COLUMN: BASIC DETAILS (7 cols) ================= */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Basic Details
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              
              {/* Photo Box & Edit Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-700">Photo</span>
                
                <div className="flex flex-col items-center gap-2">
                  <div className="w-32 h-32 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden relative shadow-inner">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Client avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-slate-300" />
                    )}
                  </div>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-md -mt-5 z-10 border-2 border-white"
                    title="Upload or change photo"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Is Active Toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">Is Active?</Label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Client Name & File No. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Client Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Rahul Sharma / Acme Technologies"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                    className="h-10 text-xs bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">File No.</Label>
                  <Input
                    placeholder="e.g. FIL-2026-089"
                    value={fileNo}
                    onChange={(e) => setFileNo(e.target.value)}
                    className="h-10 text-xs bg-white border-slate-200"
                  />
                </div>
              </div>

              {/* Type & Select Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Type <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={clientType}
                    onChange={(e) => setClientType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CLIENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Select Group</Label>
                  <select
                    value={clientGroup}
                    onChange={(e) => setClientGroup(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select...</option>
                    {CLIENT_GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PAN & GSTIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">PAN</Label>
                  <Input
                    placeholder="ABCDE1234F"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="h-10 text-xs font-mono uppercase bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">GSTIN</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="27AAAAA0000A1Z5"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      maxLength={15}
                      className="h-10 text-xs font-mono uppercase bg-white border-slate-200"
                    />
                    <button
                      type="button"
                      title="Verify GSTIN"
                      onClick={() => {
                        if (gstin) {
                          alert(`GSTIN verification initialized for: ${gstin}`);
                        }
                      }}
                      className="h-10 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition-colors flex items-center justify-center shrink-0"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Billing Profile & Contact Person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Billing Profile (Bill To)</Label>
                  <select
                    value={billingProfile}
                    onChange={(e) => setBillingProfile(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select...</option>
                    <option value="same">Same as Client</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name || c.email}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">
                    Select the client that should receive invoices for this client.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Contact Person Name</Label>
                  <Input
                    placeholder="e.g. Mr. Rajesh Kumar"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="h-10 text-xs bg-white border-slate-200"
                  />
                  <p className="text-[10px] text-slate-400">
                    This name will be used in birthday messages.
                  </p>
                </div>
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5 max-w-xs">
                <Label className="text-xs font-semibold text-slate-700">Date of Birth</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="h-10 text-xs bg-white border-slate-200"
                  />
                </div>
              </div>

              {/* Portal Login Credentials Card Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Portal Login Credentials (User Access)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Credentials required for the client to log in at the client portal.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Login Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="client@company.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="h-10 text-xs bg-white border-slate-200 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Temporary Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-10 text-xs bg-white border-slate-200 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        title={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">Min 6 characters</p>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* ================= RIGHT COLUMN: CONTACT DETAILS & OPENING BALANCE (5 cols) ================= */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Contact Details Card */}
          <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Contact Details
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              
              {/* Mobile Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Mobile No.</Label>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                    className="h-10 text-xs bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Secondary Mobile No.</Label>
                  <Input
                    type="tel"
                    placeholder="Optional phone"
                    value={secondaryMobile}
                    onChange={(e) => setSecondaryMobile(e.target.value)}
                    className="h-10 text-xs bg-white border-slate-200"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Email</Label>
                <Input
                  type="email"
                  placeholder="contact@company.com"
                  value={contactEmail}
                  onChange={(e) => handleContactEmailChange(e.target.value)}
                  className="h-10 text-xs bg-white border-slate-200 font-mono"
                />
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Address</Label>
                <textarea
                  rows={3}
                  placeholder="Street address, building, suite..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                />
              </div>

              {/* City, Pincode, State */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">City</Label>
                  <Input
                    placeholder="e.g. Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-10 text-xs bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Pincode</Label>
                  <Input
                    placeholder="400001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    maxLength={6}
                    className="h-10 text-xs bg-white border-slate-200 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">State</Label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Opening Balance Card */}
          <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Opening Balance
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Set Opening Balance</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasOpeningBalance}
                    onChange={(e) => setHasOpeningBalance(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {hasOpeningBalance && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Amount (₹)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(e.target.value)}
                        className="h-10 text-xs bg-white border-slate-200 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Balance Type</Label>
                      <select
                        value={openingBalanceType}
                        onChange={(e) => setOpeningBalanceType(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Dr">Debit (Receivable from Client)</option>
                        <option value="Cr">Credit (Advance / Payable to Client)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Save Action Panel */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white flex items-center justify-between gap-4 shadow-xl">
            <div>
              <p className="text-xs font-bold text-white">Ready to activate client?</p>
              <p className="text-[11px] text-slate-400">Account will be created and 360° workspace initialized.</p>
            </div>

            <Button
              type="submit"
              variant="accent"
              size="sm"
              disabled={creatingClient || isQuotaExceeded}
              className="text-xs h-9 px-5 font-semibold gap-1.5 shrink-0"
            >
              {creatingClient ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : isQuotaExceeded ? (
                "Quota Limit Reached"
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save Profile
                </>
              )}
            </Button>
          </div>

        </div>

      </form>
    </div>
  );
}
