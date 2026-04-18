import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { ShieldAlert, MapPin, Navigation } from 'lucide-react';

export default function LiveTrack() {
  const { userId } = useParams<{ userId: string }>();
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [userName, setUserName] = useState('Identity Redacted');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    // Listen to user's location
    const unsub = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLocation(data.location || null);
        setUserName(data.name || 'Emergency Target');
      }
      setLoading(false);
    });

    return () => unsub();
  }, [userId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-ink text-white flex items-center justify-center font-black animate-pulse">
        ESTABLISHING SECURE SATELLITE HANDSHAKE...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="bento-card bg-danger text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
              <h1 className="text-3xl font-black italic uppercase italic tracking-tighter">Live Pursuit Track</h1>
            </div>
            <p className="text-[10px] font-black uppercase opacity-60">Authorized Guardian Access Only | Session #772-B</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase opacity-60 italic">Target Identity</div>
            <div className="text-xl font-black">{userName}</div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bento-card p-0 min-h-[400px] relative bg-[#E5E5E5] overflow-hidden">
             {/* Mock Map */}
             <div className="absolute inset-0 opacity-20" style={{ 
                backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}></div>
              
              {location && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                   <div className="w-8 h-8 bg-danger rounded-full border-4 border-white shadow-[0_0_0_12px_rgba(239,68,68,0.2)] animate-ping absolute"></div>
                   <div className="w-8 h-8 bg-danger rounded-full border-4 border-white shadow-xl relative z-10 flex items-center justify-center">
                      <MapPin className="text-white w-4 h-4" />
                   </div>
                </div>
              )}

              <div className="absolute bottom-4 left-4 bg-white brutal-border px-4 py-2">
                 <div className="text-[8px] font-black uppercase opacity-60">GPS Coordinates</div>
                 <div className="font-mono font-black text-sm">
                   {location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'SIGNAL INTERRUPTED'}
                 </div>
              </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bento-card bg-ink text-white flex-grow">
               <h3 className="text-xs font-black uppercase mb-4 opacity-50 flex items-center gap-2">
                  <Navigation className="w-4 h-4" /> Tactical Data
               </h3>
               <div className="space-y-4">
                  <div className="border-b border-white border-opacity-10 pb-2">
                    <div className="text-[8px] font-black uppercase opacity-60">Signal Strength</div>
                    <div className="text-sm font-bold">98% (Encryption High)</div>
                  </div>
                  <div className="border-b border-white border-opacity-10 pb-2">
                    <div className="text-[8px] font-black uppercase opacity-60">Sector</div>
                    <div className="text-sm font-bold">Grid 14-X (Downtown Alpha)</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-black uppercase opacity-60">Report Status</div>
                    <div className="text-sm font-bold text-danger animate-pulse">ACTIVE SOS IN PROGRESS</div>
                  </div>
               </div>
            </div>

            <div className="bento-card bg-accent text-white py-4 text-center">
               <p className="text-[10px] font-black uppercase italic mb-2">Request Physical Response</p>
               <button className="w-full bg-white text-ink brutal-button py-2 text-xs font-black uppercase tracking-widest">
                  Signal 911
               </button>
            </div>
          </div>
        </div>

        <footer className="text-center opacity-30 text-[8px] font-black uppercase tracking-[0.2em] py-8">
           Project Catherine Tactical Division // Do Not Share This Endpoint
        </footer>
      </div>
    </div>
  );
}
