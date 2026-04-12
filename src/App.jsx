import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SignUp from './pages/SignUp'
import SignIn from './pages/SignIn'
import ProfileSetup from './pages/ProfileSetup'
import Landing from './pages/Landing'
import AuthLayout from './layouts/AuthLayout'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import LogMeal from './pages/LogMeal'
import MealHistory from './pages/MealHistory'
import Settings from './pages/Settings'
import AnalysisResult from './pages/AnalysisResult'

function AnimatedRoutes() {
  const location = useLocation()

  // Create a key that groups auth routes together so AuthLayout doesn't unmount
  const isAuthRoute = location.pathname.startsWith('/sign') || location.pathname === '/profile-setup';
  const routeGroup = isAuthRoute ? 'auth' : location.pathname;

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={routeGroup}>
        <Route path="/" element={<Landing />} />

        <Route element={<AuthLayout />}>
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
        </Route>
        <Route path="/profile-setup" element={
          <ProtectedRoute>
            <ProfileSetup />
          </ProtectedRoute>
        } />
        <Route element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/log-meal" element={<LogMeal />} />
          <Route path="/meal-history" element={<MealHistory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/analysis-result" element={<AnalysisResult />} />
        </Route>
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AnimatedRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App
