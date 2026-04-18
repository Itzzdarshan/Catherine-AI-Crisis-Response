import { useEffect, useState } from 'react';
import { 
  signInWithPopup, 
  signInWithRedirect,
  GoogleAuthProvider, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AlertCircle, Shield, LogIn } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      
      if (u) {
        // Sync user profile to Firestore if it doesn't exist
        const userDocRef = doc(db, 'users', u.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            uid: u.uid,
            name: u.displayName || 'New User',
            email: u.email,
            role: 'user', // Default role
            emergencyContact: '',
            medicalInfo: '',
            createdAt: serverTimestamp()
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Login failed:', err);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      if (err.code === 'auth/popup-blocked') {
        setError('Popup Blocked. Use the "Direct Link" button below or check Safari settings.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized. Please add "catherine-nu.vercel.app" to your Firebase Console settings.');
      } else if (isSafari && (err.code === 'auth/internal-error' || err.code === 'auth/network-request-failed')) {
        setError('Safari Tracking Protection is active. Use the "Direct Link" button below.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    }
  };

  const handleRedirectLogin = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      setError(err.message || 'Redirect failed. Try using Chrome.');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
      <div className="animate-pulse flex flex-col items-center">
        <Shield className="w-16 h-16 text-black mb-4" />
        <h2 className="text-xl font-black uppercase italic">Catherine is initializing...</h2>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f5f5f0]">
      <div className="max-w-md w-full p-8 brutal-card bg-white flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-black flex items-center justify-center rotate-3 mb-6">
          <Shield className="w-16 h-16 text-white" />
        </div>
        
        <h1 className="text-4xl font-black uppercase mb-2">Project Catherine</h1>
        <p className="text-sm font-bold opacity-60 uppercase mb-8 italic">Automated Crisis Response System</p>
        
        <div className="brutal-card bg-yellow-300 mb-8 transform -rotate-1">
          <p className="text-xs font-bold leading-relaxed text-left">
            "Catherine doesn't just call for help; she bridges the gap between a victim and the law."
          </p>
        </div>

        {error && (
          <div className="w-full space-y-4 mb-8">
            <div className="w-full bg-white border-4 border-danger p-4 flex items-start gap-3 text-left shadow-[4px_4px_0px_theme(colors.danger)]">
              <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-black uppercase text-danger leading-tight">
                  Security Handshake Rejected
                </p>
                <p className="text-[10px] font-bold text-ink opacity-90 leading-tight">
                  {error}
                </p>
              </div>
            </div>

            <div className="bg-black text-white p-4 text-left border-t-4 border-warning">
              <h4 className="text-[10px] font-black uppercase mb-2 flex items-center gap-2 text-warning">
                <Shield className="w-3 h-3 text-warning" />
                Tactical Troubleshooting
              </h4>
              <ul className="text-[9px] font-bold space-y-1.5 opacity-80 list-disc pl-4">
                <li>Ensure <span className="text-warning">catherine-nu.vercel.app</span> is added to 'Authorized Domains' in Firebase Console.</li>
                <li>Check if a popup blocker is preventing the handshake.</li>
                <li>Verify your <span className="text-warning">VITE_GEMINI_API_KEY</span> is set in Vercel.</li>
                <li>If using a VPN/Corporate Firewall, ensure <span className="text-warning">firebaseapp.com</span> is allowed.</li>
              </ul>
            </div>
          </div>
        )}

        <div className="w-full space-y-3">
          <button 
            onClick={handleLogin}
            className="w-full brutal-button bg-black text-white py-4 flex items-center justify-center gap-2 group"
          >
            <LogIn className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Authenticate with Google
          </button>

          <button 
            onClick={handleRedirectLogin}
            className="w-full brutal-button bg-white text-black py-4 flex items-center justify-center gap-2 text-xs font-black italic hover:bg-yellow-100"
          >
            Safari/Mobile? Use Direct Link
          </button>
        </div>

        <p className="mt-6 text-[10px] uppercase font-bold opacity-40">
          Environment: Experimental Security Sandbox
        </p>
      </div>
    </div>
  );
}
