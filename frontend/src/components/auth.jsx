import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isLogin) {
      if (password.length < 6) return setError('Password must be at least 6 characters.');
      if (password !== confirmPassword) return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await authAPI.login(email, password);
        localStorage.setItem('token', res.data.access_token);
        navigate('/dashboard');
      } else {
        await authAPI.register(email, password);
        setSuccess('Account created! Please log in.');
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 440, animation: 'slideUp 0.5s ease both' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, var(--gold-light), var(--gold-dark))',
            borderRadius: 18,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontFamily: 'var(--font-display)',
            color: '#1a1408',
            boxShadow: 'var(--shadow-gold)',
            marginBottom: 16,
          }}>₹</div>
          <h1 style={{ marginBottom: 6 }}>QuantLedger</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {isLogin ? 'Sign in to your golden ledger' : 'Create your wealth account'}
          </p>
        </div>

        <div className="glass-card" style={{ padding: 32 }}>
          <div className="tabs" style={{ marginBottom: 24 }}>
            {['Login', 'Register'].map((tab) => {
              const active = isLogin === (tab === 'Login');
              return (
                <button
                  key={tab}
                  type="button"
                  className={`tab${active ? ' active' : ''}`}
                  onClick={() => { setIsLogin(tab === 'Login'); setError(''); setSuccess(''); }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {error && <div className="alert-error mb-4"><span>⚠️</span> {error}</div>}
          {success && <div className="alert-success mb-4"><span>✅</span> {success}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder={isLogin ? '••••••••' : 'Min. 6 characters'} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input type="password" className="form-input" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
            )}
            <button type="submit" className={`btn btn-primary w-full${loading ? ' btn-loading' : ''}`} disabled={loading} style={{ marginTop: 8, padding: 14 }}>
              {!loading && (isLogin ? 'Sign In →' : 'Create Account')}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 20 }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span style={{ color: 'var(--gold-light)', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}>
            {isLogin ? 'Register' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  );
}
