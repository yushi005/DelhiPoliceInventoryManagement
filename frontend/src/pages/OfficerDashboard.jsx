import Chatbot from '../components/Chatbot';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubmissions } from '../api';
import SubmissionDetailModal from '../components/SubmissionDetailModal';

const statusColors = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };

export default function OfficerDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = token ? JSON.parse(atob(token.split('.')[1])) : {};

  useEffect(() => {
    getSubmissions().then(r => setSubmissions(r.data)).finally(() => setLoading(false));
  }, []);

  const logout = () => { localStorage.removeItem('token'); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0d1b4b] text-white px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-lg font-bold">Delhi Police — Inventory System</h1>
            <p className="text-xs text-blue-200">{user.name || 'Officer'} · {user.badge_id}</p>
          </div>
          <nav className="flex gap-2">
            <span className="px-4 py-2 rounded-lg text-sm font-semibold bg-white text-[#0d1b4b]">My Submissions</span>
            <button onClick={() => navigate('/submit')} className="px-4 py-2 rounded-lg text-sm font-semibold text-blue-100 hover:bg-[#1a2e6b]">New Submission</button>
          </nav>
        </div>
        <button onClick={logout} className="border border-white text-white px-4 py-2 rounded-lg text-sm hover:bg-white hover:text-[#0d1b4b]">Logout</button>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">My Submissions</h2>
        {loading ? <p>Loading...</p> : submissions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No submissions yet.</p>
            <button onClick={() => navigate('/submit')} className="mt-4 bg-[#0d1b4b] text-white px-6 py-2 rounded-lg">Submit your first entry</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>{['App Name','App Type','Data Type','Status','Submitted','Action'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDetail(s)}>
                    <td className="px-4 py-3 font-medium">{s.app_name}</td>
                    <td className="px-4 py-3 capitalize">{s.app_type}</td>
                    <td className="px-4 py-3 capitalize">{s.data_type}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[s.status] || 'bg-gray-100'}`}>{s.status}</span></td>
                    <td className="px-4 py-3 text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setDetail(s)} className="text-[#0d1b4b] hover:underline text-xs font-medium text-left">View Details</button>
                        {s.status === 'rejected' && (
                          <>
                            <button onClick={() => navigate(`/submit/${s.id}`)} className="text-blue-600 hover:underline text-xs font-medium text-left">Edit & Resubmit</button>
                            {s.rejection_reason && <p className="text-red-500 text-xs">Reason: {s.rejection_reason}</p>}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      {detail && <SubmissionDetailModal submission={detail} onClose={() => setDetail(null)} />}
    <Chatbot role="officer" /> 
  </div>
  );
}