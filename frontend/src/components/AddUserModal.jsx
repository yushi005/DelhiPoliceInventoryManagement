import { useEffect, useState } from 'react';
import { getDistricts, getUnits, createUser } from '../api';

// Superadmin-only: create a new user. District is required for officer/admin,
// Unit is additionally required for officer. The backend hashes the password.
export default function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', badge_id: '', password: '', role: 'officer', district_id: '', unit_id: '',
  });
  const [districts, setDistricts] = useState([]);
  const [units, setUnits] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { getDistricts().then(r => setDistricts(r.data)).catch(() => setDistricts([])); }, []);

  // Reload the unit dropdown whenever the selected district changes.
  useEffect(() => {
    if (!form.district_id) { setUnits([]); return; }
    getUnits(form.district_id).then(r => setUnits(r.data)).catch(() => setUnits([]));
    set('unit_id', '');
  }, [form.district_id]);

  const needsDistrict = form.role === 'officer' || form.role === 'admin';
  const needsUnit = form.role === 'officer';

  const submit = async () => {
    setError('');
    if (!form.name.trim() || !form.badge_id.trim() || !form.password) {
      setError('Full name, username and password are required.');
      return;
    }
    if (needsDistrict && !form.district_id) { setError('District is required for this role.'); return; }
    if (needsUnit && !form.unit_id) { setError('Unit is required for officers.'); return; }

    const payload = {
      name: form.name.trim(),
      badge_id: form.badge_id.trim(),
      password: form.password,
      role: form.role,
      district_id: form.district_id ? parseInt(form.district_id) : null,
      unit_id: form.unit_id ? parseInt(form.unit_id) : null,
    };

    setSaving(true);
    try {
      await createUser(payload);
      onCreated?.(`User "${form.name.trim()}" created successfully.`);
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full border rounded-lg px-4 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d1b4b]";
  const labelClass = "text-sm font-medium text-gray-700";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#0d1b4b]">Add New User</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Close">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div><label className={labelClass}>Full Name *</label>
            <input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div><label className={labelClass}>Username / Badge ID *</label>
            <input className={inputClass} value={form.badge_id} onChange={e => set('badge_id', e.target.value)} placeholder="e.g. DP0099" /></div>
          <div><label className={labelClass}>Password *</label>
            <input type="password" className={inputClass} value={form.password} onChange={e => set('password', e.target.value)} /></div>
          <div><label className={labelClass}>Role *</label>
            <select className={inputClass} value={form.role} onChange={e => set('role', e.target.value)}>
              {['officer', 'admin', 'superadmin'].map(r => <option key={r} value={r}>{r}</option>)}
            </select></div>
          {needsDistrict && (
            <div><label className={labelClass}>District *</label>
              <select className={inputClass} value={form.district_id} onChange={e => set('district_id', e.target.value)}>
                <option value="">Select district</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select></div>
          )}
          {needsUnit && (
            <div><label className={labelClass}>Unit *</label>
              <select className={inputClass} value={form.unit_id} onChange={e => set('unit_id', e.target.value)} disabled={!form.district_id}>
                <option value="">{form.district_id ? 'Select unit' : 'Select a district first'}</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select></div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="border border-gray-300 px-5 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="bg-[#0d1b4b] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#1a2e6b] disabled:opacity-50">
            {saving ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}
