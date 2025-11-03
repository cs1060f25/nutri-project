import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

// This component is designed to be extensible - you can easily add more navigation items in the future
const Sidebar = ({ isCollapsed, onToggle }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();
  
  // In the future, you can expand this array with more pages
  const navigationItems = [
    {
      id: 'home',
      label: 'Home',
      path: '/home',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      )
    },
    {
      id: 'nutrition-plan',
      label: 'Nutrition Plan',
      path: '/home/nutrition-plan',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          <line x1="9" y1="12" x2="15" y2="12"></line>
          <line x1="9" y1="16" x2="15" y2="16"></line>
        </svg>
      )
    }
    // Future navigation items can be added here, for example:
    // { id: 'menu', label: 'Menu', path: '/menu', iconSvg: <svg>...</svg> },
    // { id: 'goals', label: 'Goals', path: '/goals', iconSvg: <svg>...</svg> },
    // { id: 'history', label: 'History', path: '/history', iconSvg: <svg>...</svg> },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div 
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
      onClick={() => isCollapsed && onToggle()}
    >
      <div className="sidebar-header">
        <h2 className="sidebar-title">HUDS Nutrition</h2>
        <button 
          className="collapse-button" 
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path 
              d="M3 4h18M3 12h18M3 20h18" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {navigationItems.map((item) => (
            <li key={item.id}>
              <Link 
                to={item.path} 
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.iconSvg}</span>
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        {!isCollapsed && user && (
          <div className="sidebar-user-info">
            <span className="user-email">{user.email}</span>
          </div>
        )}
        <button 
          className="sidebar-logout-button" 
          onClick={(e) => {
            e.stopPropagation();
            handleLogout();
          }}
          title="Logout"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

