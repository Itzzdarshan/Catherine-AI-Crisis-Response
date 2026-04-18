import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import Login from './pages/Login';
import SafetyScreen from './pages/SafetyScreen';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import LiveTrack from './pages/LiveTrack';
import Layout from './components/Layout';
import { Shield } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('safety');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <div className="flex flex-col items-center">
          <Shield className="w-16 h-16 text-black animate-pulse" />
          <p className="mt-4 font-black uppercase text-xs tracking-widest italic">Authenticating Secure Handshake...</p>
        </div>
      </div>
    );
  }

  const renderAuthenticatedApp = () => {
    if (!user) return <Login />;

    const renderPage = () => {
      switch (currentPage) {
        case 'safety':
          return <SafetyScreen user={user} />;
        case 'profile':
          return <Profile user={user} />;
        case 'admin':
          return <AdminDashboard />;
        default:
          return <SafetyScreen user={user} />;
      }
    };

    return (
      <Layout 
        user={user} 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
      >
        {renderPage()}
      </Layout>
    );
  };

  try {
    return (
      <BrowserRouter>
        <Routes>
          {/* Public Tracking Route */}
          <Route path="/track/:userId" element={<LiveTrack />} />
          
          {/* Main App */}
          <Route path="/*" element={renderAuthenticatedApp()} />
        </Routes>
      </BrowserRouter>
    );
  } catch (error) {
    console.error("Critical Application Crash:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-danger p-10">
        <div className="bento-card bg-white max-w-lg">
          <h1 className="text-3xl font-black uppercase italic mb-4">Tactical System Error</h1>
          <p className="font-bold opacity-70 mb-6">A critical initialization sequence failed. This is usually caused by missing environment variables or corrupted configuration.</p>
          <div className="bg-ink bg-opacity-5 p-4 font-mono text-xs overflow-auto max-h-40">
            {error instanceof Error ? error.message : String(error)}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 brutal-button bg-accent text-white py-3 px-8 uppercase"
          >
            Re-Establish Link
          </button>
        </div>
      </div>
    );
  }
}

