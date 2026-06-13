import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getEntities, createSubmission, updateSubmission, getSubmissions } from '../api';

const SECTIONS = ['App Details', 'Data Handled', 'Server Details', 'Data Type'];

export default function SubmissionForm({ isPreview = false, onLoginClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    app_name: '', app_type: 'in-house', vendor_name: '', version: '',
    purpose: '', entity_id: '',
    storage_location: '', device_config: '', custodian_name: '',
    custodian_badge_id: '', num_users: '',
    server_type: 'cloud', server_provider: '', server_capacity: '', physical_location: '',
    data_type: 'public', data_justification: ''
  });

  useEffect(() => {
    getEntities().then(r => setEntities(r.data));
    if (id) {
      getSubmissions().then(r => {
        const s = r.data.find(x => x.id === parseInt(id));
        if (s) setForm({ ...s, entity_id: s.entity_id || '', num_users: String(s.num_users ?? '') });
      });
    }
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Only the fields the API accepts — drop server-side read-only props that
      // come back when editing (status, ids, names, timestamps, ...).
      const payload = {
        app_name: form.app_name, app_type: form.app_type, vendor_name: form.vendor_name,
        version: form.version, purpose: form.purpose, entity_id: form.entity_id,
        storage_location: form.storage_location, device_config: form.device_config,
        custodian_name: form.custodian_name, custodian_badge_id: form.custodian_badge_id,
        num_users: parseInt(form.num_users),
        server_type: form.server_type, server_provider: form.server_provider,
        server_capacity: form.server_capacity, physical_location: form.physical_location,
        data_type: form.data_type, data_justification: form.data_justification,
      };
      if (id) await updateSubmission(parseInt(id), payload);
      else await createSubmission(payload);
      navigate('/dashboard');
    } catch (e) {
      alert('Submission failed: ' + (e.response?.data?.detail || e.message));
    } finally { setLoading(false); }
  };

  const inputClass = "w-full border rounded-lg px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0d1b4b] text-sm";
  const labelClass = "text-sm font-medium text-gray-700";

  return (
    <div className={isPreview ? '' : 'min-h-screen bg-gray-50'}>
      {!isPreview && (
        <header className="bg-[#0d1b4b] text-white px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Delhi Police — Software Registration</h1>
          <button onClick={() => navigate('/dashboard')} className="border border-white text-white px-4 py-2 rounded-lg text-sm">Back</button>
        </header>
      )}
      <main className={isPreview ? 'max-w-2xl' : 'max-w-2xl mx-auto px-6 py-8'}>
        {isPreview && (
          <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            You are viewing this form in preview mode. Login to submit a software entry.
          </div>
        )}
        <div className="flex items-center mb-8">
          {SECTIONS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i <= step ? 'bg-[#0d1b4b] text-white' : 'bg-gray-200 text-gray-500'}`}>{i + 1}</div>
              <span className={`ml-2 text-sm ${i === step ? 'font-semibold text-[#0d1b4b]' : 'text-gray-400'}`}>{s}</span>
              {i < SECTIONS.length - 1 && <div className="w-8 h-0.5 bg-gray-300 mx-3" />}
            </div>
          ))}
        </div>
        <fieldset disabled={isPreview} className="bg-white rounded-xl shadow p-6 space-y-4 disabled:opacity-70">
          {step === 0 && <>
            <div><label className={labelClass}>App Name *</label><input className={inputClass} value={form.app_name} onChange={e => set('app_name', e.target.value)} /></div>
            <div><label className={labelClass}>App Type *</label>
              <select className={inputClass} value={form.app_type} onChange={e => set('app_type', e.target.value)}>
                {['in-house','vendor','commercial'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={labelClass}>Vendor Name</label><input className={inputClass} value={form.vendor_name} onChange={e => set('vendor_name', e.target.value)} /></div>
            <div><label className={labelClass}>Version</label><input className={inputClass} value={form.version} onChange={e => set('version', e.target.value)} /></div>
            <div><label className={labelClass}>Purpose *</label><textarea className={inputClass} rows={3} value={form.purpose} onChange={e => set('purpose', e.target.value)} /></div>
            <div><label className={labelClass}>District / Unit *</label>
              <select className={inputClass} value={form.entity_id} onChange={e => set('entity_id', e.target.value)}>
                <option value="">Select district or unit</option>
                {entities.map(en => <option key={en.id} value={en.id}>{en.type === 'district' ? `${en.name} (District)` : en.name}</option>)}
              </select>
            </div>
          </>}
          {step === 1 && <>
            <div><label className={labelClass}>Storage Location *</label><input className={inputClass} value={form.storage_location} onChange={e => set('storage_location', e.target.value)} /></div>
            <div><label className={labelClass}>Device Config</label><textarea className={inputClass} rows={2} value={form.device_config} onChange={e => set('device_config', e.target.value)} /></div>
            <div><label className={labelClass}>Custodian Name *</label><input className={inputClass} value={form.custodian_name} onChange={e => set('custodian_name', e.target.value)} /></div>
            <div><label className={labelClass}>Custodian Badge ID *</label><input className={inputClass} value={form.custodian_badge_id} onChange={e => set('custodian_badge_id', e.target.value)} /></div>
            <div><label className={labelClass}>Number of Users *</label><input type="number" className={inputClass} value={form.num_users} onChange={e => set('num_users', e.target.value)} /></div>
          </>}
          {step === 2 && <>
            <div><label className={labelClass}>Server Type *</label>
              <div className="flex gap-4 mt-2">
                {['cloud','on-prem','hybrid'].map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={form.server_type === t} onChange={() => set('server_type', t)} />
                    <span className="capitalize text-sm">{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <div><label className={labelClass}>Provider</label><input className={inputClass} value={form.server_provider} onChange={e => set('server_provider', e.target.value)} /></div>
            <div><label className={labelClass}>Capacity</label><input className={inputClass} value={form.server_capacity} onChange={e => set('server_capacity', e.target.value)} /></div>
            <div><label className={labelClass}>Physical Location</label><input className={inputClass} value={form.physical_location} onChange={e => set('physical_location', e.target.value)} /></div>
          </>}
          {step === 3 && <>
            <div><label className={labelClass}>Data Classification *</label>
              <div className="flex gap-6 mt-2">
                {['public','restrictive','confidential'].map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={form.data_type === t} onChange={() => set('data_type', t)} />
                    <span className="capitalize text-sm">{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <div><label className={labelClass}>Justification *</label><textarea className={inputClass} rows={4} value={form.data_justification} onChange={e => set('data_justification', e.target.value)} /></div>
          </>}
        </fieldset>
        <div className="flex justify-between mt-6">
          {step === 0 && isPreview
            ? <span />
            : <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/dashboard')}
                className="border border-gray-300 px-6 py-2 rounded-lg text-sm hover:bg-gray-50">
                {step === 0 ? 'Cancel' : 'Back'}
              </button>}
          {step < 3
            ? <button onClick={() => setStep(s => s + 1)} className="bg-[#0d1b4b] text-white px-6 py-2 rounded-lg text-sm hover:bg-[#1a2e6b]">Next</button>
            : isPreview
              ? <button onClick={onLoginClick} className="bg-[#0d1b4b] text-white px-6 py-2 rounded-lg text-sm hover:bg-[#1a2e6b]">Login to Submit</button>
              : <button onClick={handleSubmit} disabled={loading} className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">{loading ? 'Submitting...' : 'Submit'}</button>
          }
        </div>
      </main>
    </div>
  );
}