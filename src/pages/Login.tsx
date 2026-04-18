import { useEffect, useState } from 'react';
import { 
  signInWithPopup, 
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
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
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

        <button 
          onClick={handleLogin}
          className="w-full brutal-button bg-black text-white py-4 flex items-center justify-center gap-2"
        >
          <LogIn className="w-5 h-5" />
          Authenticate with Google
        </button>

        <p className="mt-6 text-[10px] uppercase font-bold opacity-40">
          Environment: Experimental Security Sandbox
        </p>
      </div>
    </div>
  );
}
