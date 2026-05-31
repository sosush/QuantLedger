import { useState } from 'react';
import { advisorAPI } from '../api';

export default function advisor() {
  // Form State
  const [amount, setAmount] = useState(100000);
  const [timePeriod, setTimePeriod] = useState("5");
  const [isMonthly, setIsMonthly] = useState(false);
  
  // Data State
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null); // Controls which drill-down is open

  const handleGetAdvice = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await advisorAPI.getPlan(amount, timePeriod, isMonthly);
      setResults(res.data);
      setExpandedId(null); // Reset expansions on new search
    } catch (error) {
      alert("Error fetching advice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to color-code risk levels
  const getRiskColor = (risk) => {
    if (risk.includes("Zero") || risk.includes("Low")) return "green";
    if (risk.includes("Medium")) return "orange";
    return "red";
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Investment Advisor</h1>
      <p style={{ color: 'gray' }}>Enter your investment goals to get a personalized, math-driven strategy.</p>

      {/* --- USER INPUT FORM --- */}
      <form onSubmit={handleGetAdvice} style={{ display: 'flex', gap: '20px', background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label>Amount (₹ or $):</label>
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(Number(e.target.value))} 
            required 
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          />
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <label>Time Horizon:</label>
          <select 
            value={timePeriod} 
            onChange={(e) => setTimePeriod(e.target.value)}
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          >
            <option value="1">1 Year</option>
            <option value="3">3 Years</option>
            <option value="5">5 Years</option>
            <option value="10">10 Years</option>
            <option value="none">No Fixed Limit (Long Term)</option>
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <label>Investment Type:</label>
          <select 
            value={isMonthly} 
            onChange={(e) => setIsMonthly(e.target.value === 'true')}
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          >
            <option value="false">Lump Sum (One Time)</option>
            <option value="true">SIP (Monthly Installment)</option>
          </select>
        </div>

        <button type="submit" style={{ width: '100%', padding: '12px', background: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
          {loading ? "Calculating..." : "Generate Wealth Plan"}
        </button>
      </form>

      {/* --- THE SCOREBOARD --- */}
      {results && (
        <div>
          <h2>Your Scoreboard</h2>
          {results.scoreboard.map((item, index) => (
            <div 
              key={item.id} 
              style={{ 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                padding: '20px', 
                marginBottom: '15px',
                background: index === 0 ? '#f0fbff' : 'white', // Highlight the #1 recommendation
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 10px 0' }}>
                    #{index + 1} - {item.name}
                  </h3>
                  <p style={{ margin: '0 0 10px 0', color: '#555' }}>{item.description}</p>
                  
                  {/* METRICS */}
                  <div style={{ display: 'flex', gap: '15px', fontSize: '14px', flexWrap: 'wrap' }}>
                    <span style={{ background: '#eee', padding: '4px 8px', borderRadius: '4px' }}>
                      <strong>Risk:</strong> <span style={{ color: getRiskColor(item.risk) }}>{item.risk}</span>
                    </span>
                    <span style={{ background: '#eee', padding: '4px 8px', borderRadius: '4px' }}>
                      <strong>Invested:</strong> ${item.total_invested.toLocaleString()}
                    </span>
                    <span style={{ background: '#e6f7ff', padding: '4px 8px', borderRadius: '4px', color: '#0050b3' }}>
                      <strong>Projected Value:</strong> ${item.projected_total.toLocaleString()}
                    </span>
                    <span style={{ background: '#f6ffed', padding: '4px 8px', borderRadius: '4px', color: '#389e0d' }}>
                      <strong>Est. Profit:</strong> +${item.projected_profit.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* SUITABILITY SCORE BADGE */}
                <div style={{ textAlign: 'center', background: item.suitability_score > 70 ? '#52c41a' : (item.suitability_score > 40 ? '#faad14' : '#ff4d4f'), color: 'white', padding: '10px', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {item.suitability_score}
                </div>
              </div>

              {/* --- DRILL DOWN BUTTON --- */}
              <button 
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                style={{ marginTop: '15px', background: 'none', border: 'none', color: '#1890ff', cursor: 'pointer', padding: 0, fontSize: '14px' }}
              >
                {expandedId === item.id ? "▼ Hide Options" : "▶ View Specific Options"}
              </button>

              {/* --- DRILL DOWN CONTENT --- */}
              {expandedId === item.id && (
                <div style={{ marginTop: '15px', padding: '15px', background: '#fafafa', borderTop: '1px solid #ddd' }}>
                  <h4>Available Options:</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {item.specific_options.map((opt, i) => (
                      <li key={i} style={{ marginBottom: '8px' }}>
                        <strong>{opt.name}</strong> — {opt.rate}% Expected ROI
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}