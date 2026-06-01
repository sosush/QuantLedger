import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { profileAPI } from '../api';

export default function Navbar() {
  const navigate = useNavigate();
  const [initials, setInitials] = useState('U');
  const [avatarColor, setAvatarColor] = useState('#d4af37');

  useEffect(() => {
    profileAPI.getProfile()
      .then((res) => {
        const name = res.data.full_name;
        if (name) {
          const parts = name.trim().split(' ');
          setInitials((parts[0][0] + (parts[1]?.[0] || '')).toUpperCase());
        } else {
          setInitials(res.data.email?.[0]?.toUpperCase() || 'U');
        }
        setAvatarColor(res.data.avatar_color || '#d4af37');
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">₹</div>
        <span className="navbar-title">QuantLedger</span>
      </div>

      <div className="navbar-links">
        <NavLink to="/dashboard" className={linkClass}>Portfolio</NavLink>
        <NavLink to="/advisor" className={linkClass}>Advisor</NavLink>
        <NavLink to="/analysis" className={linkClass}>Analysis</NavLink>
      </div>

      <div className="navbar-actions">
        <NavLink to="/profile" className={({ isActive }) => `nav-avatar-wrap${isActive ? ' active' : ''}`}>
          <div className="nav-avatar" style={{ background: avatarColor }}>{initials}</div>
        </NavLink>
        <button type="button" className="btn-nav-logout" onClick={handleLogout}>Sign Out</button>
      </div>

      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          height: var(--nav-height);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          background: rgba(7, 6, 10, 0.82);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--glass-border);
          box-shadow: 0 4px 32px rgba(0, 0, 0, 0.4);
        }
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .navbar-logo {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--gold-light), var(--gold-dark));
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 18px;
          color: #1a1408;
          box-shadow: var(--shadow-gold);
        }
        .navbar-title {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.2rem;
          background: linear-gradient(135deg, var(--gold-light), var(--gold));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .navbar-links {
          display: flex;
          gap: 4px;
        }
        .nav-link {
          color: var(--text-muted);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          transition: var(--transition);
        }
        .nav-link:hover {
          color: var(--gold-light);
        }
        .nav-link.active {
          color: var(--gold-light);
          background: var(--gold-dim);
          box-shadow: inset 0 0 0 1px var(--glass-border);
        }
        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .nav-avatar-wrap {
          text-decoration: none;
          padding: 3px;
          border-radius: 50%;
          border: 2px solid transparent;
          transition: var(--transition);
        }
        .nav-avatar-wrap.active {
          border-color: var(--gold);
        }
        .nav-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: #1a1408;
        }
        .btn-nav-logout {
          padding: 8px 14px;
          background: rgba(248, 113, 113, 0.1);
          color: var(--red);
          border: 1px solid rgba(248, 113, 113, 0.25);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          font-family: var(--font-sans);
          transition: var(--transition);
        }
        .btn-nav-logout:hover {
          background: rgba(248, 113, 113, 0.18);
        }
        @media (max-width: 640px) {
          .navbar-links { display: none; }
          .navbar-title { display: none; }
        }
      `}</style>
    </nav>
  );
}
