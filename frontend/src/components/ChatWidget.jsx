import { useState } from 'react';

const BASE = 'http://127.0.0.1:8000';

export default function ChatWidget({ role }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your inventory assistant. Ask me anything about submissions.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const endpoint = role === 'officer' ? '/chat/officer' : '/chat/admin';

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          message: input,
          history: messages,
        }),
      });
      const data = await res.json();
      setMessages([...newHistory, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages([...newHistory, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#0d1b4b] text-white shadow-lg flex items-center justify-center text-2xl hover:bg-[#1a2e6b] transition-all"
        title="Open chat assistant"
      >
        {open ? '×' : '💬'}
      </button>

      {/* Side panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
          style={{ height: '460px' }}>

          {/* Header */}
          <div className="bg-[#0d1b4b] text-white px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Inventory Assistant</p>
              <p className="text-xs text-blue-200 capitalize">{role} access</p>
            </div>
            {role === 'superadmin' && (
              <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-semibold">
                Deep Access
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                  m.role === 'user'
                    ? 'bg-[#0d1b4b] text-white rounded-br-none'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 px-3 py-2 rounded-xl rounded-bl-none text-sm text-gray-400">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 bg-white flex gap-2">
            <input
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0d1b4b]"
              placeholder="Ask something..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-[#0d1b4b] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#1a2e6b] disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}