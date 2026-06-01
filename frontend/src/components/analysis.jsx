import { useState, useMemo, useCallback, useEffect } from 'react';
import { analysisAPI, portfolioAPI } from '../api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts';

const LINE_COLORS = ['#d4af37', '#f0d78c', '#4ade80', '#f87171', '#a89f8c'];

function buildChartSeries(chartData, tickers, mode) {
  if (!chartData?.length || !tickers.length) return [];
  const baseRow = chartData[0];
  return chartData.map((row) => {
    const point = { Date: row.Date };
    tickers.forEach((t) => {
      const v = row[t];
      if (v == null || Number.isNaN(v)) {
        point[t] = null;
        return;
      }
      if (mode === 'indexed') {
        const base = baseRow[t];
        point[t] = base ? (v / base) * 100 : null;
      } else {
        point[t] = v;
      }
    });
    return point;
  });
}

export default function Analysis() {
  const [selectedTickers, setSelectedTickers] = useState(['RELIANCE.NS', 'TCS.NS']);
  const [period, setPeriod] = useState('1y');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [priceView, setPriceView] = useState('indexed');
  const [zoomStart, setZoomStart] = useState(0);
  const [zoomEnd, setZoomEnd] = useState(1);

  const tickers = results ? Object.keys(results.metrics) : [];
  const showDropdown = isSearching && searchResults.length > 0;

  const fullChartData = useMemo(() => {
    if (!results?.chart_data) return [];
    return buildChartSeries(results.chart_data, tickers, priceView);
  }, [results, tickers, priceView]);

  const totalPoints = fullChartData.length;

  const visibleChartData = useMemo(() => {
    if (!totalPoints) return [];
    const start = Math.max(0, Math.floor(zoomStart * (totalPoints - 1)));
    const end = Math.min(totalPoints - 1, Math.ceil(zoomEnd * (totalPoints - 1)));
    let slice = fullChartData.slice(start, end + 1);
    if (priceView === 'indexed' && slice.length > 0) {
      const base = slice[0];
      slice = slice.map((row) => {
        const point = { Date: row.Date };
        tickers.forEach((t) => {
          const v = row[t];
          const b = base[t];
          point[t] = b ? (v / b) * 100 : null;
        });
        return point;
      });
    }
    return slice;
  }, [fullChartData, zoomStart, zoomEnd, totalPoints, priceView, tickers]);

  useEffect(() => {
    setZoomStart(0);
    setZoomEnd(1);
  }, [results, period, priceView]);

  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearchInput(query);
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

  const handleAddTicker = (symbol) => {
    if (selectedTickers.length >= 5) {
      alert('Compare up to 5 symbols at once.');
    } else if (!selectedTickers.includes(symbol)) {
      setSelectedTickers([...selectedTickers, symbol]);
    }
    setSearchInput('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleRemoveTicker = (sym) => {
    setSelectedTickers(selectedTickers.filter((t) => t !== sym));
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!selectedTickers.length) return setError('Select at least one symbol.');
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await analysisAPI.compareStocks(selectedTickers, period);
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  const zoomIn = useCallback(() => {
    const span = zoomEnd - zoomStart;
    if (span <= 0.08) return;
    const mid = (zoomStart + zoomEnd) / 2;
    const newSpan = span * 0.65;
    setZoomStart(Math.max(0, mid - newSpan / 2));
    setZoomEnd(Math.min(1, mid + newSpan / 2));
  }, [zoomStart, zoomEnd]);

  const zoomOut = useCallback(() => {
    const span = zoomEnd - zoomStart;
    if (span >= 0.99) {
      setZoomStart(0);
      setZoomEnd(1);
      return;
    }
    const mid = (zoomStart + zoomEnd) / 2;
    const newSpan = Math.min(1, span * 1.45);
    setZoomStart(Math.max(0, mid - newSpan / 2));
    setZoomEnd(Math.min(1, mid + newSpan / 2));
  }, [zoomStart, zoomEnd]);

  const resetZoom = () => {
    setZoomStart(0);
    setZoomEnd(1);
  };

  const handleBrushChange = (range) => {
    if (!range || range.startIndex == null || range.endIndex == null || !totalPoints) return;
    setZoomStart(range.startIndex / (totalPoints - 1 || 1));
    setZoomEnd(range.endIndex / (totalPoints - 1 || 1));
  };

  const brushStart = Math.floor(zoomStart * Math.max(0, totalPoints - 1));
  const brushEnd = Math.ceil(zoomEnd * Math.max(0, totalPoints - 1));
  const canZoomIn = zoomEnd - zoomStart > 0.08;
  const canZoomOut = zoomEnd - zoomStart < 0.99;

  const yFormatter = (v) => {
    if (priceView === 'indexed') return `${Number(v).toFixed(0)}`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
    return `₹${Number(v).toFixed(0)}`;
  };

  const tooltipFormatter = (value) => {
    if (priceView === 'indexed') return [`${Number(value).toFixed(2)} (base=100)`, ''];
    return [`₹${Number(value).toFixed(2)}`, ''];
  };

  return (
    <div className="page-container animate-in">
      <header className="page-header">
        <h1>Market Analysis</h1>
        <p>Compare price trends, volatility, and how each stock moves when another moves 1%.</p>
      </header>

      <form
        onSubmit={handleAnalyze}
        className={`glass-card analysis-toolbar${showDropdown ? ' analysis-toolbar--open' : ''}`}
        style={{ padding: 24 }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {selectedTickers.map((t) => (
            <span key={t} className="badge" style={{ background: 'var(--gold-dim)', color: 'var(--gold-light)', padding: '6px 12px', fontSize: 13 }}>
              {t}
              <button type="button" onClick={() => handleRemoveTicker(t)} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
            </span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'end' }}>
          <div className="form-group analysis-search-anchor">
            <label className="form-label">Add symbol</label>
            <input type="text" className="form-input" placeholder="Search e.g. HDFC Bank" value={searchInput} onChange={handleSearchChange} />
            {showDropdown && (
              <div className="autocomplete-dropdown" role="listbox">
                {searchResults.map((r) => (
                  <div
                    key={r.symbol}
                    className="autocomplete-item"
                    role="option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleAddTicker(r.symbol)}
                  >
                    <strong>{r.symbol}</strong> — {r.name}
                    <div className="hint">💡 {r.hint}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Period</label>
            <select className="form-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="1mo">1 Month</option>
              <option value="3mo">3 Months</option>
              <option value="6mo">6 Months</option>
              <option value="1y">1 Year</option>
              <option value="5y">5 Years</option>
            </select>
          </div>
          <button type="submit" className={`btn btn-primary${loading ? ' btn-loading' : ''}`} disabled={loading}>
            {!loading && 'Compare'}
          </button>
        </div>
      </form>

      {error && <div className="alert-error mb-4">{error}</div>}

      {results && (
        <div className="analysis-results" style={{ position: 'relative', zIndex: 1 }}>
          <div className="stat-grid">
            {tickers.map((ticker, index) => {
              const data = results.metrics[ticker];
              const up = data.total_return_percent >= 0;
              return (
                <div key={ticker} className="glass-card stat-card" style={{ borderTop: `3px solid ${LINE_COLORS[index % LINE_COLORS.length]}` }}>
                  <div className="stat-label">{ticker}</div>
                  <div className="stat-value" style={{ fontSize: '1.25rem' }}>₹{data.current_price}</div>
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    <span style={{ color: up ? 'var(--green)' : 'var(--red)' }}>
                      {up ? '+' : ''}{data.total_return_percent}% return
                    </span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 12 }}>σ {data.volatility_percent}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass-card chart-wrap" style={{ marginBottom: 24, marginTop: 24 }}>
            <div className="chart-toolbar">
              <div className="chart-toolbar-group">
                <span className="zoom-hint">Price scale</span>
                <div className="chart-view-toggle">
                  <button
                    type="button"
                    className={priceView === 'indexed' ? 'active' : ''}
                    onClick={() => setPriceView('indexed')}
                    title="Rebase all stocks to 100 at range start — best for large price drift"
                  >
                    Indexed (100)
                  </button>
                  <button
                    type="button"
                    className={priceView === 'absolute' ? 'active' : ''}
                    onClick={() => setPriceView('absolute')}
                  >
                    Absolute ₹
                  </button>
                </div>
              </div>
              <div className="chart-toolbar-group">
                <span className="zoom-hint">Time zoom</span>
                <button type="button" className="btn-zoom" onClick={zoomOut} disabled={!canZoomOut} title="Zoom out">−</button>
                <button type="button" className="btn-zoom" onClick={zoomIn} disabled={!canZoomIn} title="Zoom in">+</button>
                <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={resetZoom}>
                  Reset
                </button>
              </div>
            </div>

            <h3 style={{ textAlign: 'center', margin: '0 0 8px', fontSize: '1rem' }}>
              {priceView === 'indexed' ? 'Performance (rebased to 100)' : 'Price history'}
            </h3>
            <p className="zoom-hint" style={{ textAlign: 'center', margin: '0 0 12px' }}>
              Drag the gold range bar below the chart to focus a date window. Use +/− to zoom time when stocks diverge sharply.
            </p>

            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={visibleChartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.1)" />
                <XAxis
                  dataKey="Date"
                  tick={{ fill: '#a89f8c', fontSize: 11 }}
                  tickFormatter={(t) => new Date(t).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fill: '#a89f8c', fontSize: 11 }}
                  tickFormatter={yFormatter}
                  domain={['auto', 'auto']}
                  allowDataOverflow
                />
                <Tooltip
                  contentStyle={{ background: '#12101a', border: '1px solid var(--glass-border)' }}
                  formatter={tooltipFormatter}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                {tickers.map((t, i) => (
                  <Line
                    key={t}
                    type="monotone"
                    dataKey={t}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
                {totalPoints > 5 && (
                  <Brush
                    dataKey="Date"
                    height={28}
                    stroke="var(--gold)"
                    fill="rgba(212, 175, 55, 0.12)"
                    travellerWidth={10}
                    startIndex={brushStart}
                    endIndex={brushEnd}
                    onChange={handleBrushChange}
                    tickFormatter={(t) => new Date(t).toLocaleDateString('en-IN', { month: 'short' })}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {results.beta_matrix && tickers.length > 1 && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 8 }}>Sensitivity Matrix</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                For each 1% move in the row asset, how much the column asset tends to move (%).
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table className="beta-table">
                  <thead>
                    <tr>
                      <th></th>
                      {tickers.map((t) => <th key={t}>{t}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {tickers.map((row) => (
                      <tr key={row}>
                        <th>{row}</th>
                        {tickers.map((col) => {
                          const val = results.beta_matrix[row]?.[col];
                          const isDiag = row === col;
                          return (
                            <td key={col} className={isDiag ? 'diagonal' : ''} style={{ color: !isDiag && Math.abs(val) > 1 ? 'var(--gold-light)' : undefined }}>
                              {isDiag ? '1.00' : `${(val * 100).toFixed(2)}%`}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
