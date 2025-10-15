import React, { useState, useEffect } from 'react';
import './Home.css';

const Home = () => {
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fake data for daily intake progress
  const [dailyProgress] = useState({
    calories: { current: 1450, goal: 2000, unit: 'kcal' },
    protein: { current: 95, goal: 150, unit: 'g' },
    waterIntake: { current: 5, goal: 8, unit: 'cups' },
    meals: { current: 2, goal: 3, unit: 'meals' },
    fruitsVegetables: { current: 3, goal: 5, unit: 'servings' },
    sugars: { current: 18, goal: 25, unit: 'g' }
  });

  const metricLabels = {
    calories: 'Calories',
    protein: 'Protein',
    waterIntake: 'Water Intake',
    meals: 'Meals',
    fruitsVegetables: 'Fruits & Vegetables',
    sugars: 'Sugars'
  };

  const calculatePercentage = (current, goal) => {
    return Math.min((current / goal) * 100, 100);
  };

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

        <div className="progress-widget">
          <div className="widget-header">
            <h2 className="widget-title">Today's Progress</h2>
            <p className="widget-subtitle">Track your daily intake towards your goals</p>
          </div>

          <div className="progress-list">
            {Object.entries(dailyProgress).map(([key, data]) => {
              const percentage = calculatePercentage(data.current, data.goal);
              const isOverGoal = data.current > data.goal;
              
              return (
                <div key={key} className="progress-item">
                  <div className="progress-header">
                    <span className="progress-label">{metricLabels[key]}</span>
                    <span className="progress-values">
                      <span className={`progress-current ${isOverGoal ? 'over-goal' : ''}`}>
                        {data.current}
                      </span>
                      <span className="progress-separator">/</span>
                      <span className="progress-goal">{data.goal} {data.unit}</span>
                    </span>
                  </div>
                  
                  <div className="progress-bar-container">
                    <div 
                      className={`progress-bar ${isOverGoal ? 'over-goal' : ''}`}
                      style={{ width: `${percentage}%` }}
                    >
                      <span className="progress-percentage">{Math.round(percentage)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="widget-footer">
            <p className="widget-note">Keep going! You're doing great today.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
