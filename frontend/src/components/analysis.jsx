import { useState } from 'react';
import { analysisAPI, portfolioAPI } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const LINE_COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'];

export default function Analysis() {
  const [selectedTickers, setSelectedTickers] = useState(['AAPL', 'MSFT']); // Array of selected stocks!
  const [period, setPeriod] = useState('1y');
  
  // Search State
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- SEARCH LOGIC ---
  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearchInput(query);
    
    if (query.length > 1) {
      setIsSearching(true);
      try {
        const res = await portfolioAPI.searchAssets(query);
        setSearchResults(res.data);
      } catch (err) {
        console.error("Search failed");
      }
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleAddTicker = (symbol) => {
    if (selectedTickers.length >= 5) {
      alert("You can only compare up to 5 stocks at once.");
    } else if (!selectedTickers.includes(symbol)) {
      setSelectedTickers([...selectedTickers, symbol]);
    }
    setSearchInput('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleRemoveTicker = (symbolToRemove) => {
    setSelectedTickers(selectedTickers.filter(t => t !== symbolToRemove));
  };

  // --- ANALYSIS LOGIC ---
  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (selectedTickers.length === 0) return setError("Please select at least one stock.");
    
    setLoading(true); setError(''); setResults(null);
    try {
      const res = await analysisAPI.compareStocks(selectedTickers, period);
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch stock data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Stock Analysis & Comparison</h1>
      <p style={{ color: 'gray' }}>Compare historical performance, volatility, and total returns.</p>

      {/* --- SMART INPUT FORM --- */}
      <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: '20px', background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        <div style={{ flex: 2, minWidth: '300px' }}>
          <label><strong>Search & Add Stocks:</strong></label>
          
          {/* THE CHIPS (SELECTED TAGS) */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px', marginBottom: '10px' }}>
            {selectedTickers.map(ticker => (
              <span key={ticker} style={{ background: '#e6f7ff', border: '1px solid #91d5ff', color: '#0050b3', padding: '4px 10px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {ticker}
                <button type="button" onClick={() => handleRemoveTicker(ticker)} style={{ background: 'none', border: 'none', color: '#0050b3', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
              </span>
            ))}
          </div>

          {/* SEARCH BOX WITH DROPDOWN */}
          <div style={{ position: 'relative' }}>
            <input type="text" placeholder="Search Company (e.g., Reliance)" value={searchInput} onChange={handleSearchChange} style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }} />
            {isSearching && searchResults.length > 0 && (
              <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', margin: 0, padding: 0, listStyle: 'none', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                {searchResults.map((result) => (
                  <li key={result.symbol} onClick={() => handleAddTicker(result.symbol)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}>
                    <strong>{result.symbol}</strong> - {result.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <label><strong>Time Period:</strong></label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '10px' }}>
            <option value="1mo">1 Month</option>
            <option value="6mo">6 Months</option>
            <option value="1y">1 Year</option>
            <option value="5y">5 Years</option>
          </select>
        </div>

        <button type="submit" style={{ padding: '12px 24px', background: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '28px' }}>
          {loading ? "Analyzing..." : "Compare Stocks"}
        </button>
      </form>

      {error && <div style={{ color: 'red', marginBottom: '20px', padding: '15px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '4px' }}>{error}</div>}

      {/* --- RESULTS (Keep this exactly the same as before!) --- */}
      {results && (
        <div>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
            {Object.keys(results.metrics).map((ticker, index) => {
              const data = results.metrics[ticker];
              const isPositive = data.total_return_percent >= 0;
              return (
                <div key={ticker} style={{ flex: 1, minWidth: '200px', padding: '20px', borderTop: `4px solid ${LINE_COLORS[index % LINE_COLORS.length]}`, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '0 0 8px 8px' }}>
                  <h3 style={{ margin: '0 0 15px 0' }}>{ticker}</h3>
                  <div style={{ marginBottom: '8px' }}><strong>Current Price:</strong> ${data.current_price}</div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Total Return:</strong> <span style={{ color: isPositive ? 'green' : 'red', fontWeight: 'bold' }}>{isPositive ? '+' : ''}{data.total_return_percent}%</span>
                  </div>
                  <div><strong>Volatility (Risk):</strong> {data.volatility_percent}%</div>
                </div>
              );
            })}
          </div>
          <div style={{ height: '400px', background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', textAlign: 'center' }}>Price History Comparison</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={results.chart_data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="Date" tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} minTickGap={30} />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip labelFormatter={(label) => `Date: ${label}`} formatter={(value) => [`$${value}`, undefined]} />
                <Legend />
                {Object.keys(results.metrics).map((ticker, index) => (
                  <Line key={ticker} type="monotone" dataKey={ticker} stroke={LINE_COLORS[index % LINE_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}