import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import OwnerHeader from './OwnerHeader';
import CompanySettings from '../admin/CompanySettings/CompanySettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Building2, Users, Receipt, FolderOpen, Clock, Plus, 
  Search, X, Loader2, Check, Sparkles, TrendingUp
} from 'lucide-react';

export default function OwnerDashboard({ session }) {
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return sessionStorage.getItem('owner_active_tab') || 'governance';
    } catch {
      return 'governance';
    }
  });

  const setActiveTab = (tab) => {
    try {
      sessionStorage.setItem('owner_active_tab', tab);
    } catch (e) {
      console.warn('Failed to save tab in sessionStorage', e);
    }
    setActiveTabState(tab);
  };
  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Provisioning Modal State
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newMaxLicenses, setNewMaxLicenses] = useState(50);
  const [newFeatureInvoices, setNewFeatureInvoices] = useState(true);
  const [newFeatureDocuments, setNewFeatureDocuments] = useState(false);
  const [newFeatureWorkTracker, setNewFeatureWorkTracker] = useState(false);

  const toast = useToast();
  const { signOut } = useAuth();

  // Load All Organizations & Users
  const loadMasterData = useCallback(async () => {
    try {
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;
      if (orgsData) setOrganizations(orgsData);

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;
      if (usersData) setUsers(usersData);

    } catch (err) {
      console.error('Error loading master owner data:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const { data: orgsData } = await supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false });

        if (isMounted && orgsData) setOrganizations(orgsData);

        const { data: usersData } = await supabase
          .from('users')
          .select('*');

        if (isMounted && usersData) setUsers(usersData);
      } catch (err) {
        console.error('Error in initial load:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute stats per organization
  const orgStatsMap = useMemo(() => {
    const map = new Map();
    for (const org of organizations) {
      map.set(org.id, { clientCount: 0, adminEmail: org.contact_email || '—' });
    }
    for (const u of users) {
      const orgId = u.organization_id || '00000000-0000-0000-0000-000000000001';
      if (map.has(orgId)) {
        if (u.role === 'customer') {
          map.get(orgId).clientCount++;
        } else if (u.role === 'admin' || u.role === 'distributor') {
          map.get(orgId).adminEmail = u.email;
        }
      }
    }
    return map;
  }, [organizations, users]);

  // Global Platform Metrics
  const platformMetrics = useMemo(() => {
    const totalDistributors = organizations.length;
    let totalAllocatedLicenses = 0;
    let totalClientsSold = 0;

    for (const org of organizations) {
      totalAllocatedLicenses += Number(org.max_licenses || 25);
      const stats = orgStatsMap.get(org.id);
      if (stats) {
        totalClientsSold += stats.clientCount;
      }
    }

    const utilizationRate = totalAllocatedLicenses > 0 
      ? Math.round((totalClientsSold / totalAllocatedLicenses) * 100) 
      : 0;

    return {
      totalDistributors,
      totalAllocatedLicenses,
      totalClientsSold,
      utilizationRate,
    };
  }, [organizations, orgStatsMap]);

  // 1-Click Update Feature Flags for a Distributor
  const handleToggleFeature = async (orgId, featureKey, currentVal) => {
    const newVal = !currentVal;
    
    // Optimistic UI Update
    setOrganizations(prev => prev.map(org => {
      if (org.id === orgId) {
        return { ...org, [featureKey]: newVal };
      }
      return org;
    }));

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ [featureKey]: newVal, updated_at: new Date().toISOString() })
        .eq('id', orgId);

      if (error) throw error;

      const featureName = featureKey === 'feature_invoices' ? 'Invoices' 
        : featureKey === 'feature_documents' ? 'Documents Vault' 
        : 'Work Status Tracker';

      toast.success(
        'Feature Permission Updated',
        `${featureName} is now ${newVal ? 'ENABLED' : 'DISABLED'} for this distributor's clients.`
      );
    } catch (err) {
      toast.error('Update Failed', err.message);
      loadMasterData(); // Rollback
    }
  };

  // Manual License Quota Saver (Triggered only when Confirm/Save is clicked)
  const handleSaveLicenseQuota = async (orgId, newMax) => {
    const org = organizations.find(o => o.id === orgId);
    if (!org) return;

    // Optimistic Update
    setOrganizations(prev => prev.map(o => o.id === orgId ? { ...o, max_licenses: newMax } : o));

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ max_licenses: newMax, updated_at: new Date().toISOString() })
        .eq('id', orgId);

      if (error) throw error;

      toast.success('License Quota Confirmed', `${org.name} capacity set to ${newMax} licenses.`);
    } catch (err) {
      toast.error('Save Failed', err.message);
      loadMasterData();
    }
  };

  // Provision New Distributor
  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newAdminEmail.trim() || !newAdminPassword) return;

    setProvisioning(true);
    try {
      const slug = (newOrgSlug.trim() || newOrgName.trim())
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // 1. Insert new organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          name: newOrgName.trim(),
          slug: `${slug}-${Date.now().toString().slice(-4)}`,
          max_licenses: Number(newMaxLicenses) || 50,
          feature_invoices: newFeatureInvoices,
          feature_documents: newFeatureDocuments,
          feature_work_tracker: newFeatureWorkTracker,
          contact_email: newAdminEmail.trim(),
        }])
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Create distributor administrator account
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );

      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: newAdminEmail.trim(),
        password: newAdminPassword,
        options: {
          data: {
            full_name: `${newOrgName.trim()} Partner`,
            role: 'distributor',
            organization_id: newOrg.id,
          },
        },
      });

      if (authError) throw authError;

      // Update user record with role and organization
      if (authData?.user?.id) {
        await supabase
          .from('users')
          .update({
            organization_id: newOrg.id,
            role: 'distributor',
            full_name: `${newOrgName.trim()} Partner`,
          })
          .eq('id', authData.user.id);
      }

      toast.success(
        'Distributor Provisioned',
        `Created license for ${newOrgName} (${newMaxLicenses} capacity). Admin login: ${newAdminEmail}`
      );

      // Reset form
      setNewOrgName('');
      setNewOrgSlug('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewMaxLicenses(50);
      setIsProvisionModalOpen(false);

      await loadMasterData();
    } catch (err) {
      toast.error('Provisioning Failed', err.message);
    } finally {
      setProvisioning(false);
    }
  };

  // Filtered organizations list
  const filteredOrgs = useMemo(() => {
    if (!searchQuery.trim()) return organizations;
    const q = searchQuery.toLowerCase().trim();
    return organizations.filter(o => 
      (o.name && o.name.toLowerCase().includes(q)) || 
      (o.slug && o.slug.toLowerCase().includes(q)) ||
      (o.contact_email && o.contact_email.toLowerCase().includes(q))
    );
  }, [organizations, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 font-sans">
      
      {/* Top Owner Header */}
      <OwnerHeader
        ownerEmail={session?.user?.email}
        distributorCount={platformMetrics.totalDistributors}
        totalLicenses={platformMetrics.totalAllocatedLicenses}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignOut={signOut}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* TAB 1: GOVERNANCE & METRICS */}
        {activeTab === 'governance' && (
          <>
            {/* ================= SECTION 1: MASTER PLATFORM KPI CARDS ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Active Distributors */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Licensed Distributors</span>
              <Building2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {platformMetrics.totalDistributors}
            </div>
            <p className="text-[11px] text-slate-400">
              Independent partner firm accounts
            </p>
          </div>

          {/* Card 2: Total Licenses Allocated */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Quota Allocated</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
              {platformMetrics.totalAllocatedLicenses}
            </div>
            <p className="text-[11px] text-slate-400">
              Sub-licenses distributed to partners
            </p>
          </div>

          {/* Card 3: Active Client Licenses Sold */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Active Clients Sold</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-cyan-300 font-mono">
              {platformMetrics.totalClientsSold}
            </div>
            <p className="text-[11px] text-slate-400">
              Live end-client accounts onboarded
            </p>
          </div>

          {/* Card 4: Platform Utilization Rate */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">License Utilization</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-300 font-mono">
              {platformMetrics.utilizationRate}%
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${platformMetrics.utilizationRate}%` }}
              />
            </div>
          </div>

        </div>

        {/* ================= SECTION 2: DISTRIBUTOR LICENSE & PERMISSIONS TABLE ================= */}
        <div className="space-y-4">
          
          {/* Section Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" /> Distributor License &amp; Feature Governance
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Adjust maximum client capacity and toggle end-client feature modules with 1 click.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search distributors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-xl bg-slate-900 border border-slate-800 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <Button
                variant="accent"
                size="sm"
                onClick={() => setIsProvisionModalOpen(true)}
                className="h-9 px-4 text-xs font-bold gap-1.5 shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/50"
              >
                <Plus className="w-4 h-4" /> Provision Distributor
              </Button>
            </div>
          </div>

          {/* Master Table Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <p className="p-8 text-center text-xs text-slate-400">Loading platform distributors...</p>
              ) : filteredOrgs.length === 0 ? (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <Building2 className="w-10 h-10 mx-auto text-slate-700" />
                  <p className="text-sm font-bold text-slate-300">No distributors found</p>
                  <p className="text-xs text-slate-500">Provision your first partner distributor above.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs min-w-[900px]">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-4 pl-5">Distributor / Partner Firm</th>
                      <th className="p-4">License Capacity (Quota)</th>
                      <th className="p-4">Clients Sold</th>
                      <th className="p-4">1-Click End-Client (cx) Features</th>
                      <th className="p-4 pr-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredOrgs.map((org) => {
                      const stats = orgStatsMap.get(org.id) || { clientCount: 0, adminEmail: '—' };
                      const maxLic = Number(org.max_licenses || 25);
                      const usagePercent = Math.min(100, Math.round((stats.clientCount / maxLic) * 100));

                      const isDefaultOrg = org.id === '00000000-0000-0000-0000-000000000001';

                      return (
                        <tr key={org.id} className="hover:bg-slate-800/40 transition-colors">
                          
                          {/* Col 1: Distributor Name & Admin */}
                          <td className="p-4 pl-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-extrabold text-sm shadow-md">
                                {org.name[0]?.toUpperCase() || 'D'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-sm">
                                    {org.name}
                                  </span>
                                  {isDefaultOrg && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                                      Primary Firm
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  Admin: {stats.adminEmail || org.contact_email || '—'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Col 2: Manual License Quota Input with Confirm Button */}
                          <td className="p-4">
                            <LicenseQuotaEditor
                              key={`${org.id}-${maxLic}`}
                              orgId={org.id}
                              currentQuota={maxLic}
                              onSave={handleSaveLicenseQuota}
                            />
                          </td>

                          {/* Col 3: Clients Sold vs Max */}
                          <td className="p-4">
                            <div className="space-y-1 max-w-[140px]">
                              <div className="flex justify-between items-center text-[11px] font-mono">
                                <span className="text-white font-bold">{stats.clientCount} Active</span>
                                <span className="text-slate-500">/ {maxLic}</span>
                              </div>
                              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Col 4: 1-Click Feature Flag Matrix for cx */}
                          <td className="p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              
                              {/* 1. Invoices Feature Flag */}
                              <button
                                type="button"
                                onClick={() => handleToggleFeature(org.id, 'feature_invoices', org.feature_invoices !== false)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all border ${
                                  org.feature_invoices !== false
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50 shadow-sm'
                                    : 'bg-slate-950 text-slate-500 border-slate-800 opacity-60'
                                }`}
                                title="Click to toggle Invoices feature for this distributor's clients"
                              >
                                <Receipt className="w-3 h-3" /> Invoices
                                <span className="text-[9px] uppercase tracking-wider font-mono">
                                  {org.feature_invoices !== false ? 'ON' : 'OFF'}
                                </span>
                              </button>

                              {/* 2. Documents Feature Flag */}
                              <button
                                type="button"
                                onClick={() => handleToggleFeature(org.id, 'feature_documents', Boolean(org.feature_documents))}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all border ${
                                  org.feature_documents
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50 shadow-sm'
                                    : 'bg-slate-950 text-slate-500 border-slate-800 opacity-60'
                                }`}
                                title="Click to toggle Document Vault for this distributor's clients"
                              >
                                <FolderOpen className="w-3 h-3" /> Docs
                                <span className="text-[9px] uppercase tracking-wider font-mono">
                                  {org.feature_documents ? 'ON' : 'OFF'}
                                </span>
                              </button>

                              {/* 3. Work Status Tracker Feature Flag */}
                              <button
                                type="button"
                                onClick={() => handleToggleFeature(org.id, 'feature_work_tracker', Boolean(org.feature_work_tracker))}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all border ${
                                  org.feature_work_tracker
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50 shadow-sm'
                                    : 'bg-slate-950 text-slate-500 border-slate-800 opacity-60'
                                }`}
                                title="Click to toggle Live Work Status Tracker for this distributor's clients"
                              >
                                <Clock className="w-3 h-3" /> Tracker
                                <span className="text-[9px] uppercase tracking-wider font-mono">
                                  {org.feature_work_tracker ? 'ON' : 'OFF'}
                                </span>
                              </button>

                            </div>
                          </td>

                          {/* Col 5: Status */}
                          <td className="p-4 pr-5 text-right">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active License
                            </span>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </>
    )}

        {/* TAB 2: PLATFORM SETTINGS & SECURITY */}
        {activeTab === 'settings' && (
          <div className="pt-2">
            <CompanySettings
              key={organizations.find(o => o.id === '00000000-0000-0000-0000-000000000001')?.id || 'master-owner-settings'}
              organization={organizations.find(o => o.id === '00000000-0000-0000-0000-000000000001') || organizations[0]}
              onUpdateOrganization={(updated) => {
                setOrganizations(prev => prev.map(o => o.id === updated.id ? updated : o));
              }}
            />
          </div>
        )}

      </main>

      {/* Provision Distributor Modal */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Provision Distributor License</h3>
                  <p className="text-[11px] text-slate-400">Create new partner firm tenant with custom quotas and permissions.</p>
                </div>
              </div>
              <button
                onClick={() => setIsProvisionModalOpen(false)}
                disabled={provisioning}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} className="p-6 space-y-4">
              
              {/* Org Name & Custom Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">
                    Partner / Firm Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Apex Wealth Advisors"
                    value={newOrgName}
                    onChange={(e) => {
                      setNewOrgName(e.target.value);
                      if (!newOrgSlug) {
                        setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                      }
                    }}
                    required
                    className="h-9 text-xs bg-slate-950 border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">
                    License Quota (Max Clients)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={newMaxLicenses}
                    onChange={(e) => setNewMaxLicenses(e.target.value)}
                    required
                    className="h-9 text-xs bg-slate-950 border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              {/* Distributor Admin Login Credentials */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Distributor Administrator Access
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-300">Admin Email *</Label>
                    <Input
                      type="email"
                      placeholder="partner@firm.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      required
                      className="h-8 text-xs bg-slate-900 border-slate-800 text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-300">Password *</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-8 text-xs bg-slate-900 border-slate-800 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Default Feature Flags for their clients */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">
                  Default Features for End Clients (cx)
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewFeatureInvoices(!newFeatureInvoices)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      newFeatureInvoices
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    <Receipt className="w-4 h-4 mb-1" />
                    <span className="block text-[11px]">Invoices</span>
                    <span className="text-[9px] font-mono opacity-75">{newFeatureInvoices ? 'ENABLED' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewFeatureDocuments(!newFeatureDocuments)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      newFeatureDocuments
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    <FolderOpen className="w-4 h-4 mb-1" />
                    <span className="block text-[11px]">Documents</span>
                    <span className="text-[9px] font-mono opacity-75">{newFeatureDocuments ? 'ENABLED' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewFeatureWorkTracker(!newFeatureWorkTracker)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      newFeatureWorkTracker
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    <Clock className="w-4 h-4 mb-1" />
                    <span className="block text-[11px]">Tracker</span>
                    <span className="text-[9px] font-mono opacity-75">{newFeatureWorkTracker ? 'ENABLED' : 'OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsProvisionModalOpen(false)}
                  disabled={provisioning}
                  className="text-xs h-9 text-slate-300 border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  size="sm"
                  disabled={provisioning}
                  className="text-xs h-9 px-5 font-bold gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md"
                >
                  {provisioning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Provisioning...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Issue License
                    </>
                  )}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline Manual License Quota Editor (Sends request to Supabase ONLY on Confirm)
function LicenseQuotaEditor({ orgId, currentQuota, onSave }) {
  const [quota, setQuota] = useState(currentQuota);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const hasChanged = Number(quota) !== Number(currentQuota) && Number(quota) > 0;

  const handleConfirm = async (e) => {
    if (e) e.preventDefault();
    if (!hasChanged || saving) return;

    setSaving(true);
    try {
      const val = Math.max(1, Number(quota) || 1);
      await onSave(orgId, val);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setQuota(currentQuota);
  };

  return (
    <form onSubmit={handleConfirm} className="flex items-center gap-1.5">
      <div className="relative">
        <input
          type="number"
          min={1}
          value={quota}
          onChange={(e) => {
            setQuota(e.target.value);
            setIsSaved(false);
          }}
          className={`h-8 w-24 rounded-lg bg-slate-950 border px-2.5 text-xs font-mono font-bold text-center focus:outline-none transition-all ${
            hasChanged 
              ? 'border-amber-500 text-amber-300 ring-2 ring-amber-500/20' 
              : 'border-slate-800 text-emerald-400 focus:border-slate-700'
          }`}
          placeholder="Quota"
        />
      </div>

      {hasChanged ? (
        <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
          <button
            type="submit"
            disabled={saving}
            className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-950 transition-all disabled:opacity-50"
            title="Confirm & save new license quota to database"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Save</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="h-8 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
            title="Cancel changes"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : isSaved ? (
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-1 rounded-md flex items-center gap-1 animate-in fade-in">
          <Check className="w-3 h-3" /> Saved
        </span>
      ) : (
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider pl-1">
          Max
        </span>
      )}
    </form>
  );
}
