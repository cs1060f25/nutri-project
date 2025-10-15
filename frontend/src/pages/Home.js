import React from 'react';
import './Home.css';
import { useQuery, gql } from '@apollo/client';

// GraphQL Query
const GET_HOME_DATA = gql`
  query GetHomeData {
    home {
      title
      welcomeMessage
      description
      features
    }
  }
`;

const Home = () => {
  const { loading, error, data } = useQuery(GET_HOME_DATA);

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

  const homeData = data?.home;

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

