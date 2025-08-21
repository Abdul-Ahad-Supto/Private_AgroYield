// frontend/src/App.js
import React, { useEffect } from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider, useWeb3 } from './contexts/Web3Context';
import { useContracts } from './hooks/useContracts';
import theme from './theme';

// Layout Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import UserRegistration from './components/UserRegistration';

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import CreateProject from './pages/CreateProject';
import Profile from './pages/Profile';
import Governance from './pages/Governance';
import NotFound from './pages/NotFound';

// Protected Route Component - Only needs Web3Context
const ProtectedRoute = ({ children, requireRegistration = false }) => {
  const { isConnected, isRegistered, checkingRegistration } = useWeb3();
  const [showRegistration, setShowRegistration] = React.useState(false);

  React.useEffect(() => {
    if (isConnected && requireRegistration && !isRegistered && !checkingRegistration) {
      setShowRegistration(true);
    }
  }, [isConnected, isRegistered, requireRegistration, checkingRegistration]);

  // If wallet not connected, redirect to home
  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  // If registration required but user not registered, show registration modal
  if (requireRegistration && !isRegistered) {
    return (
      <>
        {children}
        <UserRegistration
          isOpen={showRegistration}
          onClose={() => setShowRegistration(false)}
          onSuccess={() => {
            setShowRegistration(false);
            window.location.reload(); // Refresh to update registration status
          }}
        />
      </>
    );
  }

  return children;
};

// Main App Component
const AppContent = () => {
  const { isConnected, account, checkUserRegistration } = useWeb3();
  const { contracts } = useContracts();

  // Check user registration when wallet connects
  useEffect(() => {
    if (isConnected && account && contracts.projectFactory) {
      checkUserRegistration(account, contracts);
    }
  }, [isConnected, account, contracts.projectFactory, checkUserRegistration]);

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Navbar />
      <Box flex="1" py={0}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          
          {/* Protected Routes - Require Wallet Connection */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute requireRegistration={true}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/projects" 
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/projects/:id" 
            element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/create-project" 
            element={
              <ProtectedRoute requireRegistration={true}>
                <CreateProject />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute requireRegistration={true}>
                <Profile />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/governance" 
            element={
              <ProtectedRoute requireRegistration={true}>
                <Governance />
              </ProtectedRoute>
            } 
          />

          {/* Catch all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Box>
      <Footer />
    </Box>
  );
};

// Root App Component - Only Web3Provider needed!
function App() {
  return (
    <ChakraProvider theme={theme}>
      <Web3Provider>
        <AppContent />
      </Web3Provider>
    </ChakraProvider>
  );
}

export default App;