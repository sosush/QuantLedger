import { useState, useEffect } from 'react';
import { portfolioAPI } from '../api';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

export default function Dashboard() {
  // --- ALL STATE HOOKS MUST LIVE INSIDE THE FUNCTION ---
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Trade Form State
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  // Autocomplete Search State
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- LIFECYCLE & DATA FETCHING ---
  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const res = await portfolioAPI.getPortfolio();
      setPortfolio(res.data);
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  // --- SEARCH LOGIC ---
  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setTicker(query);
    
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

  const handleSelectAsset = (symbol) => {
    setTicker(symbol);
    setSearchResults([]); // Hide the dropdown
    setIsSearching(false);
  };

  // --- SUBMIT TRADE LOGIC ---
  const handleBuy = async (e) => {
    e.preventDefault();
    try {
      await portfolioAPI.buyStock(ticker, parseFloat(quantity), parseFloat(price));
      setTicker(''); setQuantity(''); setPrice('');
      fetchPortfolio(); // Refresh pie chart
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Error adding trade";
      alert(errorMessage);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Market Data...</div>;

  const chartData = portfolio?.holdings?.map(item => ({
    name: item.ticker,
    value: item.quantity * item.current_price
  })) || [];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>QuantLedger Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
      </div>

      <div style={{ display: 'flex', gap: '20px', margin: '20px 0' }}>
        <div style={{ padding: '20px', background: '#f0f2f5', borderRadius: '8px', flex: 1 }}>
          <h3>Total Value</h3>
          <h2 style={{ margin: 0, color: '#111' }}>${portfolio?.total_value?.toFixed(2) || '0.00'}</h2>
        </div>
        <div style={{ padding: '20px', background: '#f0f2f5', borderRadius: '8px', flex: 1 }}>
          <h3>Total Profit/Loss</h3>
          <h2 style={{ margin: 0, color: portfolio?.total_pnl >= 0 ? 'green' : 'red' }}>
            ${portfolio?.total_pnl?.toFixed(2) || '0.00'} 
            ({portfolio?.total_pnl_percent?.toFixed(2) || '0.00'}%)
          </h2>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '40px' }}>
        <div style={{ flex: 1, padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Log a Trade</h3>
          <form onSubmit={handleBuy} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* AUTOLOAD SEARCH WRAPPER */}
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Search Company or Ticker (e.g., Tata)" 
                value={ticker} 
                onChange={handleSearchChange} 
                required 
                style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }}
              />
              {isSearching && searchResults.length > 0 && (
                <ul style={{ 
                  position: 'absolute', top: '100%', left: 0, right: 0, 
                  background: 'white', border: '1px solid #ccc', margin: 0, padding: 0, 
                  listStyle: 'none', zIndex: 10, maxHeight: '200px', overflowY: 'auto' 
                }}>
                  {searchResults.map((result) => (
                    <li 
                      key={result.symbol} 
                      onClick={() => handleSelectAsset(result.symbol)}
                      style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                    >
                      <strong>{result.symbol}</strong> - {result.name} <span style={{fontSize: '0.8em', color: 'gray'}}>({result.exchange})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <input type="number" step="0.01" placeholder="Quantity" value={quantity} onChange={e => setQuantity(e.target.value)} required style={{ padding: '8px' }}/>
            <input type="number" step="0.01" placeholder="Average Buy Price" value={price} onChange={e => setPrice(e.target.value)} required style={{ padding: '8px' }}/>
            <button type="submit" style={{ padding: '10px', background: '#1890ff', color: 'white', border: 'none', cursor: 'pointer' }}>Add to Portfolio</button>
          </form>
        </div>

        <div style={{ flex: 1, height: '300px' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
              No assets in portfolio yet. Buy a stock to see analytics!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}