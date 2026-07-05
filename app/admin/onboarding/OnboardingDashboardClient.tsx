"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import {
  Organization,
  Branch,
  Unit,
  getActiveOrganizations,
  getActiveBranchesByOrganization,
  getActiveUnitsByBranch,
  createOrganization,
  updateOrganization,
  softDeleteOrganization,
  createBranch,
  updateBranch,
  softDeleteBranch,
  createUnit,
  updateUnit,
  softDeleteUnit,
} from '@/lib/hierarchyService';
import { getCountries, getStatesForCountry } from '@/lib/locationService';
import { formatDate } from '@/lib/dateUtils';

// --- Components ---

interface TabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const Tab = ({ label, isActive, onClick }: TabProps) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 text-sm font-semibold transition-colors ${
      isActive
        ? 'border-b-2 border-slate-900 text-slate-900 dark:border-white dark:text-white'
        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
    }`}
  >
    {label}
  </button>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-900">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// --- Main Component ---

export default function OnboardingDashboardClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'organizations' | 'branches' | 'units'>('organizations');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingEntity, setEditingEntity] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<any>({});
  
  // Location states
  const countries = getCountries();
  const [selectedCountry, setSelectedCountry] = useState('NG');
  const states = getStatesForCountry(selectedCountry);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'organizations') {
        const data = await getActiveOrganizations();
        setOrganizations(data);
      } else if (activeTab === 'branches') {
        const allOrgs = await getActiveOrganizations();
        let allBranches: Branch[] = [];
        for (const org of allOrgs) {
          const orgBranches = await getActiveBranchesByOrganization(org.id);
          allBranches = [...allBranches, ...orgBranches];
        }
        setBranches(allBranches);
      } else if (activeTab === 'units') {
        const allOrgs = await getActiveOrganizations();
        let allUnits: Unit[] = [];
        for (const org of allOrgs) {
          const orgBranches = await getActiveBranchesByOrganization(org.id);
          for (const branch of orgBranches) {
            const branchUnits = await getActiveUnitsByBranch(branch.id);
            allUnits = [...allUnits, ...branchUnits];
          }
        }
        setUnits(allUnits);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadData();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login/admin');
  };

  const openAddModal = () => {
    setEditingEntity(null);
    setFormData({});
    setIsModalOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEditModal = (entity: any) => {
    setEditingEntity(entity);
    setFormData(entity);
    if (activeTab === 'organizations') {
      setSelectedCountry(entity.country || 'NG');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      if (activeTab === 'organizations') {
        if (editingEntity) {
          await updateOrganization(editingEntity.id, formData, user.uid);
        } else {
          await createOrganization({
            name: formData.name,
            organizationType: formData.organizationType,
            country: formData.country || 'NG',
            state: formData.state,
            city: formData.city,
            address: formData.address,
            phoneNumber: formData.phoneNumber,
            officialEmail: formData.officialEmail,
            website: formData.website,
            adminUid: user.uid, // Temporary, will be replaced in Milestone 3
          }, user.uid);
        }
      } else if (activeTab === 'branches') {
        if (editingEntity) {
          await updateBranch(editingEntity.id, formData, user.uid);
        } else {
          await createBranch({
            name: formData.name,
            organizationId: formData.organizationId,
            address: formData.address,
            state: formData.state,
            city: formData.city,
            contactNumber: formData.contactNumber,
            branchAdminUid: user.uid, // Temporary
          }, user.uid);
        }
      } else if (activeTab === 'units') {
        if (editingEntity) {
          await updateUnit(editingEntity.id, formData, user.uid);
        } else {
          await createUnit({
            name: formData.name,
            branchId: formData.branchId,
            organizationId: formData.organizationId,
            unitAdminUid: user.uid, // Temporary
            members: [],
            roles: {},
          }, user.uid);
        }
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Save failed:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this entity? This is a soft-delete and historical data will be preserved.')) return;
    
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      if (activeTab === 'organizations') await softDeleteOrganization(id, user.uid);
      else if (activeTab === 'branches') await softDeleteBranch(id, user.uid);
      else if (activeTab === 'units') await softDeleteUnit(id, user.uid);
      
      loadData();
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to deactivate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <nav className="border-b border-slate-200 bg-white px-8 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold tracking-tight">SafeReport Admin</h1>
            <div className="flex gap-2">
              <Link href="/admin" className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Reports</Link>
              <Link href="/admin/onboarding" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900">Onboarding</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="text-sm font-semibold text-rose-600 hover:text-rose-700">Logout</button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl p-8">
        <header className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Institutional Management</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Manage organizations, branches, and units across the platform.</p>
          </div>
          <button
            onClick={openAddModal}
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            + Add {activeTab === 'organizations' ? 'Organization' : activeTab === 'branches' ? 'Branch' : 'Unit'}
          </button>
        </header>

        <div className="mb-8 border-b border-slate-200 dark:border-slate-800">
          <div className="flex gap-4">
            <Tab label="Organizations" isActive={activeTab === 'organizations'} onClick={() => setActiveTab('organizations')} />
            <Tab label="Branches" isActive={activeTab === 'branches'} onClick={() => setActiveTab('branches')} />
            <Tab label="Units" isActive={activeTab === 'units'} onClick={() => setActiveTab('units')} />
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Name</th>
                  {activeTab === 'organizations' && (
                    <>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider">Location</th>
                    </>
                  )}
                  {activeTab === 'branches' && (
                    <>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider">Organization</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider">Location</th>
                    </>
                  )}
                  {activeTab === 'units' && (
                    <>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider">Branch</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider">Members</th>
                    </>
                  )}
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading data...</td>
                  </tr>
                ) : activeTab === 'organizations' ? (
                  organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-bold">{org.name}</td>
                      <td className="px-6 py-4 capitalize">{org.organizationType.replace('_', ' ')}</td>
                      <td className="px-6 py-4">{org.city}, {org.state}, {org.country}</td>
                      <td className="px-6 py-4">{formatDate(org.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEditModal(org)} className="mr-4 text-blue-600 hover:text-blue-700">Edit</button>
                        <button onClick={() => handleDelete(org.id)} className="text-rose-600 hover:text-rose-700">Delete</button>
                      </td>
                    </tr>
                  ))
                ) : activeTab === 'branches' ? (
                  branches.map((branch) => (
                    <tr key={branch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-bold">{branch.name}</td>
                      <td className="px-6 py-4">{organizations.find(o => o.id === branch.organizationId)?.name || 'Unknown'}</td>
                      <td className="px-6 py-4">{branch.city}, {branch.state}</td>
                      <td className="px-6 py-4">{formatDate(branch.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEditModal(branch)} className="mr-4 text-blue-600 hover:text-blue-700">Edit</button>
                        <button onClick={() => handleDelete(branch.id)} className="text-rose-600 hover:text-rose-700">Delete</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  units.map((unit) => (
                    <tr key={unit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-bold">{unit.name}</td>
                      <td className="px-6 py-4">{branches.find(b => b.id === unit.branchId)?.name || 'Unknown'}</td>
                      <td className="px-6 py-4">{unit.members.length} Members</td>
                      <td className="px-6 py-4">{formatDate(unit.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEditModal(unit)} className="mr-4 text-blue-600 hover:text-blue-700">Edit</button>
                        <button onClick={() => handleDelete(unit.id)} className="text-rose-600 hover:text-rose-700">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingEntity ? 'Edit' : 'Add'} ${activeTab.slice(0, -1)}`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {activeTab === 'organizations' && (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wide text-slate-500">Name</label>
                  <input
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wide text-slate-500">Type</label>
                  <select
                    required
                    value={formData.organizationType || ''}
                    onChange={(e) => setFormData({ ...formData, organizationType: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                  >
                    <option value="">Select Type</option>
                    <option value="police">Police</option>
                    <option value="hospital">Hospital</option>
                    <option value="fire_service">Fire Service</option>
                    <option value="road_safety">Road Safety</option>
                    <option value="civil_defense">Civil Defense</option>
                    <option value="court">Court</option>
                    <option value="ngo">NGO</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wide text-slate-500">Country</label>
                  <select
                    required
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      setFormData({ ...formData, country: e.target.value, state: '' });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                  >
                    {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wide text-slate-500">State</label>
                  <select
                    required
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                  >
                    <option value="">Select State</option>
                    {states.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wide text-slate-500">City</label>
                  <input
                    required
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wide text-slate-500">Address</label>
                <textarea
                  required
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                  rows={2}
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wide text-slate-500">Official Email</label>
                  <input
                    type="email"
                    required
                    value={formData.officialEmail || ''}
                    onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wide text-slate-500">Phone Number</label>
                  <input
                    required
                    value={formData.phoneNumber || ''}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'branches' && (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wide text-slate-500">Branch Name</label>
                  <input
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wide text-slate-500">Organization</label>
                  <select
                    required
                    value={formData.organizationId || ''}
                    onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                  >
                    <option value="">Select Organization</option>
                    {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wide text-slate-500">State</label>
                  <input
                    required
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wide text-slate-500">City</label>
                  <input
                    required
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wide text-slate-500">Address</label>
                <textarea
                  required
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wide text-slate-500">Contact Number</label>
                <input
                  required
                  value={formData.contactNumber || ''}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                />
              </div>
            </>
          )}

          {activeTab === 'units' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wide text-slate-500">Unit Name</label>
                <input
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wide text-slate-500">Organization</label>
                  <select
                    required
                    value={formData.organizationId || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, organizationId: e.target.value, branchId: '' });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                  >
                    <option value="">Select Organization</option>
                    {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wide text-slate-500">Branch</label>
                  <select
                    required
                    value={formData.branchId || ''}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-white"
                  >
                    <option value="">Select Branch</option>
                    {branches
                      .filter(b => b.organizationId === formData.organizationId)
                      .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
