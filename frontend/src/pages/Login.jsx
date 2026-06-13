import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import dpLogo from '../assets/dp_logo.png';

export default function Login() {
  const [badgeId, setBadgeId] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const res = await login(badgeId, password);
      const token = res.data.access_token;
      localStorage.setItem('token', token);
      const role = JSON.parse(atob(token.split('.')[1])).role;
      if (role === 'officer') navigate('/dashboard');
      else if (role === 'admin') navigate('/admin');
      else if (role === 'superadmin') navigate('/superadmin');
    } catch { setError('Invalid Badge ID or password.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0d1b4b] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4">
  <img src={dpLogo} alt="Delhi Police" className="w-full h-full object-cover" />
</div>
          <h1 className="text-2xl font-bold text-[#0d1b4b]">Delhi Police</h1>
          <p className="text-gray-500 text-sm mt-1">Digital Inventory System</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Username</label>
            <input value={badgeId} onChange={e => setBadgeId(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0d1b4b]"
              placeholder="Enter your username" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0d1b4b]"
              placeholder="Enter password" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">OTP (Mock)</label>
            <input value={otp} onChange={e => setOtp(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0d1b4b]"
              placeholder="Enter OTP" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-[#0d1b4b] text-white py-3 rounded-lg font-semibold hover:bg-[#1a2e6b] transition disabled:opacity-50">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}