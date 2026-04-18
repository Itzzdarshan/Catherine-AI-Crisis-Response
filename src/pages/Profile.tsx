import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User, ShieldCheck, HeartPulse, Phone } from 'lucide-react';

export default function Profile({ user }: { user: any }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Local form state
  const [name, setName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [medicalInfo, setMedicalInfo] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        setName(data.name || '');
        setEmergencyContact(data.emergencyContact || '');
        setMedicalInfo(data.medicalInfo || '');
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name,
        emergencyContact,
        medicalInfo
      });
      alert('Profile updated securely!');
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center font-black animate-pulse">Syncing encrypted data...</div>;

  return (
    <div className="space-y-6 h-full">
      <div className="bento-card bg-accent text-white py-8">
        <h2 className="text-5xl font-black uppercase italic tracking-tighter">User Identity</h2>
        <p className="text-xs font-bold uppercase opacity-60">CAT-NODE SECURE ENCRYPTION ACTIVE</p>
      </div>

      <div className="bento-card bg-white">
        <form onSubmit={handleSave} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-50">
              <User className="w-4 h-4" /> Operator Name
            </label>
            <input 
              className="w-full brutal-border p-4 font-bold text-lg bg-bg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-50">
                <Phone className="w-4 h-4" /> Guardian Line
              </label>
              <input 
                className="w-full brutal-border p-4 font-bold bg-bg"
                placeholder="+1 XXX XXX XXXX"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 opacity-50">
                <HeartPulse className="w-4 h-4" /> Medical Payload
              </label>
              <input 
                className="w-full brutal-border p-4 font-bold bg-bg"
                placeholder="Blood Group / Allergies"
                value={medicalInfo}
                onChange={(e) => setMedicalInfo(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={saving}
            className="w-full brutal-button bg-ink text-white py-6 text-xl"
          >
            {saving ? 'Syncing Handshake...' : 'Update Secure Profile'}
          </button>
        </form>
      </div>

      <div className="bento-card bg-ink text-white p-6 border-accent">
        <h4 className="text-sm font-black uppercase flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-safe" /> Terminal Privacy Protocol
        </h4>
        <p className="text-xs font-bold opacity-40 leading-relaxed italic">
          Your biometric and contact data is retrieved only when an SOS trigger is confirmed. 
          Local precinct 14 maintains temporary access during active crisis events only.
        </p>
      </div>
    </div>
  );
}

