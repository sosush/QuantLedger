import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/auth';
import Dashboard from './components/dashboard';
import Advisor from './components/advisor';
import Analysis from './components/analysis';
import Navbar from './components/navbar';

// A special component to protect our routes and show the Navbar
function ProtectedLayout({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  
  return (
    <div>
      <Navbar />
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Auth />} />
        
        {/* Protected Routes (Require Login & Show Navbar) */}
        <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/advisor" element={<ProtectedLayout><Advisor /></ProtectedLayout>} />
        <Route path="/analysis" element={<ProtectedLayout><Analysis /></ProtectedLayout>} />
      </Routes>
    </Router>
  );
}

export default App;