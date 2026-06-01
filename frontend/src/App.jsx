import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/auth';
import Dashboard from './components/dashboard';
import Advisor from './components/advisor';
import Analysis from './components/analysis';
import Profile from './components/profile';
import Navbar from './components/navbar';

function ProtectedLayout({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">{children}</main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/advisor" element={<ProtectedLayout><Advisor /></ProtectedLayout>} />
        <Route path="/analysis" element={<ProtectedLayout><Analysis /></ProtectedLayout>} />
        <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
      </Routes>
    </Router>
  );
}

export default App;
