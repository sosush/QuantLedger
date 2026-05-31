export default function Dashboard() {
    const handleLogout = () => {
      localStorage.removeItem('token');
      window.location.href = '/login';
    };
  
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1>Dashboard</h1>
        <p>Welcome to your portfolio!</p>
        <button onClick={handleLogout} style={{ padding: '5px 10px' }}>Logout</button>
      </div>
    );
  }