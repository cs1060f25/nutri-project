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
    },
    {
      id: 'scanner',
      label: 'Food Scanner',
      path: '/home/scanner',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M4 7v10"></path>
          <path d="M20 7v10"></path>
          <path d="M7 4h10"></path>
          <path d="M7 20h10"></path>
        </svg>
      )
    },
    {
      id: 'meal-logs',
      label: 'Meal Logs',
      path: '/home/meal-logs',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
      )
    },
    {
      id: 'insights',
      label: 'Insights',
      path: '/home/insights',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20V10"></path>
          <path d="M18 20V4"></path>
          <path d="M6 20v-6"></path>
        </svg>
      )
    },
    {
      id: 'meal-planning',
      label: 'Meal Planning',
      path: '/home/meal-planning',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      )
    },
    {
      id: 'social',
      label: 'Social',
      path: '/home/social',
      iconSvg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
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
          {navigationItems.map((item) => {
            // Special handling for home - only active on exact /home path, not sub-routes
            let isActive = false;
            if (item.id === 'home') {
              isActive = location.pathname === '/home' || location.pathname === '/home/';
            } else {
              isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            }
            
            return (
              <li key={item.id}>
                <Link 
                  to={item.path} 
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.iconSvg}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              </li>
            );
          })}
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
          <span className="logout-text">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
