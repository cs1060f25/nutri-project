import React from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import SocialFeed from '../components/SocialFeed';
import SocialProfile from '../components/SocialProfile';
import SocialSearch from '../components/SocialSearch';
import './Social.css';

const Social = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { id: 'feed', label: 'Feed', path: '/home/social/feed' },
    { id: 'search', label: 'Search', path: '/home/social/search' },
    { id: 'profile', label: 'My Profile', path: '/home/social/profile' },
  ];

  // Default to feed if on base social path
  React.useEffect(() => {
    if (location.pathname === '/home/social' || location.pathname === '/home/social/') {
      navigate('/home/social/feed', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="social-page">
      <div className="social-header">
        <h1>Social</h1>
        <p>Connect with friends and share your dining experiences</p>
      </div>

      <div className="social-tabs">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            to={tab.path}
            className={`social-tab ${location.pathname === tab.path ? 'active' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="social-content">
        <Routes>
          <Route path="/feed" element={<SocialFeed />} />
          <Route path="/profile" element={<SocialProfile />} />
          <Route path="/user/:userId" element={<SocialProfile />} />
          <Route path="/search" element={<SocialSearch />} />
          <Route path="*" element={<SocialFeed />} />
        </Routes>
      </div>
    </div>
  );
};

export default Social;

