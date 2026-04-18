import React from 'react';
import { Shield, User, LayoutDashboard, LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onPageChange: (page: string) => void;
  currentPage: string;
}

export default function Layout({ children, user, onPageChange, currentPage }: LayoutProps) {
  const isAdmin = user?.email === 'itzzdarsh07@gmail.com';

  return (
    <div className="min-h-screen bg-bg flex flex-col p-4 md:p-8 gap-6 overflow-hidden">
      {/* Top Navbar / Bento Header */}
      <nav className="bento-card flex-row justify-between items-center py-4 px-6">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onPageChange('safety')}>
          <div className="w-10 h-10 bg-accent border-4 border-ink flex items-center justify-center rotate-3">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-black text-2xl uppercase tracking-tighter block leading-none">Catherine <span className="text-accent">v2.5</span></span>
            <span className="text-[10px] font-bold uppercase opacity-60">AI Crisis Network</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onPageChange('safety')}
            className={`p-3 brutal-button ${currentPage === 'safety' ? 'bg-safe' : 'bg-white'}`}
            title="Safety Screen"
          >
            <Shield className="w-6 h-6" />
          </button>
          <button 
            onClick={() => onPageChange('profile')}
            className={`p-3 brutal-button ${currentPage === 'profile' ? 'bg-accent' : 'bg-white'}`}
            title="Profile"
          >
            <User className="w-6 h-6" />
          </button>
          <button 
            onClick={() => onPageChange('admin')}
            className={`p-3 brutal-button ${currentPage === 'admin' ? 'bg-warning' : 'bg-white'}`}
            title="Admin Dashboard"
          >
            <LayoutDashboard className="w-6 h-6" />
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="p-3 brutal-button bg-danger"
            title="Logout"
          >
            <LogOut className="w-6 h-6 text-white" />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow overflow-auto">
        <div className="h-full">
          {children}
        </div>
      </main>

      {/* Status Rail */}
      <footer className="bento-card flex-row justify-between items-center py-2 px-4 bg-ink text-white">
        <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-4">
          <span>Official Dispatch Linked</span>
          <span className="opacity-40">|</span>
          <span>Latency: 42ms</span>
          <span className="opacity-40">|</span>
          <span className="text-safe">Verified: {user?.displayName}</span>
        </div>
        <div className="text-[10px] font-black uppercase opacity-60">
          NEAREST: PRECINCT 14
        </div>
      </footer>
    </div>
  );
}
