import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '15px 30px', 
      background: '#1a1a1a', 
      color: 'white',
      fontFamily: 'sans-serif'
    }}>
      <h2>QuantLedger</h2>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Private Portfolio</Link>
        <Link to="/advisor" style={{ color: 'white', textDecoration: 'none' }}>Investment Suggestions</Link>
        <Link to="/analysis" style={{ color: 'white', textDecoration: 'none' }}>Stock Analysis</Link>
        <button 
          onClick={handleLogout} 
          style={{ padding: '8px 16px', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}