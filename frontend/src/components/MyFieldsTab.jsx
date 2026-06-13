import { useEffect, useState } from 'react';

const BASE = 'http://127.0.0.1:8000';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function MyFieldsTab() {
  const [fields, setFields] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    name: '', field_type: 'text', options: '', required: false, active: true
  });

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${BASE}/custom_fields/`, { headers: authHeader() });
    const data = await res.json();
    setFields(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const submit = async () => {
    if (!form.name.trim()) return showToast('Field name is required');
    if (form.field_type === 'dropdown' && !form.options.trim()) return showToast('Dropdown needs options');

    const payload = {
      name: form.name.trim(),
      field_type: form.field_type,
      options: form.field_type === 'dropdown' ? form.options.split(',').map(o => o.trim()).filter(Boolean) : [],
      required: form.required,
      active: form.active,
    };

    const res = await fetch(`${BASE}/custom_fields/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showToast('Field created successfully');
      setShowForm(false);
      setForm({ name: '', field_type: 'text', options: '', required: false, active: true });
      load();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Error creating field');
    }
  };

  const toggle = async (field) => {
    await fetch(`${BASE}/custom_fields/${field.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ active: !field.active }),
    });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this field? All responses will be lost.')) return;
    await fetch(`${BASE}/custom_fields/${id}`, { method: 'DELETE', headers: authHeader() });
    showToast('Field deleted');
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-700">My Fields</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-[#0d1b4b] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#1a2e6b]">
          + Add Field
        </button>
      </div>

      {/* Add field form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-5 mb-6 border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">New Custom Field</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Field Name</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-[#0d1b4b]"
                placeholder="e.g. License Number"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Field Type</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-[#0d1b4b]"
                value={form.field_type} onChange={e => setForm({ ...form, field_type: e.target.value })}>
                {['text', 'dropdown', 'number', 'date', 'boolean'].map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            {form.field_type === 'dropdown' && (
              <div className="col-span-2">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Options (comma separated)</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-[#0d1b4b]"
                  placeholder="e.g. Option A, Option B, Option C"
                  value={form.options} onChange={e => setForm({ ...form, options: e.target.value })} />
              </div>
            )}
            <div className="flex items-center gap-4 col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.required}
                  onChange={e => setForm({ ...form, required: e.target.checked })}
                  className="w-4 h-4" />
                Required field
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.active}
                  onChange={e => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4" />
                Active (visible to officers)
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit}
              className="bg-[#0d1b4b] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#1a2e6b]">
              Create Field
            </button>
            <button onClick={() => setShowForm(false)}
              className="border border-gray-300 px-5 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Fields table */}
      {loading ? <p className="text-gray-400 text-sm">Loading...</p> : fields.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No custom fields yet.</p>
          <p className="text-sm mt-1">Add fields that officers must fill when submitting.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>{['Field Name', 'Type', 'Options', 'Required', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fields.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3 capitalize">{f.field_type}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {f.options && f.options.length > 0 ? f.options.join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {f.required
                      ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">Required</span>
                      : <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs">Optional</span>}
                  </td>
                  <td className="px-4 py-3">
                    {f.active
                      ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">Active</span>
                      : <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs">Inactive</span>}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => toggle(f)}
                      className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">
                      {f.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => remove(f.id)}
                      className="text-xs border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0d1b4b] text-white px-5 py-3 rounded-lg shadow-lg text-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

