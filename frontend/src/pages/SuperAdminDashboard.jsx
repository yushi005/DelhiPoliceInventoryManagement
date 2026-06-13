import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubmissions, getAnalytics, getUsers, updateUserRole, updateStatus } from '../api';
import AddUserModal from '../components/AddUserModal';
import MyFieldsTab from '../components/MyFieldsTab';
import Chatbot from '../components/Chatbot';

const statusColors = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };

export default function SuperAdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [view, setView] = useState('submissions');
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [toast, setToast] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = token ? JSON.parse(atob(token.split('.')[1])) : {};

  const reload = () =>
    Promise.all([getSubmissions(), getAnalytics(), getUsers()])
      .then(([s, a, u]) => { setSubmissions(s.data); setAnalytics(a.data); setUsers(u.data); })
      .finally(() => setLoading(false));

  useEffect(() => { reload(); }, []);

  const logout = () => { localStorage.removeItem('token'); navigate('/login'); };
  const approve = async (id) => { await updateStatus(id, 'approved', ''); reload(); };

  const navBtn = (key, label) => (
    <button key={key} onClick={() => setView(key)}
      className={`px-4 py-2 rounded-lg text-sm font-semibold ${view === key ? 'bg-white text-[#0d1b4b]' : 'text-blue-100 hover:bg-[#1a2e6b]'}`}>
      {label}
    </button>
  );

  const Counts = ({ title, rows, keyName }) => (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
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
            <h1 className="text-lg font-bold">Delhi Police — Super Admin</h1>
            <p className="text-xs text-blue-200">{user.name || 'Super Admin'} · {user.badge_id}</p>
          </div>
          <nav className="flex gap-2">
            {navBtn('submissions', 'Submissions')}
            {navBtn('analytics', 'Analytics')}
            {navBtn('users', 'Users')}
            {navBtn('myfields', 'My Fields')}
          </nav>
        </div>
        <button onClick={logout} className="border border-white text-white px-4 py-2 rounded-lg text-sm hover:bg-white hover:text-[#0d1b4b]">Logout</button>
      </header>
      {loading ? <p className="p-8">Loading...</p> : (
        <main className="max-w-7xl mx-auto px-6 py-8">
          {view === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                {[['Total Entries', analytics?.total, 'text-blue-600'], ['Pending', analytics?.pending, 'text-yellow-600'], ['Approved', analytics?.approved, 'text-green-600'], ['Rejected', analytics?.rejected, 'text-red-600']].map(([label, val, color]) => (
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
          )}
          {view === 'submissions' && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                  <tr>{['App Name', 'Type', 'Data Class', 'District / Unit', 'Status', 'Submitted', 'Action'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{s.app_name}</td>
                      <td className="px-4 py-3 capitalize">{s.app_type}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${s.data_type === 'confidential' ? 'bg-purple-100 text-purple-800' : s.data_type === 'restrictive' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'}`}>
                          {s.data_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">{s.unit_name || s.district_name || '-'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[s.status]}`}>{s.status}</span></td>
                      <td className="px-4 py-3 text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {s.status === 'pending' && <button onClick={() => approve(s.id)} className="bg-green-500 text-white px-3 py-1 rounded text-xs">Approve</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {view === 'users' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-700">Users</h2>
                <button onClick={() => setShowAddUser(true)}
                  className="bg-[#0d1b4b] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#1a2e6b]">
                  + Add User
                </button>
              </div>
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                    <tr>{['Badge ID', 'Name', 'Role', 'Rank', 'District', 'Change Role'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono">{u.badge_id}</td>
                        <td className="px-4 py-3">{u.name}</td>
                        <td className="px-4 py-3 capitalize">{u.role}</td>
                        <td className="px-4 py-3">{u.rank || '-'}</td>
                        <td className="px-4 py-3">{u.district_id || '-'}</td>
                        <td className="px-4 py-3">
                          <select className="border rounded px-2 py-1 text-xs" value={u.role}
                            onChange={async e => { await updateUserRole(u.id, e.target.value); const r = await getUsers(); setUsers(r.data); }}>
                            {['officer', 'admin', 'superadmin'].map(r => <option key={r}>{r}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {view === 'myfields' && <MyFieldsTab />}
        </main>
      )}
      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onCreated={(msg) => { setToast(msg); reload(); }}
        />
      )}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg text-sm z-50 flex items-center gap-3">
          <span>{toast}</span>
          <button onClick={() => setToast('')} className="text-white/80 hover:text-white">&times;</button>
        </div>
      )}
      <Chatbot role="superadmin" />
    </div>
  );
}