import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ShieldAlert, CheckCircle, Navigation, Trash2, ShieldQuestion } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Resolved'>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAlerts(alertList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Resolved' : 'Active';
    await updateDoc(doc(db, 'alerts', id), { status: newStatus });
  };

  const deleteAlert = async (id: string) => {
    if (confirm('Permanently delete this incident report?')) {
      await deleteDoc(doc(db, 'alerts', id));
    }
  };

  if (loading) return <div className="text-center p-20 font-black animate-pulse uppercase">Syncing with Police Console...</div>;

  const alertTypes = ['All', ...new Set(alerts.map(a => a.type))];
  
  const filteredAlerts = alerts.filter(alert => {
    const statusMatch = statusFilter === 'All' || alert.status === statusFilter;
    const typeMatch = typeFilter === 'All' || alert.type === typeFilter;
    return statusMatch && typeMatch;
  });

  return (
    <div className="space-y-8 h-full">
      <div className="bento-card bg-ink text-white flex flex-row justify-between items-center py-10">
        <div>
          <h2 className="text-5xl font-black uppercase italic tracking-tighter">Police Console</h2>
          <p className="text-[10px] font-black uppercase opacity-40">Direct Dispatch Terminal Access | Level 4 Clearance</p>
        </div>
        <div className="text-right flex items-center gap-6">
          <div className="brutal-border bg-danger p-4 rotate-3">
             <p className="text-5xl font-black leading-none">{alerts.filter(a => a.status === 'Active').length}</p>
             <p className="text-[8px] font-black uppercase">Live Alerts</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[8px] font-black uppercase mb-1 opacity-50">Filter by Status</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full brutal-border bg-white p-2 font-black uppercase text-xs focus:ring-2 focus:ring-accent outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Resolved">Resolved Only</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[8px] font-black uppercase mb-1 opacity-50">Filter by Tactical Type</label>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full brutal-border bg-white p-2 font-black uppercase text-xs focus:ring-2 focus:ring-accent outline-none"
            >
              {alertTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="brutal-border bg-bg px-4 py-2 font-black text-xs uppercase opacity-40">
            {filteredAlerts.length} Matches Found
          </div>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="bento-card bg-white text-center py-32">
            <ShieldQuestion className="w-20 h-20 mx-auto mb-6 opacity-10" />
            <p className="font-black uppercase opacity-10 text-3xl tracking-tighter">No Matching Records</p>
          </div>
        ) : (
          <div className="overflow-hidden bento-card p-0 bg-white">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-bg border-b-8 border-ink">
                  <th className="p-6 text-left font-black uppercase text-[10px] tracking-widest">Status</th>
                  <th className="p-6 text-left font-black uppercase text-[10px] tracking-widest">User Profile</th>
                  <th className="p-6 text-left font-black uppercase text-[10px] tracking-widest">Tactical Type</th>
                  <th className="p-6 text-left font-black uppercase text-[10px] tracking-widest">GPS Coordinates</th>
                  <th className="p-6 text-left font-black uppercase text-[10px] tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredAlerts.map((alert) => (
                    <motion.tr 
                      key={alert.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`border-b-4 border-ink hover:bg-gray-50 transition-colors ${alert.status === 'Active' ? 'bg-danger bg-opacity-5' : 'opacity-40'}`}
                    >
                      <td className="p-6">
                        <span className={`px-4 py-1 text-[10px] font-black uppercase brutal-border ${
                          alert.status === 'Active' ? 'bg-danger text-white' : 'bg-safe'
                        }`}>
                          {alert.status}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="font-black uppercase text-sm mb-1">{alert.userName}</div>
                        <div className="text-[8px] font-mono opacity-50 uppercase">UUID: {alert.userId.substring(0,8)}</div>
                      </td>
                      <td className="p-6 font-bold text-xs">
                        <div className="bg-warning inline-block px-1 mb-1 tracking-tighter">{alert.type}</div>
                        {alert.description && <p className="text-[9px] opacity-60 leading-tight line-clamp-2">{alert.description}</p>}
                      </td>
                      <td className="p-6">
                        <a 
                          href={`https://maps.google.com/?q=${alert.location.lat},${alert.location.lng}`} 
                          target="_blank" 
                          className="flex items-center gap-2 text-[10px] font-black hover:text-accent"
                        >
                          <Navigation className="w-4 h-4" /> 
                          <span className="font-mono">{alert.location.lat.toFixed(4)}°, {alert.location.lng.toFixed(4)}°</span>
                        </a>
                      </td>
                      <td className="p-6">
                        <div className="flex gap-3">
                          <button 
                            onClick={() => toggleStatus(alert.id, alert.status)}
                            className={`p-3 brutal-button ${alert.status === 'Active' ? 'bg-safe' : 'bg-bg'}`}
                            title="Toggle Resolution"
                          >
                            <CheckCircle className="w-5 h-5 text-white" />
                          </button>
                          <button 
                            onClick={() => deleteAlert(alert.id)}
                            className="p-3 brutal-button bg-ink text-white"
                            title="Purge Record"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

