import React, { useState, useEffect } from 'react';
import './Home.css';

const Home = () => {
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch data from the GET /home endpoint
    fetch('/home')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch home data');
        }
        return response.json();
      })
      .then(data => {
        setHomeData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="home-page">
        <div className="loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-page">
        <div className="error-container">
          <p className="error-message">Unable to load content. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-container">
        <div className="hero-section">
          <h1 className="hero-title">{homeData?.title}</h1>
          <p className="hero-subtitle">{homeData?.description}</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
