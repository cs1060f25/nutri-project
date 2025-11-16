import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard, getFilterOptions } from '../services/leaderboardService';
import './Leaderboard.css';

const Leaderboard = () => {
  const { accessToken } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    classYears: [],
    residences: [],
    dietaryPatterns: []
  });
  const [filters, setFilters] = useState({
    classYear: '',
    residence: '',
    dietaryPattern: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!accessToken) return;
      try {
        const options = await getFilterOptions();
        setFilterOptions({
          classYears: options.classYears || [],
          residences: options.residences || [],
          dietaryPatterns: options.dietaryPatterns || []
        });
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };
    fetchFilterOptions();
  }, [accessToken]);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!accessToken) return;
      setLoading(true);
      setError('');
      try {
        const data = await getLeaderboard(filters);
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError(err.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [accessToken, filters]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      classYear: '',
      residence: '',
      dietaryPattern: ''
    });
  };

  const hasActiveFilters = filters.classYear || filters.residence || filters.dietaryPattern;

  return (
    <div className="leaderboard-page">
      <header className="leaderboard-header">
        <h1>Leaderboard</h1>
        <p>See who has the most posts across the community</p>
      </header>

      {/* Filters */}
      <div className="leaderboard-filters">
        <div className="filter-group">
          <label htmlFor="classYear">Class Year</label>
          <select
            id="classYear"
            value={filters.classYear}
            onChange={(e) => handleFilterChange('classYear', e.target.value)}
          >
            <option value="">All Classes</option>
            {filterOptions.classYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="residence">Dining Hall</label>
          <select
            id="residence"
            value={filters.residence}
            onChange={(e) => handleFilterChange('residence', e.target.value)}
          >
            <option value="">All Dining Halls</option>
            {filterOptions.residences.map(residence => (
              <option key={residence} value={residence}>{residence}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="dietaryPattern">Eater Type</label>
          <select
            id="dietaryPattern"
            value={filters.dietaryPattern}
            onChange={(e) => handleFilterChange('dietaryPattern', e.target.value)}
          >
            <option value="">All Types</option>
            {filterOptions.dietaryPatterns.map(pattern => (
              <option key={pattern} value={pattern}>
                {pattern.charAt(0).toUpperCase() + pattern.slice(1).replace(/-/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Leaderboard Content */}
      {loading ? (
        <div className="leaderboard-loading">
          <p>Loading leaderboard...</p>
        </div>
      ) : error ? (
        <div className="leaderboard-error">
          <p>{error}</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="leaderboard-empty">
          <p>No users found matching the selected filters.</p>
        </div>
      ) : (
        <div className="leaderboard-table">
          <div className="leaderboard-header-row">
            <div className="rank-col">Rank</div>
            <div className="name-col">Name</div>
            <div className="posts-col">Total Posts</div>
            <div className="public-col">Public Posts</div>
            <div className="private-col">Private Posts</div>
          </div>
          {leaderboard.map((entry) => (
            <div key={entry.userId} className="leaderboard-row">
              <div className="rank-col">
                <span className={`rank-badge rank-${entry.rank}`}>
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                </span>
              </div>
              <div className="name-col">
                <div className="user-name">{entry.userName}</div>
                {entry.residence && (
                  <div className="user-meta">{entry.residence}</div>
                )}
                {entry.dietaryPattern && (
                  <div className="user-meta">
                    {entry.dietaryPattern.charAt(0).toUpperCase() + entry.dietaryPattern.slice(1).replace(/-/g, ' ')}
                  </div>
                )}
              </div>
              <div className="posts-col">{entry.postCount}</div>
              <div className="public-col">{entry.publicPostCount}</div>
              <div className="private-col">{entry.privatePostCount}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;

