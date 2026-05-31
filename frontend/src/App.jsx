import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/auth';
import Dashboard from './components/dashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* If they go to the root URL, redirect them to login */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* Our two main pages */}
        <Route path="/login" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;