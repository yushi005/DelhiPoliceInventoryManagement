import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubmissions, getAnalytics, getDistricts } from '../api';
import SubmissionDetailModal from '../components/SubmissionDetailModal';
import Chatbot from '../components/Chatbot';

const statusColors = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };

export default function AdminPanel() {
  const [submissions, setSubmissions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('submissions');
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState({ district_id: '', status: '', app_type: '', data_type: '' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = token ? JSON.parse(atob(token.split('.')[1])) : {};

  const load = () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    Promise.all([getSubmissions(params), getAnalytics()])
      .then(([s, a]) => { setSubmissions(s.data); setAnalytics(a.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { getDistricts().then(r => setDistricts(r.data)).catch(() => setDistricts([])); }, []);
  useEffect(() => { load(); }, [filters]);

  const logout = () => { localStorage.removeItem('token'); navigate('/login'); };

  const navBtn = (key, label) => (
    <button key={key} onClick={() => setView(key)}
      className={`px-4 py-2 rounded-lg text-sm font-semibold ${view === key ? 'bg-white text-[#0d1b4b]' : 'text-blue-100 hover:bg-[#1a2e6b]'}`}>
      {label}
    </button>
  );

  const Counts = ({ title, rows, keyName }) => (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold text-gray-700 mb-3 capitalize">{title}</h3>
      <div className="space-y-2">
        {(rows || []).map(r => (
          <div key={r[keyName]} className="flex justify-between text-sm">
            <span className="capitalize text-gray-600">{r[keyName]}</span>
            <span className="font-bold text-[#0d1b4b]">{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0d1b4b] text-white px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-lg font-bold">Delhi Police — Admin Panel</h1>
            <p className="text-xs text-blue-200">{user.name || 'Admin'} · {user.badge_id}</p>
          </div>
          <nav className="flex gap-2">
            {navBtn('submissions', 'Submissions')}
            {navBtn('analytics', 'Analytics')}
          </nav>
        </div>
        <button onClick={logout} className="border border-white text-white px-4 py-2 rounded-lg text-sm hover:bg-white hover:text-[#0d1b4b]">Logout</button>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? <p>Loading...</p> : view === 'analytics' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[['Total', analytics?.total, 'text-blue-600'], ['Pending', analytics?.pending, 'text-yellow-600'], ['Approved', analytics?.approved, 'text-green-600'], ['Rejected', analytics?.rejected, 'text-red-600']].map(([label, val, color]) => (
                <div key={label} className="bg-white rounded-xl shadow p-5">
                  <p className="text-gray-500 text-sm">{label}</p>
                  <p className={`text-3xl font-bold mt-1 ${color}`}>{val ?? 0}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Counts title="By Data Type" rows={analytics?.by_data_type} keyName="data_type" />
              <Counts title="By App Type" rows={analytics?.by_app_type} keyName="app_type" />
              <Counts title="By Server Type" rows={analytics?.by_server_type} keyName="server_type" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 mb-6">
              <select className="border rounded-lg px-3 py-2 text-sm"
                value={filters.district_id} onChange={e => setFilters(f => ({ ...f, district_id: e.target.value }))}>
                <option value="">All districts</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {[['status', ['', 'pending', 'approved', 'rejected']], ['app_type', ['', 'in-house', 'vendor', 'commercial']], ['data_type', ['', 'public', 'restrictive', 'confidential']]].map(([key, opts]) => (
                <select key={key} className="border rounded-lg px-3 py-2 text-sm"
                  value={filters[key]} onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}>
                  {opts.map(o => <option key={o} value={o}>{o || `All ${key.replace('_', ' ')}`}</option>)}
                </select>
              ))}
            </div>
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                  <tr>{['App Name', 'Type', 'Data Class', 'District / Unit', 'Status', 'Submitted', 'Details'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDetail(s)}>
                      <td className="px-4 py-3 font-medium">{s.app_name}</td>
                      <td className="px-4 py-3 capitalize">{s.app_type}</td>
                      <td className="px-4 py-3 capitalize">{s.data_type}</td>
                      <td className="px-4 py-3">{s.unit_name || s.district_name || '-'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[s.status]}`}>{s.status}</span></td>
                      <td className="px-4 py-3 text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setDetail(s)} className="text-[#0d1b4b] hover:underline text-xs font-medium">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
      {detail && <SubmissionDetailModal submission={detail} onClose={() => setDetail(null)} />}
      <Chatbot role="admin" />
    </div>
  );
}