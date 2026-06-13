import { useState, useEffect } from 'react';
import { getSubmissions } from '../api';

const WELCOME = {
  officer: "Hi! Search for any submission by name, status, or type. Try: 'CCTNS Portal' or 'rejected'",
  admin: "Hi! Search submissions in your district. Try an app name, status, or data type.",
  superadmin: "Hi! Search across all submissions. Try an app name, status, district, or type."
};

function searchSubmissions(query, submissions) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return submissions.filter(s =>
    (s.app_name || '').toLowerCase().includes(q) ||
    (s.status || '').toLowerCase().includes(q) ||
    (s.app_type || '').toLowerCase().includes(q) ||
    (s.data_type || '').toLowerCase().includes(q) ||
    (s.unit_name || '').toLowerCase().includes(q) ||
    (s.district_name || '').toLowerCase().includes(q) ||
    (s.custodian_name || '').toLowerCase().includes(q) ||
    (s.vendor_name || '').toLowerCase().includes(q) ||
    (s.server_type || '').toLowerCase().includes(q) ||
    (s.purpose || '').toLowerCase().includes(q)
  );
}

function formatSubmission(s) {
  return [
    `📋 ${s.app_name || 'Unnamed'}`,
    `Status: ${s.status || '-'}`,
    `Type: ${s.app_type || '-'} | Data: ${s.data_type || '-'}`,
    `District/Unit: ${s.unit_name || s.district_name || '-'}`,
    `Custodian: ${s.custodian_name || '-'} (${s.custodian_badge_id || '-'})`,
    `Server: ${s.server_type || '-'} — ${s.server_provider || '-'}`,
    `Vendor: ${s.vendor_name || '-'}`,
    `Users: ${s.num_users || '-'}`,
    `Version: ${s.version || '-'}`,
    `Storage: ${s.storage_location || '-'}`,
    `Purpose: ${s.purpose || '-'}`,
    s.rejection_reason ? `Rejection reason: ${s.rejection_reason}` : null,
    `Submitted: ${s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : '-'}`,
  ].filter(Boolean).join('\n');
}

export default function Chatbot({ role }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    setMessages([{ from: 'bot', text: WELCOME[role] || WELCOME.officer }]);
  }, [role]);

  useEffect(() => {
    if (open && submissions.length === 0) {
      getSubmissions().then(r => setSubmissions(r.data)).catch(() => {});
    }
  }, [open]);

  const send = () => {
    if (!input.trim()) return;
    const query = input.trim();
    setInput('');
    setMessages(m => [...m, { from: 'user', text: query }]);
    const results = searchSubmissions(query, submissions);
    if (results.length === 0) {
      setMessages(m => [...m, { from: 'bot', text: `No submissions found matching "${query}". Try a name, status, or type.` }]);
    } else if (results.length === 1) {
      setMessages(m => [...m, { from: 'bot', text: formatSubmission(results[0]) }]);
    } else {
      const summary = `Found ${results.length} submissions:\n\n` +
        results.map((s, i) => `${i + 1}. ${s.app_name} — ${s.status} (${s.unit_name || s.district_name || '-'})`).join('\n') +
        `\n\nType a specific app name to see full details.`;
      setMessages(m => [...m, { from: 'bot', text: summary }]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-80 h-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          <div className="bg-[#0d1b4b] text-white px-4 py-3 flex justify-between items-center">
            <span className="font-semibold text-sm">DP Assistant</span>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-lg leading-none">×</button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs whitespace-pre-line ${
                  m.from === 'user' ? 'bg-[#0d1b4b] text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 px-3 py-2 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Search submissions..."
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d1b4b]"
            />
            <button onClick={send} className="bg-[#0d1b4b] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#1a2e6b]">
              Send
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)}
        className="w-14 h-14 bg-[#0d1b4b] rounded-full shadow-lg flex items-center justify-center hover:bg-[#1a2e6b] transition">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    </div>
  );
}