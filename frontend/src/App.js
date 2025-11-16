import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import NutritionPlan from './pages/NutritionPlan';
import Auth from './pages/Auth';
import ResetPassword from './pages/ResetPassword';
import FirebaseActionHandler from './pages/FirebaseActionHandler';
import Insights from './pages/Insights';
import Social from './pages/Social';
import MealPlanning from './pages/MealPlanning';
import Leaderboard from './pages/Leaderboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/__/auth/action" element={<FirebaseActionHandler />} />
              <Route
                path="/home/*"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
    </BrowserRouter>
  );
}

function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="app">
      <Sidebar 
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className={`main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nutrition-plan" element={<NutritionPlan />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/social/*" element={<Social />} />
          <Route path="/meal-planning" element={<MealPlanning />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
