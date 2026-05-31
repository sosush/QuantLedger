import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // React Router hook to change pages
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevents the page from refreshing when you click submit
    setError('');
    
    try {
      if (isLogin) {
        // 1. Call our FastAPI Login endpoint
        const res = await authAPI.login(email, password);
        
        // 2. Save the VIP Stamp (JWT Token) to the browser's Local Storage!
        localStorage.setItem('token', res.data.access_token);
        
        // 3. Send them to the dashboard
        navigate('/dashboard'); 
      } else {
        // Call FastAPI Register endpoint
        await authAPI.register(email, password);
        alert("Registered successfully! Please log in.");
        setIsLogin(true); // Switch back to login view
      }
    } catch (err) {
      // If FastAPI throws a 401 or 400 error, display it
      setError(err.response?.data?.detail || "Something went wrong");
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', fontFamily: 'sans-serif' }}>
      <h2>{isLogin ? 'Login to QuantLedger' : 'Create an Account'}</h2>
      
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '10px' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '10px' }}
        />
        <button type="submit" style={{ padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', cursor: 'pointer' }}>
          {isLogin ? 'Login' : 'Register'}
        </button>
      </form>
      
      <p style={{ marginTop: '20px', cursor: 'pointer', color: 'blue' }} onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
      </p>
    </div>
  );
}