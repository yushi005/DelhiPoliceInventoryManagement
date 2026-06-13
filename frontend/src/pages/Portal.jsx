import { useEffect, useMemo, useState } from 'react';
import { login, getPublicAnalytics } from '../api';
import SubmissionForm from './SubmissionForm';
import dpLogo from '../assets/dp_logo.png';
import Chatbot from '../components/Chatbot';

const TOKEN_KEY = 'portal_token';
const DASH_ROUTE = { officer: '/dashboard', admin: '/admin', superadmin: '/superadmin' };

const decode = (token) => {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
};

export default function Portal() {
  const [section, setSection] = useState('home');
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const claims = useMemo(() => (token ? decode(token) : null), [token]);
  const isLoggedIn = !!claims;

  const [stats, setStats] = useState(null);
  const [statsErr, setStatsErr] = useState(false);
  useEffect(() => {
    getPublicAnalytics()
      .then(r => setStats(r.data))
      .catch(() => setStatsErr(true));
  }, []);

  const [badgeId, setBadgeId] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true); setError('');
    try {
      const res = await login(badgeId, password);
      const t = res.data.access_token;
      sessionStorage.setItem(TOKEN_KEY, t);
      localStorage.setItem('token', t);
      setToken(t);
    } catch { setError('Invalid Username or password.'); }
    finally { setLoading(false); }
  };

  const openDashboard = () => {
    if (!claims) return;
    const route = DASH_ROUTE[claims.role] || '/login';
    localStorage.setItem('token', token);
    window.open(route, '_blank');
  };

  const goToLogin = () => setSection('login');

  const navItems = [
    { key: 'home', label: 'Home' },
    { key: 'about', label: 'About' },
    { key: 'form', label: 'Submission Form' },
    { key: 'login', label: 'Login' },
    ...(isLoggedIn ? [{ key: 'dashboard', label: 'Dashboard' }] : []),
  ];

  const onNav = (key) => {
    if (key === 'dashboard') { openDashboard(); return; }
    setSection(key);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed top-0 left-0 h-screen w-60 bg-[#0d1b4b] text-white flex flex-col">
        <div className="px-6 py-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
            <img src={dpLogo} alt="Delhi Police" className="w-full h-full object-cover" />
          </div>
          <div className="leading-tight">
            <div className="font-bold">Delhi Police</div>
            <div className="text-xs text-white/60">Inventory Portal</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => onNav(item.key)}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition ${
                section === item.key && item.key !== 'dashboard'
                  ? 'bg-white text-[#0d1b4b] font-semibold'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        {isLoggedIn && (
          <div className="px-6 py-4 border-t border-white/10 text-xs text-white/60">
            {claims.name || claims.sub} · {claims.role}
          </div>
        )}
      </aside>

      <main className="ml-60 min-h-screen">
        <div className="max-w-5xl mx-auto px-8 py-10">
          {section === 'home' && (
            <HomeSection stats={stats} statsErr={statsErr} />
          )}
          {section === 'about' && <AboutSection />}
          {section === 'form' && (
            <section>
              <h2 className="text-2xl font-bold text-[#0d1b4b] mb-6">Software Submission Form</h2>
              <SubmissionForm isPreview={!isLoggedIn} onLoginClick={goToLogin} />
            </section>
          )}
          {section === 'login' && (
            <LoginSection
              badgeId={badgeId} setBadgeId={setBadgeId}
              password={password} setPassword={setPassword}
              otp={otp} setOtp={setOtp}
              error={error} loading={loading}
              onLogin={handleLogin}
              isLoggedIn={isLoggedIn} claims={claims}
              onGoToDashboard={openDashboard}
            />
          )}
        </div>
      </main>
      <Chatbot role={claims?.role || 'officer'} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function HomeSection({ stats, statsErr }) {
  const cards = [
    { label: 'Total Registered Software', value: stats?.total },
    { label: 'Approved Entries', value: stats?.approved },
    { label: 'Pending Review', value: stats?.pending },
  ];
  return (
    <section>
      <h1 className="text-3xl font-bold text-[#0d1b4b]">Delhi Police Digital Inventory System</h1>
      <p className="text-gray-600 mt-2 max-w-2xl">
        Centralized software asset registry for 60 districts and units across Delhi Police.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-8">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl shadow p-6 border border-gray-100">
            <div className="text-3xl font-bold text-[#0d1b4b]">
              {statsErr ? '—' : (c.value ?? '…')}
            </div>
            <div className="text-sm text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>
      {statsErr && (
        <p className="text-red-500 text-sm mt-3">
          Unable to load live statistics right now — showing the portal without live counts.
        </p>
      )}
      {!statsErr && stats?.by_app_type?.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100 mt-8 max-w-3xl">
          <h3 className="font-semibold text-[#0d1b4b] mb-4">Software by Type</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.by_app_type.map(r => (
              <div key={r.app_type} className="flex justify-between items-center border border-gray-100 rounded-lg px-4 py-3">
                <span className="text-sm text-gray-600 capitalize">{r.app_type}</span>
                <span className="text-lg font-bold text-[#0d1b4b]">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow p-6 border border-gray-100 mt-8 max-w-3xl">
        <h3 className="font-semibold text-[#0d1b4b] mb-2">About this registry</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          This portal is the single source of truth for every piece of software operated
          across Delhi Police districts and specialised units. Officers register the
          applications they run, district admins review and approve each entry, and Super
          Admins maintain organisation-wide oversight. The result is a verifiable, always
          up-to-date inventory that supports audits, security reviews, and informed
          decision-making.
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function AboutSection() {
  const Sub = ({ title, children }) => (
    <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
      <h3 className="font-semibold text-[#0d1b4b] mb-2">{title}</h3>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2">{children}</div>
    </div>
  );
  return (
    <section>
      <h1 className="text-3xl font-bold text-[#0d1b4b] mb-6">About the System</h1>
      <div className="space-y-5 max-w-3xl">
        <Sub title="What is this system">
          <p>
            Delhi Police operates across 62 districts and units, each independently running
            its own software — with no central visibility into what is deployed, who owns it,
            what data it handles, or where it lives. That fragmentation makes audits,
            security assessments, and lifecycle planning nearly impossible.
          </p>
          <p>
            This system solves that by providing a single centralized registry. Every unit
            records its software through a structured submission, every entry is reviewed and
            approved, and leadership gains a complete, real-time picture of the entire estate.
          </p>
        </Sub>
        <Sub title="Three roles">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Officer</strong> — data entry and monitoring of their unit's software.</li>
            <li><strong>Admin</strong> — review and approval of submissions within their district.</li>
            <li><strong>Super Admin</strong> — full access and organisation-wide oversight.</li>
          </ul>
        </Sub>
        <Sub title="Security framework (CIA triad)">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Confidentiality</strong> — role gating ensures each user only sees what their role permits.</li>
            <li><strong>Integrity</strong> — a structured approval workflow guarantees no entry becomes official without review.</li>
            <li><strong>Availability</strong> — status tracking keeps the registry accurate and continuously usable.</li>
          </ul>
        </Sub>
        <Sub title="Identity & Access Management (IAM)">
          <ul className="list-disc pl-5 space-y-1">
            <li>JWT-based authentication issued on login.</li>
            <li>Every user carries an explicit role.</li>
            <li>Every protected route verifies that role before granting access.</li>
          </ul>
        </Sub>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function LoginSection({
  badgeId, setBadgeId, password, setPassword, otp, setOtp,
  error, loading, onLogin, isLoggedIn, claims, onGoToDashboard,
}) {
  const inputClass = "w-full border rounded-lg px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0d1b4b]";
  return (
    <section className="max-w-md">
      <h1 className="text-3xl font-bold text-[#0d1b4b] mb-6">Login</h1>
      <div className="bg-white rounded-2xl shadow p-8 border border-gray-100">
        {isLoggedIn ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
              Logged in as {claims.name || claims.sub} · {claims.role}
            </div>
            <button
              onClick={onGoToDashboard}
              className="w-full bg-[#0d1b4b] text-white py-3 rounded-lg font-semibold hover:bg-[#1a2e6b] transition"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Username</label>
              <input value={badgeId} onChange={e => setBadgeId(e.target.value)}
                className={inputClass} placeholder="Enter your username" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className={inputClass} placeholder="Enter password" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">OTP (Mock)</label>
              <input value={otp} onChange={e => setOtp(e.target.value)}
                className={inputClass} placeholder="Enter OTP" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={onLogin} disabled={loading}
              className="w-full bg-[#0d1b4b] text-white py-3 rounded-lg font-semibold hover:bg-[#1a2e6b] transition disabled:opacity-50">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}