import { useState } from 'react';
import { advisorAPI } from '../api';

export default function Advisor() {
  const [amount, setAmount] = useState(100000);
  const [timePeriod, setTimePeriod] = useState('5');
  const [isMonthly, setIsMonthly] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const handleGetAdvice = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await advisorAPI.getPlan(amount, timePeriod, isMonthly);
      setResults(res.data);
      setExpandedId(null);
    } catch {
      alert('Error fetching advice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const riskClass = (risk) => {
    if (risk.includes('Low')) return 'var(--green)';
    if (risk.includes('Medium')) return 'var(--gold)';
    return 'var(--red)';
  };

  return (
    <div className="page-container animate-in">
      <header className="page-header">
        <h1>Wealth Advisor</h1>
        <p>Personalized projections with min–max return bands and today&apos;s top-rate picks per category.</p>
      </header>

      <form onSubmit={handleGetAdvice} className="glass-card" style={{ padding: 24, marginBottom: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'end' }}>
        <div className="form-group">
          <label className="form-label">Amount (₹)</label>
          <input type="number" className="form-input" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
        </div>
        <div className="form-group">
          <label className="form-label">Time horizon</label>
          <select className="form-select" value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)}>
            <option value="1">1 Year</option>
            <option value="3">3 Years</option>
            <option value="5">5 Years</option>
            <option value="10">10 Years</option>
            <option value="none">Long term (flexible)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Investment style</label>
          <select className="form-select" value={isMonthly} onChange={(e) => setIsMonthly(e.target.value === 'true')}>
            <option value="false">Lump sum</option>
            <option value="true">SIP (monthly)</option>
          </select>
        </div>
        <button type="submit" className={`btn btn-primary${loading ? ' btn-loading' : ''}`} disabled={loading} style={{ gridColumn: '1 / -1' }}>
          {!loading && 'Generate Wealth Plan'}
        </button>
      </form>

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: '1.35rem' }}>Your Scoreboard</h2>
          {results.scoreboard.map((item, index) => (
            <div
              key={item.id}
              className="glass-card"
              style={{
                padding: 24,
                borderColor: index === 0 ? 'rgba(212, 175, 55, 0.45)' : undefined,
                animation: `fadeIn 0.4s ease ${index * 0.08}s both`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700, marginBottom: 4 }}>#{index + 1} RANKED</div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>{item.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 14px' }}>{item.description}</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <span className="badge badge-neutral">
                      Risk: <span style={{ color: riskClass(item.risk) }}>{item.risk}</span>
                    </span>
                    <span className="badge badge-neutral">
                      Return band: {item.return_min}% – {item.return_max}% p.a.
                    </span>
                    <span className="badge badge-neutral">
                      Invested: ₹{item.total_invested.toLocaleString()}
                    </span>
                  </div>

                  <div style={{ marginTop: 14, padding: 14, background: 'rgba(212, 175, 55, 0.06)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>PROJECTED VALUE (MIN – MAX)</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--gold-light)' }}>
                      ₹{item.projected_total_min.toLocaleString()} – ₹{item.projected_total_max.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--green)', marginTop: 6 }}>
                      Profit: +₹{item.projected_profit_min.toLocaleString()} – +₹{item.projected_profit_max.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: item.suitability_score > 70 ? 'linear-gradient(135deg, var(--gold-light), var(--gold))' : 'rgba(255,255,255,0.08)',
                  color: item.suitability_score > 70 ? '#1a1408' : 'var(--text-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 18, flexShrink: 0,
                  boxShadow: item.suitability_score > 70 ? 'var(--shadow-gold)' : 'none',
                }}>
                  {item.suitability_score}
                </div>
              </div>

              <button type="button" className="btn btn-ghost" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} style={{ marginTop: 12 }}>
                {expandedId === item.id ? '▼ Hide top 5 options' : '▶ Top 5 picks (current rates)'}
              </button>

              {expandedId === item.id && (
                <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none' }}>
                  {item.specific_options.map((opt, i) => (
                    <li key={i} style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span>{opt.name}</span>
                      <strong style={{ color: 'var(--gold-light)' }}>{opt.rate}%</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
