import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import ThemeToggle from './components/ThemeToggle';
import Home from './pages/Home';
import NutritionPlan from './pages/NutritionPlan';
import Auth from './pages/Auth';
import ResetPassword from './pages/ResetPassword';
import FirebaseActionHandler from './pages/FirebaseActionHandler';
import Insights from './pages/Insights';
import Scanner from './pages/Scanner';
import Settings from './pages/Settings';
import Social from './pages/Social';
import MealPlanning from './pages/MealPlanning';
import MealLogs from './pages/MealLogs';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationBell from './components/NotificationBell';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
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
      </ThemeProvider>
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
        <div className="top-bar">
          <NotificationBell />
        </div>
        <ThemeToggle />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nutrition-plan" element={<NutritionPlan />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/meal-logs" element={<MealLogs />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/meal-planning" element={<MealPlanning />} />
          <Route path="/social/*" element={<Social />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
