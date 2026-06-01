import { useState, useEffect, useMemo } from 'react';
import { portfolioAPI } from '../api';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CHART_COLORS = ['#d4af37', '#f0d78c', '#9a7b1a', '#4ade80', '#a89f8c', '#c4a35a'];

const SEARCH_TYPES = new Set(['STOCK', 'MF', 'ETF', 'REIT', 'CRYPTO']);

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entryMode, setEntryMode] = useState('manual');
  const [assetType, setAssetType] = useState('STOCK');

  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [maturityDate, setMaturityDate] = useState('');

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [pan, setPan] = useState('');
  const [mobile, setMobile] = useState('');
  const [mfOtp, setMfOtp] = useState('');
  const [mfOtpSent, setMfOtpSent] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const res = await portfolioAPI.getPortfolio();
      setPortfolio(res.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    portfolioAPI.getCatalog().then((r) => setCatalog(r.data)).catch(() => {});
  }, []);

  const fieldSchema = useMemo(() => {
    if (!catalog?.fields) return [];
    return catalog.fields[assetType] || [];
  }, [catalog, assetType]);

  const typeOptions = useMemo(() => {
    if (!catalog?.groups) return [];
    return catalog.groups.flatMap((g) =>
      g.types.map((t) => ({ ...t, group: g.label }))
    );
  }, [catalog]);

  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setTicker(query);
    if (query.length > 1) {
      setIsSearching(true);
      try {
        const res = await portfolioAPI.searchAssets(query);
        setSearchResults(res.data);
      } catch {
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleSelectAsset = (symbol) => {
    setTicker(symbol);
    setSearchResults([]);
    setIsSearching(false);
  };

  const resetForm = () => {
    setTicker('');
    setQuantity('');
    setPrice('');
    setMaturityDate('');
  };

  const handleBuy = async (e) => {
    e.preventDefault();
    try {
      await portfolioAPI.buyStock(
        ticker,
        parseFloat(quantity),
        parseFloat(price),
        assetType,
        maturityDate || null
      );
      resetForm();
      fetchPortfolio();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error adding asset');
    }
  };

  const handlePanSync = async (e) => {
    e.preventDefault();
    setSyncMsg('');
    try {
      const res = await portfolioAPI.syncPan(pan);
      setSyncMsg(res.data.message);
      setPan('');
      fetchPortfolio();
    } catch (error) {
      setSyncMsg(error.response?.data?.detail || 'PAN sync failed');
    }
  };

  const handleMfSync = async (e) => {
    e.preventDefault();
    setSyncMsg('');
    try {
      const res = await portfolioAPI.syncMfCentral(mobile, mfOtpSent ? mfOtp : undefined);
      if (res.data.status === 'otp_required') {
        setMfOtpSent(true);
        setSyncMsg(res.data.message);
        return;
      }
      setSyncMsg(res.data.message);
      setMfOtp('');
      setMfOtpSent(false);
      fetchPortfolio();
    } catch (error) {
      setSyncMsg(error.response?.data?.detail || 'MF Central sync failed');
    }
  };

  const usesSearch = SEARCH_TYPES.has(assetType);

  if (loading && !portfolio) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
        <span>Loading your portfolio…</span>
      </div>
    );
  }

  const holdings = portfolio?.holdings || [];
  const chartData = holdings.map((item) => ({
    name: item.ticker,
    value: item.current_value ?? item.quantity * item.current_price,
  }));

  return (
    <div className="page-container animate-in">
      <header className="page-header">
        <h1>Portfolio</h1>
        <p>Track every asset class — from fixed deposits to equities — in one golden ledger.</p>
      </header>

      <div className="stat-grid">
        <div className="glass-card stat-card">
          <div className="stat-label">Total Value</div>
          <div className="stat-value">₹{(portfolio?.total_value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-label">Profit / Loss</div>
          <div className={`stat-value ${(portfolio?.total_pnl ?? 0) >= 0 ? 'positive' : 'negative'}`}>
            {(portfolio?.total_pnl ?? 0) >= 0 ? '+' : ''}₹{(portfolio?.total_pnl ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span style={{ fontSize: '0.55em', marginLeft: 8, opacity: 0.85 }}>
              ({(portfolio?.total_pnl_percent ?? 0).toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-label">Holdings</div>
          <div className="stat-value">{holdings.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: '1.15rem' }}>Add Holdings</h3>

          <div className="tabs">
            {[
              { id: 'manual', label: '✍️ Manual' },
              { id: 'pan', label: '🪪 PAN Sync' },
              { id: 'mf', label: '📱 MF Central' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`tab${entryMode === tab.id ? ' active' : ''}`}
                onClick={() => { setEntryMode(tab.id); setSyncMsg(''); }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {syncMsg && (
            <div className="alert-success mb-4" style={{ marginBottom: 16 }}>{syncMsg}</div>
          )}

          {entryMode === 'manual' && (
            <form onSubmit={handleBuy} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Investment type</label>
                <select
                  className="form-select"
                  value={assetType}
                  onChange={(e) => { setAssetType(e.target.value); resetForm(); }}
                >
                  {typeOptions.length === 0 && (
                    <>
                      <option value="STOCK">Stocks / Equities</option>
                      <option value="MF">Mutual Funds</option>
                      <option value="FD">Fixed Deposit</option>
                    </>
                  )}
                  {catalog?.groups?.map((g) => (
                    <optgroup key={g.id} label={g.label}>
                      {g.types.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {usesSearch ? (
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Search symbol</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. HDFC Bank, Reliance"
                    value={ticker}
                    onChange={handleSearchChange}
                    required
                  />
                  {isSearching && searchResults.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {searchResults.map((r) => (
                        <div
                          key={r.symbol}
                          className="autocomplete-item"
                          onClick={() => handleSelectAsset(r.symbol)}
                        >
                          <strong>{r.symbol}</strong>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}> — {r.name}</span>
                          <div className="hint">💡 {r.hint}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">{fieldSchema.find((f) => f.key === 'ticker')?.label || 'Name'}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  {fieldSchema.find((f) => f.key === 'quantity')?.label || 'Quantity'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {fieldSchema.find((f) => f.key === 'average_buy_price')?.label || 'Price / Rate'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              {fieldSchema.some((f) => f.key === 'maturity_date') && (
                <div className="form-group">
                  <label className="form-label">Maturity date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={maturityDate}
                    onChange={(e) => setMaturityDate(e.target.value)}
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary w-full">Add to Portfolio</button>
            </form>
          )}

          {entryMode === 'pan' && (
            <form onSubmit={handlePanSync} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Link holdings via PAN (demo imports sample stocks & PPF). Production: NSDL/CDSL integration.
              </p>
              <div className="form-group">
                <label className="form-label">PAN number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ABCDE1234F"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  maxLength={10}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-full">Sync via PAN</button>
            </form>
          )}

          {entryMode === 'mf' && (
            <form onSubmit={handleMfSync} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Import mutual funds from MF Central (demo). Enter mobile, then OTP when prompted.
              </p>
              <div className="form-group">
                <label className="form-label">Registered mobile</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                />
              </div>
              {mfOtpSent && (
                <div className="form-group">
                  <label className="form-label">OTP</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="6-digit OTP"
                    value={mfOtp}
                    onChange={(e) => setMfOtp(e.target.value)}
                    required
                  />
                </div>
              )}
              <button type="submit" className="btn btn-primary w-full">
                {mfOtpSent ? 'Verify & Import' : 'Send OTP'}
              </button>
            </form>
          )}
        </div>

        <div className="glass-card chart-wrap" style={{ minHeight: 320 }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="rgba(0,0,0,0.2)" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Value']}
                  contentStyle={{
                    background: '#12101a',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 8,
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="loading-page" style={{ minHeight: 260 }}>
              <span>No assets yet — add manually or sync</span>
            </div>
          )}
        </div>
      </div>

      {holdings.length > 0 && (
        <div className="glass-card" style={{ padding: 24, marginTop: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Holdings</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Value</th>
                  <th>P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.id || h.ticker}>
                    <td><strong style={{ color: 'var(--gold-light)' }}>{h.ticker}</strong></td>
                    <td><span className="badge badge-neutral">{h.asset_type}</span></td>
                    <td>{h.quantity}</td>
                    <td>₹{(h.current_value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td style={{ color: h.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {h.pnl >= 0 ? '+' : ''}₹{h.pnl?.toFixed(0)} ({h.pnl_percent?.toFixed(1)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
