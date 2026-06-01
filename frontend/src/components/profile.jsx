import { useState, useEffect } from 'react';
import { profileAPI, portfolioAPI } from '../api';

const AVATAR_COLORS = [
  '#d4af37', '#f0d78c', '#9a7b1a', '#c4a35a',
  '#4ade80', '#f87171', '#a89f8c', '#e8c547',
];

const RISK_OPTIONS = [
  {
    value: 'Conservative',
    icon: '🛡️',
    desc: 'Capital preservation first. Low-risk instruments like FDs, bonds.',
    color: 'var(--green)',
    bg: 'var(--green-dim)',
    border: 'rgba(16,185,129,0.3)',
  },
  {
    value: 'Moderate',
    icon: '⚖️',
    desc: 'Balanced growth and safety. Mix of equity and debt.',
    color: 'var(--gold)',
    bg: 'var(--gold-dim)',
    border: 'rgba(245,158,11,0.3)',
  },
  {
    value: 'Aggressive',
    icon: '🚀',
    desc: 'Maximum growth. High equity exposure, tolerates volatility.',
    color: 'var(--red)',
    bg: 'var(--red-dim)',
    border: 'rgba(239,68,68,0.3)',
  },
];

function getInitials(name, email) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  }
  return (email?.[0] || 'U').toUpperCase();
}

export default function Profile() {
  const [profile, setProfile]     = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');

  // Editable fields
  const [fullName,  setFullName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [occupation, setOccupation] = useState('');
  const [riskAppetite, setRiskAppetite] = useState('Moderate');
  const [avatarColor,  setAvatarColor]  = useState('#d4af37');

  useEffect(() => {
    Promise.all([
      profileAPI.getProfile(),
      portfolioAPI.getPortfolio(),
    ]).then(([pRes, portRes]) => {
      const p = pRes.data;
      setProfile(p);
      setFullName(p.full_name || '');
      setPhone(p.phone || '');
      setOccupation(p.occupation || '');
      setRiskAppetite(p.risk_appetite || 'Moderate');
      setAvatarColor(p.avatar_color || '#d4af37');
      setPortfolio(portRes.data);
    }).catch(() => {
      setError('Failed to load profile. Please refresh.');
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await profileAPI.updateProfile({
        full_name:    fullName || null,
        phone:        phone || null,
        occupation:   occupation || null,
        risk_appetite: riskAppetite,
        avatar_color:  avatarColor,
      });
      setProfile(prev => ({
        ...prev,
        full_name: fullName,
        phone,
        occupation,
        risk_appetite: riskAppetite,
        avatar_color: avatarColor,
      }));
      setSuccess('Profile updated successfully!');
      setEditMode(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setOccupation(profile.occupation || '');
      setRiskAppetite(profile.risk_appetite || 'Moderate');
      setAvatarColor(profile.avatar_color || '#d4af37');
    }
    setError('');
    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 20 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 20 }} />
      </div>
    );
  }

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'User';
  const initials    = getInitials(profile?.full_name, profile?.email);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '—';
  const holdings      = portfolio?.holdings || [];
  const totalValue    = portfolio?.total_value ?? 0;
  const totalPnl      = portfolio?.total_pnl ?? 0;
  const pnlPercent    = portfolio?.total_pnl_percent ?? 0;
  const currentRisk   = RISK_OPTIONS.find(r => r.value === (editMode ? riskAppetite : (profile?.risk_appetite || 'Moderate')));

  return (
    <div className="page-container animate-in">

      {/* ── HERO CARD ─────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(154,123,26,0.08) 50%, rgba(7,6,10,0.4) 100%)',
        border: '1px solid var(--glass-border)',
        borderRadius: '24px',
        padding: '36px 32px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 200, height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              background: editMode ? avatarColor : (profile?.avatar_color || '#d4af37'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 800,
              color: 'white',
              fontFamily: "'Inter', sans-serif",
              boxShadow: `0 0 0 4px rgba(255,255,255,0.08), 0 8px 32px ${(profile?.avatar_color || '#d4af37')}55`,
              transition: 'all 0.3s ease',
              flexShrink: 0,
            }}>
              {initials}
            </div>
            {editMode && (
              <div style={{
                position: 'absolute', bottom: -4, right: -4,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)',
                borderRadius: '50%',
                width: 26, height: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', cursor: 'pointer',
              }}>✏️</div>
            )}
          </div>

          {/* Identity */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '4px' }}>
              {displayName}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '10px' }}>
              {profile?.email} · Member since {memberSince}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {profile?.occupation && (
                <span className="badge badge-neutral">💼 {profile.occupation}</span>
              )}
              <span style={{
                padding: '3px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                fontWeight: 600,
                background: currentRisk?.bg,
                color: currentRisk?.color,
                border: `1px solid ${currentRisk?.border}`,
              }}>
                {currentRisk?.icon} {profile?.risk_appetite || 'Moderate'} Investor
              </span>
            </div>
          </div>

          {/* Edit toggle */}
          <div>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="btn btn-secondary"
                style={{ gap: '6px' }}
              >
                ✏️ Edit Profile
              </button>
            ) : (
              <button onClick={handleCancel} className="btn btn-secondary">
                ✕ Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {success && <div className="alert-success mb-4"><span>✅</span> {success}</div>}
      {error   && <div className="alert-error   mb-4"><span>⚠️</span> {error}</div>}

      <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* ── EDIT / DISPLAY FORM ──────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Personal Info Card */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
              👤 Personal Information
            </h3>

            {editMode ? (
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Sohini Banerjee"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Occupation</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Software Engineer, Student…"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                  />
                </div>

                {/* Avatar colour picker */}
                <div className="form-group">
                  <label className="form-label">Avatar Colour</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAvatarColor(c)}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          background: c,
                          border: avatarColor === c
                            ? '3px solid white'
                            : '3px solid transparent',
                          outline: avatarColor === c ? `2px solid ${c}` : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          padding: 0,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className={`btn btn-primary${saving ? ' btn-loading' : ''}`}
                  disabled={saving}
                  style={{ marginTop: '4px' }}
                >
                  {!saving && '💾 Save Changes'}
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'Full Name',   value: profile?.full_name  || '—',          icon: '👤' },
                  { label: 'Email',       value: profile?.email      || '—',          icon: '📧' },
                  { label: 'Phone',       value: profile?.phone      || 'Not set',     icon: '📱' },
                  { label: 'Occupation',  value: profile?.occupation || 'Not set',     icon: '💼' },
                  { label: 'Member Since', value: memberSince,                          icon: '📅' },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.025)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Risk Appetite Card */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚡ Risk Appetite
            </h3>

            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {RISK_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRiskAppetite(opt.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: riskAppetite === opt.value ? `1px solid ${opt.border}` : '1px solid var(--border)',
                      background: riskAppetite === opt.value ? opt.bg : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <span style={{ fontSize: '22px', flexShrink: 0 }}>{opt.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: riskAppetite === opt.value ? opt.color : 'var(--text-primary)' }}>
                        {opt.value}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{opt.desc}</div>
                    </div>
                    {riskAppetite === opt.value && (
                      <span style={{ marginLeft: 'auto', color: opt.color, fontWeight: 700, flexShrink: 0 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '18px',
                background: currentRisk?.bg,
                border: `1px solid ${currentRisk?.border}`,
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{currentRisk?.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: currentRisk?.color }}>
                    {profile?.risk_appetite || 'Moderate'}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  {currentRisk?.desc}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── PORTFOLIO STATS SIDEBAR ──────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Portfolio summary */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 Portfolio Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                {
                  label: 'Total Value',
                  value: totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                  icon: '💰', accent: 'var(--accent-light)',
                },
                {
                  label: 'Overall P&L',
                  value: `${totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`,
                  icon: totalPnl >= 0 ? '📈' : '📉',
                  accent: totalPnl >= 0 ? 'var(--green)' : 'var(--red)',
                },
                {
                  label: 'Holdings',
                  value: `${holdings.length} asset${holdings.length !== 1 ? 's' : ''}`,
                  icon: '🗂️', accent: 'var(--gold)',
                },
              ].map(({ label, value, icon, accent }) => (
                <div key={label} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.025)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{icon}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: accent }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Asset breakdown by type */}
          {holdings.length > 0 && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🥧 Asset Breakdown
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(
                  holdings.reduce((acc, h) => {
                    acc[h.asset_type] = (acc[h.asset_type] || 0) + (h.current_value || 0);
                    return acc;
                  }, {})
                ).map(([type, val]) => {
                  const pct   = totalValue > 0 ? (val / totalValue) * 100 : 0;
                  const chips = { STOCK: '#d4af37', MF: '#f0d78c', FD: '#4ade80', RD: '#4ade80', GOLD: '#c4a35a', ETF: '#9a7b1a', PPF: '#a89f8c' };
                  const col   = chips[type] || '#94a3b8';
                  return (
                    <div key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{type}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{pct.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: col,
                          borderRadius: 99,
                          transition: 'width 0.6s ease',
                          boxShadow: `0 0 8px ${col}55`,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Account security card */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔒 Account Security
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.025)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📧</span>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>EMAIL</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{profile?.email}</div>
                  </div>
                </div>
                <span className="badge badge-positive">Verified</span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.025)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🔑</span>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>PASSWORD</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>••••••••</div>
                  </div>
                </div>
                <span className="badge badge-neutral">Protected</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
